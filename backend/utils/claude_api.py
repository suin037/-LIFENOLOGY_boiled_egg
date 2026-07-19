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


def generate_narrative(
    req: PredictRequest,
    expected_wage: float,
    causal_effect: float,
    survival_months: float,
) -> str:
    """모델 출력값을 바탕으로 '평행우주의 나' 이야기 생성."""
    if not settings.anthropic_api_key:
        return "(ANTHROPIC_API_KEY 미설정 — 내러티브 생략)"

    prompt = (
        f"한 사용자가 '{req.choice}'라는 진로를 택한 평행우주를 상상합니다.\n"
        f"- 전공: {req.major}, 나이: {req.age}\n"
        f"- 예상 월급: {expected_wage:,.0f}원\n"
        f"- 그 선택의 인과효과: {causal_effect:,.0f}\n"
        f"- 예상 재직기간: {survival_months:.1f}개월\n\n"
        "이 데이터를 따뜻하면서도 현실적인 2~3문장으로 풀어 설명해줘."
    )

    resp = _get_client().messages.create(
        model=settings.claude_model,
        max_tokens=512,
        messages=[{"role": "user", "content": prompt}],
    )
    return resp.content[0].text
