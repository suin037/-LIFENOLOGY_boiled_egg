"""입력 → 모델 feature 벡터 변환 및 점수화 유틸."""

from schemas import PredictRequest


def build_feature_vector(req: PredictRequest) -> dict:
    """PredictRequest 를 모델들이 쓰는 공통 feature dict 로 변환."""
    # TODO: 학습 시 사용한 인코딩(범주형 → 수치)과 동일하게 맞추기
    return {
        "age": req.age,
        "sex": req.sex,
        "major": req.major,
        "gpa": req.gpa,
        "choice": req.choice,
    }
