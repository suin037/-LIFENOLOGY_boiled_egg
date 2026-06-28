"""lifelines: 직무 재직기간 등 '생존' 분석."""

# TODO: 학습된 CoxPHFitter / KaplanMeierFitter 를 artifacts 에서 로드
# from joblib import load
# _model = load(settings.artifacts_abspath / "lifelines.pkl")


def estimate_survival(features: dict) -> float:
    """예상 재직기간(개월)을 반환."""
    # TODO: _model.predict_median(...) 등으로 교체
    return 0.0
