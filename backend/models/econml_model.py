"""EconML: 특정 진로 '선택'이 임금 등 결과에 미치는 인과효과 추정."""

# TODO: 학습된 CausalForestDML 등을 artifacts 에서 로드
# from joblib import load
# _model = load(settings.artifacts_abspath / "econml.pkl")


def estimate_effect(features: dict, choice: str) -> float:
    """choice(처치)가 결과에 준 평균 처치효과(ATE/CATE)를 반환."""
    # TODO: _model.effect(X=...) 로 교체
    return 0.0
