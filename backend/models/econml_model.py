"""EconML: 선택(이직)이 소득에 미치는 인과효과 추정.

v4: 종단 인과모델을 '연령대'로 라우팅한다.
    · 청년(age ≤ YOUTH_MAX)  → econml_yp.pkl     (YP2021 청년패널; 서비스 타겟 밀착)
    · 그 외                  → econml_klips.pkl  (KLIPS 전연령 종단)
    · 둘 다 없으면            → econml.pkl        (GOMS 단면; encoders 별도)

YP/KLIPS artifact 는 medians 를 자체 포함하므로 enc = art 로 둔다.
GOMS 폴백만 encoders.pkl 을 별도로 쓴다.
"""

from functools import lru_cache

import joblib
import numpy as np

from config import settings

# YP(청년패널) 표본 상한(≈31세). 이 나이 이하 입력은 YP 모델을 우선 사용한다.
YOUTH_MAX = 31


@lru_cache(maxsize=1)
def _load_all() -> dict:
    """사용 가능한 인과 artifact 를 모두 로드. {key: (art, enc)}."""
    A = settings.artifacts_abspath
    arts: dict = {}
    for key, fname in (("yp", "econml_yp.pkl"), ("klips", "econml_klips.pkl")):
        p = A / fname
        if p.exists():
            art = joblib.load(p)
            arts[key] = (art, art)          # 종단 artifact 는 medians 자체 포함
    goms = A / "econml.pkl"
    if goms.exists():                        # GOMS 폴백은 encoders 별도
        arts["goms"] = (joblib.load(goms), joblib.load(A / "encoders.pkl"))
    return arts


def _select(features: dict) -> tuple:
    """연령대에 맞는 (art, enc) 선택. 청년은 YP, 그 외는 KLIPS 우선."""
    arts = _load_all()
    age = features.get("age")
    if age is not None and float(age) <= YOUTH_MAX:
        order = ("yp", "klips", "goms")
    else:
        order = ("klips", "yp", "goms")
    for key in order:
        if key in arts:
            return arts[key]
    raise RuntimeError("EconML artifact 가 하나도 없습니다.")


def _value(col: str, features: dict, enc: dict) -> float:
    med = enc.get("medians", {})
    if col in ("age", "age_start"):
        return float(features.get("age", med.get(col, 30)))
    if col == "sex":                       # 종단 모델: 1/2 숫자
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
    art, enc = _select(features)
    X = np.array([[_value(c, features, enc) for c in art["x_cols"]]], dtype=float)
    return float(art["model"].effect(X)[0])


def effect_source(features: dict) -> str:
    """디버그/설명용: 이 입력에 어떤 소스가 쓰였는지."""
    art, _ = _select(features)
    return str(art.get("source", "unknown"))
