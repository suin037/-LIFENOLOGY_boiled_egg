"""KOWEPS 최초 사건 패널의 관측 근거 조회 서비스.

개인 예측이나 인과효과를 만들지 않고, 전처리에서 생성·감사된 집단 기술통계만 반환한다.
"""
from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

from config import ROOT


REPORT = ROOT / "backend" / "models" / "artifacts" / "koweps_scenario_evidence.json"
REGISTRY = ROOT / "preprocess" / "koweps_domain_registry.json"

# 선택 사건(삶의 영역) → 공통 3지표 → 실제 KOWEPS 결과변수.
# strength는 수치를 새로 만드는 가중치가 아니라 근거의 직접성을 나타낸다.
# direct: 지표를 직접 구성하는 결과, proxy: 일부 측면만 관측, unavailable: 미측정.
_COMMON = {
    "경제적안정도": ["disposable_income", "housing_tenure"],
    "삶의질": ["health_satisfaction", "family_satisfaction", "social_satisfaction",
              "housing_satisfaction", "leisure_satisfaction", "overall_satisfaction",
              "depressive_feeling"],
}

SCENARIO_INDICATOR_MAP = {
    "career.occupation_change": {
        "경제적안정도": ("direct", _COMMON["경제적안정도"]),
        "성장가능성": ("direct", ["job_satisfaction"]),
        "삶의질": ("direct", _COMMON["삶의질"]),
    },
    "education.level_increase": {
        "경제적안정도": ("direct", _COMMON["경제적안정도"]),
        "성장가능성": ("direct", ["job_satisfaction"]),
        "삶의질": ("direct", _COMMON["삶의질"]),
    },
    "business.self_employment_start": {
        "경제적안정도": ("direct", _COMMON["경제적안정도"]),
        "성장가능성": ("proxy", ["job_satisfaction"]),
        "삶의질": ("direct", ["job_satisfaction", "health_satisfaction",
                             "family_satisfaction", "social_satisfaction",
                             "leisure_satisfaction", "overall_satisfaction",
                             "depressive_feeling"]),
    },
    "housing.move": {
        "경제적안정도": ("direct", _COMMON["경제적안정도"]),
        "성장가능성": ("unavailable", []),
        "삶의질": ("direct", ["housing_satisfaction", "health_satisfaction",
                             "overall_satisfaction", "depressive_feeling"]),
    },
    "housing.homeownership_start": {
        "경제적안정도": ("direct", _COMMON["경제적안정도"]),
        "성장가능성": ("unavailable", []),
        "삶의질": ("direct", ["housing_satisfaction", "health_satisfaction",
                             "overall_satisfaction", "depressive_feeling"]),
    },
    "relationship.marriage_start": {
        "경제적안정도": ("direct", _COMMON["경제적안정도"]),
        "성장가능성": ("proxy", ["job_satisfaction"]),
        "삶의질": ("direct", ["family_satisfaction", "social_satisfaction",
                             "health_satisfaction", "overall_satisfaction",
                             "depressive_feeling"]),
    },
    "relationship.household_increase": {
        "경제적안정도": ("direct", _COMMON["경제적안정도"]),
        "성장가능성": ("proxy", ["job_satisfaction"]),
        "삶의질": ("direct", _COMMON["삶의질"]),
    },
    "relationship.household_decrease": {
        "경제적안정도": ("direct", _COMMON["경제적안정도"]),
        "성장가능성": ("proxy", ["job_satisfaction"]),
        "삶의질": ("direct", _COMMON["삶의질"]),
    },
}


@lru_cache(maxsize=1)
def _data() -> tuple[dict, dict]:
    return (
        json.loads(REPORT.read_text(encoding="utf-8")),
        json.loads(REGISTRY.read_text(encoding="utf-8")),
    )


def _scenario(text: str, domains: list[str] | None = None) -> str | None:
    value = (text or "").replace(" ", "")
    domain_set = set(domains or [])
    if any(word in value for word in ("자가", "내집", "주택구입", "집구입")):
        return "housing.homeownership_start"
    if any(word in value for word in ("이사", "이주", "거주지변경", "독립")):
        return "housing.move"
    if any(word in value for word in ("결혼", "혼인")):
        return "relationship.marriage_start"
    if any(word in value for word in ("가구원증가", "합가", "출산")):
        return "relationship.household_increase"
    if any(word in value for word in ("가구원감소", "분가")):
        return "relationship.household_decrease"
    if any(word in value for word in ("진학", "학위", "대학원", "교육수준")):
        return "education.level_increase"
    if any(word in value for word in ("창업", "자영", "개업", "사업시작", "가게차리")):
        return "business.self_employment_start"
    if any(word in value for word in ("이직", "전직", "직종변경", "진로변경")):
        return "career.occupation_change"
    # 영역만 있고 구체 사건이 없으면 잘못된 수치를 붙이지 않는다.
    return None


def evidence_for_request(payload: dict) -> dict:
    try:
        report, registry = _data()
    except (OSError, ValueError) as exc:
        return {"available": False, "reason": f"KOWEPS 산출물 로드 실패: {type(exc).__name__}"}

    text = " ".join(str(payload.get(key) or "") for key in (
        "choice_a", "choice_b", "choice_a_detail", "choice_b_detail"
    ))
    domains = [*(payload.get("choice_a_domains") or []), *(payload.get("choice_b_domains") or [])]
    key = _scenario(text, domains)
    if not key:
        return {
            "available": False,
            "reason": "KOWEPS에서 검증된 구체 사건(이사·자가전환·결혼·가구변화·교육수준상승·직종변경·자영업전환)과 연결되지 않음",
            "domains": domains,
        }
    item = report.get("reports", {}).get(key)
    spec = registry.get("scenarios", {}).get(key, {})
    if not item:
        return {"available": False, "scenario": key, "reason": "해당 사건 패널이 아직 생성되지 않음"}

    outcomes = []
    for outcome, meta in registry["outcomes"].items():
        trajectory = []
        for horizon in registry["horizons"]:
            cell = item["followup"][str(horizon)][outcome]
            trajectory.append({
                "wave": horizon,
                "event": cell.get("1", {}),
                "comparison": cell.get("0", {}),
            })
        outcomes.append({"key": outcome, **meta, "trajectory": trajectory})

    outcome_by_key = {outcome["key"]: outcome for outcome in outcomes}
    indicator_mapping = {}
    for indicator, (strength, keys) in SCENARIO_INDICATOR_MAP.get(key, {}).items():
        selected = [outcome_by_key[name] for name in keys if name in outcome_by_key]
        indicator_mapping[indicator] = {
            "strength": strength if selected else "unavailable",
            "outcome_keys": [item["key"] for item in selected],
            "outcomes": selected,
        }

    # 어느 선택지가 '사건 발생군'인지 함께 내려준다. 예: 미혼 유지(A) vs
    # 결혼(B)이면 B=event, A=comparison. 이 정보가 없으면 프론트가 두 선을
    # 사용자의 A/B 선택에 정확히 대응시킬 수 없다.
    side_scenarios = {
        "A": _scenario(" ".join(str(payload.get(k) or "") for k in
                                  ("choice_a", "choice_a_detail")),
                       payload.get("choice_a_domains") or []),
        "B": _scenario(" ".join(str(payload.get(k) or "") for k in
                                  ("choice_b", "choice_b_detail")),
                       payload.get("choice_b_domains") or []),
    }
    event_side = next((side for side, scenario in side_scenarios.items()
                       if scenario == key), None)
    comparison_side = ({"A": "B", "B": "A"}.get(event_side)
                       if event_side else None)
    return {
        "available": True,
        "scenario": key,
        "label": spec.get("label", item.get("label")),
        "coding_note": spec.get("coding"),
        "target_age": report.get("target_age", [25, 35]),
        "event_people": item["event_people"],
        "comparison_people": item["control_people"],
        "evidence_level": "observed_group",
        "evidence_label": "KOWEPS 종단 관측",
        "event_side": event_side,
        "comparison_side": comparison_side,
        "claim_limit": report.get("claim_limit"),
        "outcomes": outcomes,
        "indicator_mapping": indicator_mapping,
    }


def indicator_statuses(evidence: dict, side: str) -> dict:
    """KOWEPS 영역 사건의 결과변수 매핑을 공통 3지표 근거 계약으로 변환."""
    if not evidence.get("available"):
        return {}
    role = "사건 발생군" if evidence.get("event_side") == side else "비교 유지군"
    labels = {"direct": "observed_group", "proxy": "proxy_observation",
              "unavailable": "insufficient_evidence"}
    result = {}
    for indicator in ("경제적안정도", "성장가능성", "삶의질"):
        mapping = (evidence.get("indicator_mapping") or {}).get(indicator, {})
        strength = mapping.get("strength", "unavailable")
        keys = mapping.get("outcome_keys", [])
        if strength == "unavailable":
            reason = f"{evidence.get('label')}에서 {indicator}를 직접 나타내는 검증 결과변수는 아직 없음"
        else:
            qualifier = "직접 결과" if strength == "direct" else "부분 대리지표"
            reason = (f"KOWEPS 25~35세 {role}의 1·3·5·10차 종단 관측 · "
                      f"{qualifier}: {', '.join(keys)}")
        result[indicator] = {
            "status": labels[strength], "score": None,
            "eligible_for_psych_rag": False, "reason": reason,
            "outcome_keys": keys,
        }
    return result
