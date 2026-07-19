"""lifelines: 재직기간 생존분석.

v2: KLIPS 실데이터 스펠 모델(lifelines_klips.pkl) 우선, 없으면 폴백.
"""

from functools import lru_cache

import joblib
import numpy as np
import pandas as pd

from config import settings


@lru_cache(maxsize=1)
def _load():
    klips = settings.artifacts_abspath / "lifelines_klips.pkl"
    if klips.exists():
        art = joblib.load(klips)
        return art, art
    art = joblib.load(settings.artifacts_abspath / "lifelines.pkl")
    enc = joblib.load(settings.artifacts_abspath / "encoders.pkl")
    return art, enc


def _value(col: str, features: dict, enc: dict) -> float:
    med = enc.get("medians", {})
    if col in ("age", "age_start"):
        return float(features.get("age", med.get(col, 30)))
    if col == "sex":
        try:
            return float(features.get("sex"))
        except (TypeError, ValueError):
            return med.get(col, 1)
    if col == "sex_enc":
        return enc["sex_map"].get(str(features.get("sex")), 0)
    if col == "major_enc":
        return enc["major_map"].get(str(features.get("major")), 0)
    v = features.get(col)
    return med.get(col, 0) if v is None else float(v)


def estimate_survival(features: dict) -> float:
    """예상 재직기간 중앙값(개월)."""
    art, enc = _load()
    X = pd.DataFrame([[_value(c, features, enc) for c in art["cov_cols"]]],
                     columns=art["cov_cols"])
    med = art["cox"].predict_median(X)
    v = float(med.iloc[0]) if hasattr(med, "iloc") else float(med)
    if not np.isfinite(v):
        v = float(art["km"].median_survival_time_)
    return v


def risk_timeline(features: dict, years=(1, 3, 5)) -> dict[int, float]:
    """N년 후 이직(이탈) 누적확률 - 서비스 '후회 리스크' 멘트용."""
    art, enc = _load()
    X = pd.DataFrame([[_value(c, features, enc) for c in art["cov_cols"]]],
                     columns=art["cov_cols"])
    sf = art["cox"].predict_survival_function(X)
    idx = np.asarray(sf.index, dtype=float)
    out = {}
    for yr in years:
        m = yr * 12
        out[yr] = round(1 - float(sf.iloc[int(np.abs(idx - m).argmin()), 0]), 3)
    return out
