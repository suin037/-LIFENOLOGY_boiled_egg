"""3지표 산출기 (엔진 L1~L5 출력 → 경제적안정도·성장가능성·삶의질, 0~1).

민주 클로드가 지적한 '담당자 없던 컴포넌트'를 정식 백엔드 단계로 승격.
- 입력: /compare 의 ScenarioView(dict) — 소득 궤적·만족도·후회·성장% 등.
- 출력: {"경제적안정도":0~1, "성장가능성":0~1, "삶의질":0~1} (무언더스코어 = 계약 정본).
- 이 점수를 rag/psych_narrative.get_psych_evidence() 에 그대로 넘겨 심리카드를 검색한다.
- '지표 산출'은 KNN(레이어2)과 별개 단계다. (용어 충돌 방지: L2=유사인물 매칭, 지표=여기)

수치는 엔진 실측에서 파생한 인덱스이며(정규화), 원자료는 /compare 가 그대로 노출한다.
"""

from __future__ import annotations

# 계약 정본 키(언더스코어 없음). 언더스코어 별칭은 psych 계층이 정규화한다.
INDICATOR_KEYS = ["경제적안정도", "성장가능성", "삶의질"]


def _clamp01(x: float) -> float:
    return max(0.0, min(1.0, x))


def _avail(arr):
    return [p for p in (arr or []) if p.get("available")]


def _last(arr):
    a = _avail(arr)
    return a[-1] if a else None


def compute_indicators(scen: dict, baseline: float | None = None) -> dict:
    """ScenarioView(dict) → 3지표(0~1)."""
    inc = _avail(scen.get("income"))
    first = inc[0]["value"] if inc else None
    last = inc[-1]["value"] if inc else None
    base = baseline or first or 300.0
    change = ((last - first) / first) if (first and last) else 0.0  # 소득 증가율

    gp = _last(scen.get("growth_potential"))
    growth5 = (gp or {}).get("value", 0.0) or 0.0  # 성장 잠재 %(5년 등)

    satis = (scen.get("satisfaction_summary") or {}).get("latest") or 3.5  # 1~5
    regret = (scen.get("regret_summary") or {}).get("worst_value") or 0.0  # % (이탈/폐업)

    # 경제적안정도: 소득 수준 + 증가율 + (낮은 후회리스크로 안정성 보정)
    income_level = (last or base)
    econ = 0.35 + (income_level - 250) / 300 * 0.40 + max(change, 0) * 0.8 - regret / 100 * 0.15
    # 성장가능성: 성장 잠재% 중심(+소득 증가율 보조)
    grow = 0.25 + growth5 / 40 * 0.9 + max(change, 0) * 0.4
    # 삶의질: 만족도(1~5)를 0~1로 + 후회리스크 감점
    life = satis / 5.0 - regret / 100 * 0.20

    return {
        "경제적안정도": round(_clamp01(econ), 3),
        "성장가능성": round(_clamp01(grow), 3),
        "삶의질": round(_clamp01(life), 3),
    }
