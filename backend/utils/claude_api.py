"""Claude API: 수치 결과를 사람이 읽을 내러티브로 변환."""

from anthropic import Anthropic

from config import settings
from schemas import PredictRequest

_client: Anthropic | None = None


def _get_client() -> Anthropic:
    global _client
    if _client is None:
        _client = Anthropic(api_key=settings.anthropic_api_key)
    return _client


def build_prompt(
    req: PredictRequest,
    expected_wage: float,
    causal_effect: float,
    survival_months: float,
    psych_block: str = "",
    safety_mode: str = "normal",
) -> str:
    """서사 생성용 프롬프트 문자열 구성(순수함수, API 호출 없음 — 단위테스트 대상).

    safety_mode='high_distress'면 톤을 낮추고 행동 제안을 강요하지 않도록 지시한다.
    (급성 'crisis'는 이 함수에 오지 않는다 — 상위에서 서사 생성을 건너뛴다.)
    """
    prompt = (
        f"한 사용자가 '{req.choice}'라는 진로를 택한 평행우주를 상상합니다.\n"
        f"- 전공: {req.major}, 나이: {req.age}\n"
        f"- 예상 월급: {expected_wage:,.0f}원\n"
        f"- 그 선택의 인과효과: {causal_effect:,.0f}\n"
        f"- 예상 재직기간: {survival_months:.1f}개월\n\n"
    )
    if psych_block:
        prompt += psych_block + "\n\n"
        if safety_mode == "high_distress":
            prompt += (
                "지금 사용자는 정서적으로 많이 지쳐 있는 상태입니다. 따라서:\n"
                "1) 무엇보다 먼저 그 감정이 충분히 그럴 만하다고 따뜻하게 인정하고,\n"
                "2) '오늘 뭘 하라'는 행동 제안을 강요하지 말 것. 굳이 넣는다면 아주 작고 선택적인 것으로, 부담스럽지 않게만,\n"
                "3) 근거 이론의 출처는 짧게 인용하되, 설득·재촉하는 톤은 피하고 곁에 있어주는 톤으로,\n"
                "4) 혼자 감당하기 버거우면 주변이나 전문 상담에 기대도 괜찮다는 점을 부드럽게 덧붙여줘.\n"
                "3~4문장으로."
            )
        else:
            prompt += (
                "위 수치와 심리학 근거를 통합해, 따뜻하면서도 현실적인 서사를 쓰되:\n"
                "1) 사용자의 심리 상태를 근거 카드로 해석하고,\n"
                "2) 행동 제안 후보 중 하나를 '오늘 할 수 있는 한 걸음'으로 자연스럽게 제안하고,\n"
                "3) 근거로 삼은 이론의 출처를 문장 안에 짧게 인용해줘(예: '…라는 연구가 있어요(Roese, 1997)').\n"
                "4~5문장으로."
            )
    else:
        prompt += "이 데이터를 따뜻하면서도 현실적인 2~3문장으로 풀어 설명해줘."
    return prompt


def _mock_narrative(prompt: str, psych_block: str, safety_mode: str) -> str:
    """mock_llm 모드용 결정적 가짜 서사. 실제 호출 없이 흐름을 검증하게 한다.

    psych_block 유무·safety_mode를 반영해, 주입/분기가 됐는지 육안·테스트로 확인 가능.
    """
    tag = "심리근거 주입됨" if psych_block else "심리근거 없음"
    smode = f" · safety={safety_mode}" if safety_mode != "normal" else ""
    return f"[MOCK 서사 · {tag}{smode}] (프롬프트 {len(prompt)}자) — 실제 Claude 호출 없이 생성된 자리표시 응답입니다."


def generate_narrative(
    req: PredictRequest,
    expected_wage: float,
    causal_effect: float,
    survival_months: float,
    psych_block: str = "",
    safety_mode: str = "normal",
) -> str:
    """모델 출력값을 바탕으로 '평행우주의 나' 이야기 생성.

    psych_block: 재료 제공형 심리 RAG가 만든 '심리학 근거 카드' 텍스트(선택).
        주어지면 서사에 심리 해석 + 행동 제안 1개를 녹이고 출처를 인용한다.
    safety_mode: 'high_distress'면 톤을 낮추고 행동 제안을 강요하지 않는다.
        (급성 'crisis'는 여기 오지 않는다 — 상위에서 서사 대신 자원 메시지로 분기.)
    """
    prompt = build_prompt(req, expected_wage, causal_effect, survival_months,
                          psych_block, safety_mode)

    if settings.mock_llm:
        return _mock_narrative(prompt, psych_block, safety_mode)
    if not settings.anthropic_api_key:
        return "(ANTHROPIC_API_KEY 미설정 — 내러티브 생략)"

    resp = _get_client().messages.create(
        model=settings.claude_model,
        max_tokens=512,
        messages=[{"role": "user", "content": prompt}],
    )
    return resp.content[0].text
