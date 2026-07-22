"""lifelines: 재직기간 생존분석 (L4 — '후회 리스크' 타임라인).

v3: 종단 스펠 모델을 '연령대'로 라우팅한다.
    · 청년(age ≤ YOUTH_MAX)  → lifelines_yp.pkl     (YP2021 청년패널 스펠)
    · 그 외                  → lifelines_klips.pkl  (KLIPS 스펠)
    · 둘 다 없으면            → lifelines.pkl        (GOMS 폴백; encoders 별도)
"""

from functools import lru_cache

import joblib
import numpy as np
import pandas as pd

from config import settings

YOUTH_MAX = 31


@lru_cache(maxsize=1)
def _load_all() -> dict:
    A = settings.artifacts_abspath
    arts: dict = {}
    for key, fname in (("yp", "lifelines_yp.pkl"), ("klips", "lifelines_klips.pkl")):
        p = A / fname
        if p.exists():
            art = joblib.load(p)
            arts[key] = (art, art)
    goms = A / "lifelines.pkl"
    if goms.exists():
        arts["goms"] = (joblib.load(goms), joblib.load(A / "encoders.pkl"))
    return arts


def _select(features: dict) -> tuple:
    arts = _load_all()
    age = features.get("age")
    if age is not None and float(age) <= YOUTH_MAX:
        order = ("yp", "klips", "goms")
    else:
        order = ("klips", "yp", "goms")
    for key in order:
        if key in arts:
            return arts[key]
    raise RuntimeError("lifelines artifact 가 하나도 없습니다.")


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
    art, enc = _select(features)
    X = pd.DataFrame([[_value(c, features, enc) for c in art["cov_cols"]]],
                     columns=art["cov_cols"])
    med = art["cox"].predict_median(X)
    v = float(med.iloc[0]) if hasattr(med, "iloc") else float(med)
    if not np.isfinite(v):
        v = float(art["km"].median_survival_time_)
    return v


def risk_timeline(features: dict, years=(1, 3, 5, 10)) -> dict[int, float]:
    """N년 후 이직(이탈) 누적확률 - 서비스 '후회 리스크' 멘트용.

    관측 범위(모델 스펠 최대 기간)를 크게 벗어나는 연차는 과대추정 방지를 위해 스킵.
    → KLIPS(≈10년)는 10년까지, YP(≈4년)는 관측 내 연차만.
    """
    art, enc = _select(features)
    X = pd.DataFrame([[_value(c, features, enc) for c in art["cov_cols"]]],
                     columns=art["cov_cols"])
    sf = art["cox"].predict_survival_function(X)
    idx = np.asarray(sf.index, dtype=float)
    max_yr = art.get("max_horizon_years", 10)   # 소스별 신뢰 최대 연차(KLIPS10/YP5)
    out = {}
    for yr in years:
        if yr > max_yr:            # 신뢰 범위 밖 → 스킵(과대추정 방지)
            continue
        m = yr * 12
        out[yr] = round(1 - float(sf.iloc[int(np.abs(idx - m).argmin()), 0]), 3)
    return out
