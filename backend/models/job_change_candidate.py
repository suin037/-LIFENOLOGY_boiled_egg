"""검증 중인 이직 재정 모델을 서비스 응답에 안전하게 노출한다.

중요: 개인 조건 예측은 실험값이고, 시간 검증을 통과한 값은 집단 평균 방향성이다.
기존 배포 모델과 indicators 점수를 이 모듈이 자동으로 덮어쓰지 않는다.
"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from config import ROOT


ARTIFACT = ROOT / "backend" / "models" / "candidates" / "job_change_3indicators_candidate.joblib"
TEMPORAL_REPORT = ROOT / "data" / "clean" / "job_change_model_temporal_validation.json"
SENSITIVITY_REPORT = ROOT / "data" / "clean" / "job_change_financial_sensitivity.json"
MODEL_KEY = "wage_change_pct"


@lru_cache(maxsize=1)
def _load_artifact() -> dict:
    if not ARTIFACT.exists():
        raise FileNotFoundError(ARTIFACT)
    artifact = joblib.load(ARTIFACT)
    if MODEL_KEY not in artifact.get("models", {}):
        raise RuntimeError(f"후보 artifact에 {MODEL_KEY} 모델이 없습니다")
    return artifact


@lru_cache(maxsize=1)
def _validated_population_result() -> dict | None:
    if not TEMPORAL_REPORT.exists():
        return None
    report = json.loads(TEMPORAL_REPORT.read_text(encoding="utf-8"))
    for result in report.get("results", []):
        if result.get("column") == MODEL_KEY and result.get("protocol") == "recent_year":
            return result
    return None


@lru_cache(maxsize=1)
def _sensitivity_result() -> dict | None:
    if not SENSITIVITY_REPORT.exists():
        return None
    report = json.loads(SENSITIVITY_REPORT.read_text(encoding="utf-8"))
    return report.get("summary")


def _input_frame(profile: dict, model: dict) -> tuple[pd.DataFrame, list[str], list[str]]:
    """Profile을 KLIPS t시점 후보 모델 입력으로 변환한다.

    전공명은 KLIPS 직종코드와 다른 값이므로 occupation_t에 억지 매핑하지 않는다.
    종사상지위·근속기간도 현재 Profile에 정확한 입력이 없어 학습 중앙값/결측 범주를 쓴다.
    """
    mapping = {
        "age_t": profile.get("age"),
        "real_wage_t": profile.get("monthly_wage"),
        "firm_size_t": profile.get("firm_size"),
        "tenure_t": profile.get("tenure_years"),
        "sex_t": profile.get("sex"),
        "edu_t": profile.get("edu_level"),
        "employment_status_t": profile.get("employment_status"),
        "occupation_group_t": profile.get("occupation_group"),
        "jobtype_t": (
            1 if profile.get("employment_status") in {1, 2, 3}
            else 2 if profile.get("employment_status") in {4, 5}
            else None
        ),
    }
    numeric = model["numeric"]
    categorical = model["categorical"]
    row = {}
    used, imputed = [], []
    for col in numeric:
        value = mapping.get(col)
        row[col] = pd.to_numeric(value, errors="coerce")
        (used if pd.notna(row[col]) else imputed).append(col)
    for col in categorical:
        value = mapping.get(col)
        if value is None or pd.isna(value):
            row[col] = "__MISSING__"
            imputed.append(col)
        else:
            row[col] = str(value)
            used.append(col)
    return pd.DataFrame([row], columns=[*numeric, *categorical]), used, imputed


def financial_impact(profile: dict) -> dict:
    """이직 재정 영향의 검증 근거와 실험적 개인 조건 추정치를 반환한다."""
    try:
        artifact = _load_artifact()
        model = artifact["models"][MODEL_KEY]
        x, used, imputed = _input_frame(profile, model)
        stay = float(model["outcome_stay"].predict(x)[0])
        move = float(model["outcome_move"].predict(x)[0])
        propensity = float(model["propensity"].predict_proba(x)[0, 1])
    except Exception as exc:
        return {
            "status": "unavailable",
            "reason": str(exc),
            "growth_potential": {"status": "insufficient_evidence"},
            "quality_of_life": {"status": "insufficient_evidence"},
        }

    validated = _validated_population_result()
    sensitivity = _sensitivity_result()
    population = None
    if validated:
        population = {
            "effect": validated["adjusted_effect_move_minus_stay"],
            "unit": "%p 실질임금 변화율",
            "ci95": validated["cluster_bootstrap_ci95"],
            "test_move_n": validated["test_move"],
            "overlap": validated["overlap_fraction"],
            "train_years": validated["train_years"],
            "test_years": validated["test_years"],
            "verdict": validated["temporal_verdict"],
        }

    return {
        "status": (
            "directional_evidence_not_deployment_approved"
            if sensitivity and sensitivity.get("decision") == "보류"
            else "supported_direction" if population else "candidate_only"
        ),
        "indicator": "경제적안정도",
        "outcome": "실질임금 변화율",
        "population_evidence": population,
        "sensitivity_validation": sensitivity,
        "personalized_estimate": {
            "status": "experimental_not_individually_validated",
            "stay_change_pct": round(stay, 2),
            "move_change_pct": round(move, 2),
            "difference_pct_points": round(move - stay, 2),
            "estimated_move_propensity": round(float(np.clip(propensity, 0, 1)), 3),
        },
        "input_quality": {
            "used_features": used,
            "imputed_features": imputed,
            "warning": (
                "일부 입력은 학습 중앙값 또는 결측 범주로 대체되었습니다. 개인 추정치를 확정 미래로 해석하지 마세요."
                if imputed else "핵심 직업 입력을 모두 사용했습니다. 그래도 개인 추정치는 실험값입니다."
            ),
        },
        "growth_potential": {
            "status": "insufficient_evidence",
            "reason": "최근 연도 검증에서 자기발전·장래성 효과가 재현되지 않음",
        },
        "quality_of_life": {
            "status": "insufficient_evidence",
            "reason": "반복 검증에서 삶의 만족·행복·건강·웰빙 효과가 안정적이지 않음",
        },
        "message": (
            "여러 검증에서 긍정 방향은 유지됐지만 불확실성이 남아, 현재는 참고 근거로만 제공합니다."
            if sensitivity and sensitivity.get("decision") == "보류"
            else "유사 조건 집단에서 이직 후 실질임금 변화가 긍정적인 방향으로 관측됐습니다."
        ),
    }


def prediction_for_choice(choice_kind: str, profile: dict) -> dict:
    if choice_kind not in {"이직", "유지"}:
        return {
            "status": "not_applicable",
            "reason": "현재 검증된 후보는 이직과 현상 유지 비교에만 적용됩니다.",
        }
    result = financial_impact(profile)
    result["selected_scenario"] = "move" if choice_kind == "이직" else "stay"
    return result
