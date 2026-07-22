"""요청/응답 Pydantic 스키마."""

from typing import Optional

from pydantic import BaseModel, Field


class PredictRequest(BaseModel):
    """사용자가 입력하는 '현재의 나' + 비교할 진로 선택.

    스펙(필수) + 온보딩 상태·성향(선택). 상태·성향을 안 보내면
    학습 데이터 중앙값으로 대체되지만, 보낼수록 매칭이 개인화된다.
    """

    age: int = Field(..., ge=18, le=70)
    sex: str = Field(..., description="'1'=남 / '2'=여 (GOMS 코드)")
    major: str = Field(..., description="전공 계열 코드")
    gpa: Optional[float] = Field(None, ge=0, le=4.5)
    choice: str = Field(..., description="가정할 진로 선택 (예: 이직 / 창업 / 진학)")

    # --- 온보딩 상태·성향 (선택) ---
    monthly_wage: Optional[float] = Field(None, gt=0, description="현재 월소득(만원)")
    satis_overall: Optional[int] = Field(None, ge=1, le=5, description="직무 만족도 1~5")
    life_satis: Optional[int] = Field(None, ge=1, le=7, description="삶의 만족도 1~7")
    happy: Optional[int] = Field(None, ge=1, le=7, description="행복감 1~7")
    is_regular: Optional[int] = Field(None, ge=1, le=2, description="1=정규직 2=비정규직")
    firm_size: Optional[int] = Field(None, ge=1, le=9, description="기업규모 코드 1~9")


class NeighborCase(BaseModel):
    """KNN 으로 찾은 유사 사례 1건."""

    similarity: float
    monthly_wage: Optional[float] = None
    job_category: Optional[str] = None
    satis_overall: Optional[float] = None
    life_satis: Optional[float] = None
    job_changed: Optional[int] = None


class LifeIndicator(BaseModel):
    """Layer 1 룰베이스가 조회한 '인생 지표' 1건.

    경제·삶의질·정신건강·신체건강·직업환경·창업 등 여러 차원을 같은 틀로 담는다.
    (심리학적 해석은 이 값을 받아 RAG 가 담당 — 엔진은 숫자만 제공)
    """

    dimension: str = Field(..., description="차원: 경제/삶의질/정신건강/신체건강/직업환경/창업 …")
    indicator: str
    value: float
    unit: str
    group: str = Field(..., description="이 값이 어떤 집단 기준인지 (예: 성별×연령대, 25-29)")
    source: str


class PredictResponse(BaseModel):
    """평행우주 추정 결과."""

    expected_wage: float
    causal_effect: float = Field(..., description="선택이 임금에 미친 인과효과(EconML)")
    survival_months: float = Field(..., description="해당 직무 평균 재직기간(lifelines)")
    neighbors: list[NeighborCase] = []
    neighbor_changed_ratio: float = Field(0.0, description="유사집단 중 실제 이직한 비율")
    risk_timeline: dict[int, float] = Field(default_factory=dict,
        description="{연차: 이직 누적확률} — KLIPS/YP 생존분석")
    life_indicators: list[LifeIndicator] = Field(default_factory=list,
        description="Layer1 룰베이스 생활지표 패널(경제·삶의질·건강·창업 등) — 넓은 인생 차원")
    narrative: str = Field("", description="Claude 가 생성한 설명")
