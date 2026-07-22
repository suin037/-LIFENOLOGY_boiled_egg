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
    edu_level: Optional[int] = Field(None, ge=2, le=9,
        description="교육수준(KLIPS 학력코드: 5=고졸 6=전문대 7=대졸 8=석사 9=박사) — 궤적 매칭 정교화용(선택)")


class NeighborCase(BaseModel):
    """KNN 으로 찾은 유사 사례 1건."""

    source: Optional[str] = Field(None, description="매칭 풀 출처: GOMS(전공 매칭) / YP(청년패널)")
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


class TrajectoryPoint(BaseModel):
    """종단 궤적 한 시점 — '너와 비슷한 사람들'의 실제 관측 분포."""

    year: int = Field(..., description="시작 시점 기준 경과 연수(0=현재)")
    age: int
    sample_n: int = Field(..., description="이 시점까지 추적된 유사인 수 (작을수록 불확실)")
    income_p25: float = Field(..., description="월소득 하위 25%(만원)")
    income_p50: float = Field(..., description="월소득 중앙값(만원)")
    income_p75: float = Field(..., description="월소득 상위 25%(만원)")
    job_change_cum: Optional[float] = Field(None, description="시작 이후 누적 이직 경험 비율")


class PredictResponse(BaseModel):
    """평행우주 추정 결과.

    선택지(choice)에 따라 제공되는 레이어가 다르다:
      · 이직 — 개인단위 매칭(L2)·인과(L3)·생존(L4) 전부 + 생활지표(L1)
      · 창업 — 생활지표(L1) + 창업 폐업 타임라인. 개인단위 필드는 None
      · 진학 — 생활지표(L1) 중심. 개인단위 필드는 None
    그래서 개인단위 수치 필드는 Optional 이며, coverage 로 무엇이 제공됐는지 알린다.
    """

    choice: str = Field(..., description="적용된 선택지 (이직/창업/진학)")
    coverage: str = Field("", description="이 선택지에 어떤 레이어가 적용됐는지 설명")

    expected_wage: Optional[float] = Field(None, description="유사집단 기대 월소득(L2, 이직만)")
    causal_effect: Optional[float] = Field(None, description="선택이 임금에 미친 인과효과(L3 EconML, 이직만)")
    survival_months: Optional[float] = Field(None, description="평균 재직기간(L4 lifelines, 이직만)")
    neighbors: list[NeighborCase] = []
    neighbor_changed_ratio: Optional[float] = Field(None, description="유사집단 중 실제 이직 비율(이직만)")
    risk_timeline: dict[int, float] = Field(default_factory=dict,
        description="{연차: 누적확률} — 이직=이직확률(L4), 창업=폐업확률(생멸통계)")
    life_indicators: list[LifeIndicator] = Field(default_factory=list,
        description="Layer1 룰베이스 생활지표 패널(경제·삶의질·건강·창업 등) — 넓은 인생 차원")
    trajectory: list[TrajectoryPoint] = Field(default_factory=list,
        description="종단 궤적 — 비슷한 사람들의 향후 N년 소득·이직 실제 분포(데이터 기반 미래 예측)")
    scenario_trajectories: dict[str, list[TrajectoryPoint]] = Field(default_factory=dict,
        description="선택지 평행우주 — {'유지': 기준경로, '이직': 기준+L3인과효과}. 이직 choice에서만 제공")
    narrative: str = Field("", description="Claude 가 생성한 설명")
