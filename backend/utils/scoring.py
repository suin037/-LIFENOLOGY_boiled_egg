"""입력 → 모델 feature 벡터 변환 유틸."""

from schemas import PredictRequest


def build_feature_vector(req: PredictRequest) -> dict:
    """PredictRequest 를 모델들이 쓰는 공통 feature dict 로 변환.

    None 인 항목은 각 모델이 학습 데이터 중앙값으로 대체한다.
    """
    return {
        "age": req.age,
        "sex": req.sex,
        "major": req.major,
        "gpa": req.gpa,
        "choice": req.choice,
        "monthly_wage": req.monthly_wage,
        "satis_overall": req.satis_overall,
        "life_satis": req.life_satis,
        "happy": req.happy,
        "is_regular": req.is_regular,
        "firm_size": req.firm_size,
    }
