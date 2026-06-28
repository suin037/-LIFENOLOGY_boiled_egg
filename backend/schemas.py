"""요청/응답 Pydantic 스키마."""

from typing import Optional

from pydantic import BaseModel, Field


class PredictRequest(BaseModel):
    """사용자가 입력하는 '현재의 나' + 비교할 진로 선택."""

    age: int = Field(..., ge=18, le=70)
    sex: str
    major: str = Field(..., description="전공 계열")
    gpa: Optional[float] = Field(None, ge=0, le=4.5)
    # 비교하고 싶은 대안 선택 (예: "대학원 진학" vs "취업")
    choice: str = Field(..., description="가정할 진로 선택")


class NeighborCase(BaseModel):
    """KNN 으로 찾은 유사 사례 1건."""

    similarity: float
    monthly_wage: Optional[float] = None
    job_category: Optional[str] = None


class PredictResponse(BaseModel):
    """평행우주 추정 결과."""

    expected_wage: float
    causal_effect: float = Field(..., description="선택이 임금에 미친 인과효과(EconML)")
    survival_months: float = Field(..., description="해당 직무 평균 재직기간(lifelines)")
    neighbors: list[NeighborCase] = []
    narrative: str = Field("", description="Claude 가 생성한 설명")
