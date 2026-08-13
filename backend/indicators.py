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


def evidence_statuses(kind: str, validated_prediction: dict | None = None,
                      provided_scores: dict | None = None) -> dict:
    """3지표 숫자와 근거 수준을 분리한 계약.

    legacy 0~1 점수는 화면 호환용일 뿐 검증된 예측으로 승격하지 않는다.
    명시적으로 제공된 점수만 사용자 상태 신호로 심리 RAG에 사용할 수 있다.
    """
    if provided_scores:
        return {
            key: {
                "status": "user_provided_state",
                "score": provided_scores.get(key),
                "eligible_for_psych_rag": provided_scores.get(key) is not None,
                "reason": "사용자가 제공한 현재 상태 점수이며 미래 예측값이 아님",
            }
            for key in INDICATOR_KEYS
        }

    if kind == "이직":
        vp = validated_prediction or {}
        observed_domains = ((vp.get("observed_outcomes") or {}).get("domains") or {})
        has_growth = any(item.get("available") for item in observed_domains.get("growth", []))
        has_life = any(item.get("available") for item in observed_domains.get("quality_of_life", []))
        pop = vp.get("population_evidence") or {}
        effect = pop.get("effect")
        financial_status = "directional_evidence" if effect is not None else "insufficient_evidence"
        return {
            "경제적안정도": {
                "status": financial_status,
                "score": None,
                "direction": "positive" if effect is not None and effect > 0 else "uncertain",
                "effect": effect,
                "unit": pop.get("unit"),
                "ci95": pop.get("ci95"),
                "eligible_for_psych_rag": False,
                "reason": "집단 임금효과의 방향 근거이며 개인의 현재 심리 상태 점수가 아님",
            },
            "성장가능성": {
                "status": "matched_observation" if has_growth else "insufficient_evidence", "score": None,
                "eligible_for_psych_rag": False,
                "reason": "유사 집단의 실제 경력상태 전환 관측값" if has_growth else "최근 연도 검증에서 성장 효과가 재현되지 않음",
            },
            "삶의질": {
                "status": "matched_observation" if has_life else "insufficient_evidence", "score": None,
                "eligible_for_psych_rag": False,
                "reason": "유사 집단의 만족·행복·건강·웰빙 변화 관측값" if has_life else "반복 검증에서 삶의 질 효과가 안정적이지 않음",
            },
        }

    vp = validated_prediction or {}
    observed = vp.get("observed_outcomes") or {}
    if kind == "유지" and observed.get("status") == "available":
        return {
            "경제적안정도": {"status": "matched_observation", "score": None, "eligible_for_psych_rag": False, "reason": "유사 유지 집단의 관측 결과"},
            "성장가능성": {"status": "matched_observation", "score": None, "eligible_for_psych_rag": False, "reason": "유지 집단의 실제 경력상태 전환 관측값"},
            "삶의질": {"status": "matched_observation", "score": None, "eligible_for_psych_rag": False, "reason": "유지 집단의 만족·행복·건강·웰빙 변화 관측값"},
        }

    reason = "해당 선택의 검증된 개인 예측모델이 없어 집단통계·관측값만 제공"
    return {
        key: {"status": "reference_only", "score": None,
              "eligible_for_psych_rag": False, "reason": reason}
        for key in INDICATOR_KEYS
    }


def psych_eligible_scores(statuses: dict) -> dict:
    """미래 예측값을 심리 상태처럼 사용하는 것을 차단한다."""
    return {
        key: item["score"] for key, item in (statuses or {}).items()
        if item.get("eligible_for_psych_rag") and item.get("score") is not None
    }


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
