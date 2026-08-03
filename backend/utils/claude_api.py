"""Claude API: 엔진 수치 + RAG 근거 → 사람이 읽을 '평행우주' 서사로 변환.

경계 원칙: 숫자는 엔진(L1~L5)이 만들고, RAG가 통계/이론 근거를 붙이며,
Claude 는 '지어내지 않고' 그 수치·근거를 이야기로 풀어 설명하는 역할만 한다.
"""

from __future__ import annotations

import json

from anthropic import Anthropic

from config import settings
from schemas import PredictRequest

_client: Anthropic | None = None


def _get_client() -> Anthropic:
    global _client
    if _client is None:
        _client = Anthropic(api_key=settings.anthropic_api_key)
    return _client


# ────────────────────────────────────────────────────────────────
# 수치 요약: CompareResponse 의 한 ScenarioView(dict) → 프롬프트용 압축 텍스트
# ────────────────────────────────────────────────────────────────
def summarize_scenario(sv: dict) -> str:
    lines: list[str] = []
    lines.append(f"선택: {sv.get('choice','?')} — {sv.get('coverage','')}")

    ss = sv.get("satisfaction_summary") or {}
    if ss:
        lines.append(
            f"만족도(1~5): {ss.get('start')}→{ss.get('latest')} ({ss.get('direction','')}, "
            f"{ss.get('span_years','?')}년, n={ss.get('sample_n','?')})"
        )

    inc = [p for p in (sv.get("income") or []) if p.get("available")]
    if inc:
        parts = [f"{p['year']}년 {p.get('value')}만원({p.get('p25')}~{p.get('p75')})" for p in inc]
        lines.append("소득 궤적: " + " · ".join(parts))

    rs = sv.get("regret_summary") or {}
    if rs:
        lines.append(
            f"후회리스크: {rs.get('worst_year','?')}년 {rs.get('label','')} "
            f"{rs.get('worst_value','?')}{rs.get('unit','')}"
        )

    cc = [c for c in (sv.get("choice_context") or []) if isinstance(c, dict)]
    if cc:
        ctx = "; ".join(f"{c.get('label','')} {c.get('value','')}{c.get('unit','')}" for c in cc[:4])
        if ctx.strip():
            lines.append("선택맥락: " + ctx)

    conf = sv.get("confidence") or {}
    ci = conf.get("survival_c_index") or {}
    ce = conf.get("causal_effect") or {}
    if ci:
        lines.append(f"신뢰(생존모델 C-index): {ci.get('c_index_test')}")
    if ce:
        lines.append(f"신뢰(인과효과): {json.dumps(ce, ensure_ascii=False)[:160]}")
    return "\n".join(lines)


def _fmt_evidence(evidence: list[dict]) -> str:
    if not evidence:
        return "(근거 없음)"
    out = []
    for e in evidence:
        out.append(
            f"- ({e.get('indicator','')}) {e.get('text','')[:220]}  [출처: {e.get('source','')[:60]}]"
        )
    return "\n".join(out)


def _extract_json(text: str) -> dict | None:
    t = text.strip()
    if t.startswith("```"):
        t = t.strip("`")
        if t[:4].lower() == "json":
            t = t[4:]
    a, b = t.find("{"), t.rfind("}")
    if a != -1 and b != -1 and b > a:
        try:
            return json.loads(t[a : b + 1])
        except Exception:
            return None
    return None


# ────────────────────────────────────────────────────────────────
# A/B 시나리오 서사 (1회 호출로 A·B·비교 모두 생성)
# ────────────────────────────────────────────────────────────────
def generate_scenarios(
    profile: dict,
    scen_a: dict,
    scen_b: dict,
    evidence_a: list[dict],
    evidence_b: list[dict],
    note: str = "",
    model: str | None = None,
) -> dict:
    """엔진 수치 + RAG 근거 → 요약·상세 구조의 A/B 서사. 키 없으면 skip."""
    if not settings.anthropic_api_key:
        return {
            "a": "(ANTHROPIC_API_KEY 미설정 — 서사 생략)",
            "b": "(ANTHROPIC_API_KEY 미설정 — 서사 생략)",
            "comparison": "(ANTHROPIC_API_KEY 미설정 — 서사 생략)",
            "_skipped": True,
        }

    used_model = model or settings.claude_model
    prof = ", ".join(f"{k}={v}" for k, v in profile.items() if v is not None)

    prompt = f"""너는 '평행우주 인생 시뮬레이터'의 서사 작가다. 아래는 실제 한국 패널 데이터로 계산한 두 진로 선택의 수치와, RAG로 검색한 통계·심리 근거다.

**규칙(엄수):**
- 숫자를 새로 지어내지 마라. 아래 제공된 수치·근거 안에서만 말하라.
- "너와 비슷한 사람들이 그 길을 갔을 때"의 관점으로 서술하라(단정 예측 금지).
- 따뜻하되 현실적으로 작성하고 단정적인 미래 예측 대신 가능성을 표현하라.
- a와 b는 각각 title, summary, detail, gain, cost, uncertainty를 포함한다.
- title은 20자 이내, summary는 핵심 trade-off 한 문장(90자 이내)으로 압축한다.
- detail은 present, transition, future로 구성하며 각각 한 문장(100자 이내)이고 summary를 반복하지 않는다.
- gain과 cost는 각각 45자 이내로 작성한다.
- uncertainty에는 데이터 한계나 달라질 조건을 한 문장(80자 이내)으로 쓴다.
- comparison은 summary와 question을 포함한다. A/B를 억지로 정답/오답 또는 긍정/부정으로 나누지 않는다.
- 모든 서사 필드는 한국어로 작성하고, 아래에서 요구하는 이미지 장면 필드까지 포함해 JSON으로만 출력한다.

[사용자 프로필] {prof}
[주의사항] {note or '(없음)'}

===== 선택지 A =====
{summarize_scenario(scen_a)}
[A 근거]
{_fmt_evidence(evidence_a)}

===== 선택지 B =====
{summarize_scenario(scen_b)}
[B 근거]
{_fmt_evidence(evidence_b)}

JSON만 출력하라."""

    prompt += """

IMAGE SCENE DIRECTIONS (required):
- In addition to the Korean structured story fields a, b, and comparison, return visual_a and
  visual_b as JSON objects written in concise English.
- Each visual object must contain: core_moment, setting, character_action, body_pose,
  facial_emotion, wardrobe, foreground, background, lighting, camera, color_palette.
- Keep every visual field concise (at most 20 English words per field).
- Make A and B compositionally distinct. Choose story-specific locations, actions,
  poses, props, camera angles, lighting, and palettes. Never default both scenes to
  a person sitting at a laptop.
- Visual directions may dramatize the supplied story but must not invent factual
  outcomes. Show exactly one person total: no coworkers, crowds, silhouettes,
  reflections, portraits, or background figures. Express social context through
  the environment and objects instead. Include no readable text.
- Final output must be one JSON object with this shape:
  {"a":{"title":"...","summary":"...","detail":{"present":"...","transition":"...","future":"..."},"gain":"...","cost":"...","uncertainty":"..."},"b":{"title":"...","summary":"...","detail":{"present":"...","transition":"...","future":"..."},"gain":"...","cost":"...","uncertainty":"..."},"comparison":{"summary":"...","question":"..."},"visual_a":{...},"visual_b":{...}}
"""

    resp = _get_client().messages.create(
        model=used_model,
        max_tokens=3000,
        messages=[{"role": "user", "content": prompt}],
    )
    raw = resp.content[0].text
    parsed = _extract_json(raw) or {}
    usage = getattr(resp, "usage", None)
    return {
        "a": parsed.get("a", raw[:600]),
        "b": parsed.get("b", ""),
        "comparison": parsed.get("comparison", ""),
        "visual_a": parsed.get("visual_a", {}),
        "visual_b": parsed.get("visual_b", {}),
        "_model": used_model,
        "_usage": {
            "input_tokens": getattr(usage, "input_tokens", None),
            "output_tokens": getattr(usage, "output_tokens", None),
        }
        if usage
        else None,
    }


# ── 하위호환: 단일 선택 내러티브(기존 시그니처 유지) ──
def generate_narrative(
    req: PredictRequest,
    expected_wage: float,
    causal_effect: float,
    survival_months: float,
) -> str:
    if not settings.anthropic_api_key:
        return "(ANTHROPIC_API_KEY 미설정 — 내러티브 생략)"
    prompt = (
        f"한 사용자가 '{req.choice}'라는 진로를 택한 평행우주를 상상합니다.\n"
        f"- 전공: {req.major}, 나이: {req.age}\n"
        f"- 예상 월급: {expected_wage:,.0f}만원\n"
        f"- 그 선택의 인과효과: {causal_effect:,.0f}\n"
        f"- 예상 재직기간: {survival_months:.1f}개월\n\n"
        "이 데이터를 따뜻하면서도 현실적인 2~3문장으로, 숫자를 지어내지 말고 풀어 설명해줘."
    )
    resp = _get_client().messages.create(
        model=settings.claude_model,
        max_tokens=512,
        messages=[{"role": "user", "content": prompt}],
    )
    return resp.content[0].text
