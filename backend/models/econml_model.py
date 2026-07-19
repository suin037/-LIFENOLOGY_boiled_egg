"""EconML: 선택(이직)이 임금에 미치는 인과효과 추정.

v3: KLIPS 종단 모델(econml_klips.pkl)이 있으면 우선 사용.
    (이전 임금·근속·직종을 혼재변수로 통제한 진짜 인과추정)
    없으면 GOMS 단면 모델(econml.pkl)로 폴백.
"""

from functools import lru_cache

import joblib
import numpy as np

from config import settings


@lru_cache(maxsize=1)
def _load():
    klips = settings.artifacts_abspath / "econml_klips.pkl"
    if klips.exists():
        art = joblib.load(klips)
        return art, art  # KLIPS artifact 는 medians 자체 포함
    art = joblib.load(settings.artifacts_abspath / "econml.pkl")
    enc = joblib.load(settings.artifacts_abspath / "encoders.pkl")
    return art, enc


def _value(col: str, features: dict, enc: dict) -> float:
    med = enc.get("medians", {})
    if col in ("age", "age_start"):
        return float(features.get("age", med.get(col, 30)))
    if col == "sex":                       # KLIPS: 1/2 숫자
        try:
            return float(features.get("sex"))
        except (TypeError, ValueError):
            return med.get(col, 1)
    if col == "sex_enc":                   # GOMS 인코딩
        return enc["sex_map"].get(str(features.get("sex")), 0)
    if col == "major_enc":
        return enc["major_map"].get(str(features.get("major")), 0)
    v = features.get(col)
    return med.get(col, 0) if v is None else float(v)


def estimate_effect(features: dict, choice: str) -> float:
    art, enc = _load()
    X = np.array([[_value(c, features, enc) for c in art["x_cols"]]], dtype=float)
    return float(art["model"].effect(X)[0])
