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


def effect_confidence(features: dict) -> dict | None:
    """이 입력에 쓰인 L3 인과모델의 신뢰지표(ATE 95% CI 등). 없으면 None.

    **LinearDML 의 analytic 95% CI 를 우선 노출**한다.
    CausalForestDML 의 ATE 구간(ate_ci)은 표본 분산이 커서 0을 포함할 만큼 넓게 나오는데,
    같은 데이터의 LinearDML CI(linear_ci)는 훨씬 정밀하다(점추정은 둘이 사실상 동일).
    예) YP: CForest ATE +27.1 (CI -20.7~+75.0) vs LinearDML +27.8 (CI +21.0~+34.6).
    → '이직 인과효과가 0과 구분되는가'는 LinearDML CI 로 판단하는 게 정직·정확.
    (개별 입력 causal_effect 점추정은 CausalForest 이질효과 그대로 사용 — 별개.)
    """
    try:
        art, _ = _select(features)
    except RuntimeError:
        return None

    # LinearDML(analytic CI) 우선
    if art.get("linear_ate") is not None:
        ci = art.get("linear_ci") or (None, None)
        return {
            "ate": round(float(art["linear_ate"]), 1),
            "ci95_low": round(float(ci[0]), 1) if ci[0] is not None else None,
            "ci95_high": round(float(ci[1]), 1) if ci[1] is not None else None,
            "unit": "만원",
            "method": "LinearDML (analytic 95% CI)",
            "source": art.get("source"),
        }
    # 폴백: CausalForestDML ATE 구간(넓음 — 참고용)
    if art.get("ate") is not None:
        ci = art.get("ate_ci") or (None, None)
        return {
            "ate": round(float(art["ate"]), 1),
            "ci95_low": round(float(ci[0]), 1) if ci[0] is not None else None,
            "ci95_high": round(float(ci[1]), 1) if ci[1] is not None else None,
            "unit": "만원",
            "method": "CausalForestDML (ATE 구간, 넓음)",
            "source": art.get("source"),
        }
    return None
