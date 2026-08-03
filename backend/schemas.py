"""요청/응답 Pydantic 스키마."""

from typing import Optional

from pydantic import BaseModel, Field


class Profile(BaseModel):
    """'현재의 나' — 선택(choice)을 뺀 사용자 상태·성향.

    스펙(필수) + 온보딩 상태·성향(선택). 상태·성향을 안 보내면
    학습 데이터 중앙값으로 대체되지만, 보낼수록 매칭이 개인화된다.
    (PredictRequest 는 여기에 choice 하나를, CompareRequest 는 choice_a/b 를 더한다.)
    """

    age: int = Field(..., ge=18, le=70)
    sex: str = Field(..., description="'1'=남 / '2'=여 (GOMS 코드)")
    major: str = Field(..., description="전공 계열 코드")
    gpa: Optional[float] = Field(None, ge=0, le=4.5)

    # --- 온보딩 상태·성향 (선택) ---
    monthly_wage: Optional[float] = Field(None, gt=0, description="현재 월소득(만원)")
    satis_overall: Optional[int] = Field(None, ge=1, le=5, description="직무 만족도 1~5")
    life_satis: Optional[int] = Field(None, ge=1, le=7, description="삶의 만족도 1~7")
    happy: Optional[int] = Field(None, ge=1, le=7, description="행복감 1~7")
    is_regular: Optional[int] = Field(None, ge=1, le=2, description="1=정규직 2=비정규직")
    firm_size: Optional[int] = Field(None, ge=1, le=9, description="기업규모 코드 1~9")
    edu_level: Optional[int] = Field(None, ge=2, le=9,
        description="교육수준(KLIPS 학력코드: 5=고졸 6=전문대 7=대졸 8=석사 9=박사) — 궤적 매칭 정교화용(선택)")
    persona_block: Optional[str] = Field(None,
        description="qmode 성향 재료(이직 서사 개인화). 없으면 기존과 동일 — 예측 수치엔 미반영, 서사 톤·순서만 조정")

    # --- 가치 성향 (선택) — 개인화 레이어용. 모델 매칭 피처 아님(강조·초점·서사에만) ---
    value_weights: Optional[dict[str, float]] = Field(
        None,
        description="온보딩 가치순위 → 5축 가중치(합≈1). qmode value_ranking.axis_weights 산출물 "
        "{경제,관계,성장,자기실현,안정}. 성향 개인화(강조·초점)에만 사용.")


class PredictRequest(Profile):
    """현재의 나 + 비교할 진로 선택 1개 (`/predict` 용)."""

    choice: str = Field(..., description="가정할 진로 선택 (예: 이직 / 창업 / 진학)")


class CompareRequest(BaseModel):
    """현재의 나 + 두 진로 선택(A/B) (`/compare` 용, 평행우주 비교).

    profile 은 공통 '현재의 나', choice_a/choice_b 는 저울질하는 두 선택지.
    """

    profile: Profile
    choice_a: str = Field(..., description="선택지 A (예: 이직)")
    choice_b: str = Field(..., description="선택지 B (예: 대학원 진학)")
    # 삶의 영역(9개 domain key: career/education/business/finance/health/housing/
    # relationship/lifestyle/long_term_values). 프론트 detectLifeDomains 산출.
    # '행동(choice)+삶의 영역(domain)' 구조화 입력의 domain 축 — 영역별 데이터 라우팅·근거수준 분기.
    choice_a_domains: Optional[list[str]] = Field(
        None, description="선택 A가 건드리는 삶의 영역 키 리스트(예: ['career'])"
    )
    choice_b_domains: Optional[list[str]] = Field(
        None, description="선택 B가 건드리는 삶의 영역 키 리스트(예: ['relationship'])"
    )


class SimulateRequest(CompareRequest):
    """전체 파이프라인(`/simulate`) 요청 = 비교 요청 + (선택) 일기 텍스트.

    diary 를 주면 일기모듈(2번)이 감정신호를 뽑아 profile(satis_*)을 개인화하고
    서사 컨텍스트로도 쓴다. 위기(L3) 감지 시 서사 대신 상담 안내를 반환한다.
    """

    diary: Optional[str] = Field(
        None, description="사용자 일기 텍스트(선택). 있으면 감정신호로 개인화 + 서사 반영"
    )
    choice_a_detail: Optional[str] = Field(
        None, max_length=500, description="같은 선택 유형을 구분하는 A의 구체적 상황"
    )
    choice_b_detail: Optional[str] = Field(
        None, max_length=500, description="같은 선택 유형을 구분하는 B의 구체적 상황"
    )
    emotions: Optional[list[str]] = Field(
        None, description="감정 키워드(선택). 심리카드 검색·안전분기에 사용"
    )
    indicator_scores: Optional[dict[str, float]] = Field(
        None,
        description="3지표(경제적안정도/성장가능성/삶의질) 0~1 override(선택). 미지정 시 엔진에서 산출",
    )

    # --- 성향 개인화 재료 (선택) — 지윤 qmode 산출물. 없으면 개인화는 건너뛴다 ---
    diary_axis_weights: Optional[dict[str, float]] = Field(
        None, description="일기 언어지표로 갱신된 5축 가중치(선택). 있으면 확신도로 온보딩값과 혼합")
    diary_n_answers: Optional[int] = Field(
        None, ge=0, description="누적 일기 답변 수(성향 확신도/recency 판단)")
    disposition_block: Optional[str] = Field(
        None, description="qmode disposition.build_disposition_block() 텍스트(서사 톤·강조 재료)")
    value_ranking: Optional[list[str]] = Field(
        None, description="온보딩 가치 카드 순위(중요한 순, card id 또는 label 리스트). "
        "profile.value_weights 가 없을 때 이걸 qmode value_ranking.axis_weights 로 변환해 사용.")


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


class WellbeingPoint(BaseModel):
    """만족도 궤적 한 시점 — 종합 만족도(1~5)의 시간 변화 (청년·YP)."""

    year: int = Field(..., description="시작 기준 경과 연수(0=현재)")
    age: int
    sample_n: int
    satis_p25: float = Field(..., description="종합 만족도 하위25%(1~5)")
    satis_p50: float = Field(..., description="종합 만족도 중앙값(1~5)")
    satis_p75: float = Field(..., description="종합 만족도 상위25%(1~5)")


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
    wellbeing_trajectory: list[WellbeingPoint] = Field(default_factory=list,
        description="만족도 궤적 — 종합 만족도(1~5)의 시간 변화(청년·YP). 소득 궤적과 짝지어 해석")
    satisfaction_facets: dict[str, list[dict]] = Field(default_factory=dict,
        description="만족도 세부 facet별 궤적 {facet_key: [{year,age,sample_n,p50}]} — 직무·자기발전·소득·고용안정·장래성")
    scenario_trajectories: dict[str, list[TrajectoryPoint]] = Field(default_factory=dict,
        description="선택지 평행우주 — {'유지': 기준경로, '이직': 기준+L3인과효과}. 이직 choice에서만 제공")
    narrative: str = Field("", description="Claude 가 생성한 설명")


# ============================================================ /compare (A/B 비교 뷰)
# 발표 스펙(3지표 × 1·3·5·10년 × A/B)에 맞춘 정규화 출력 계층.
# 엔진(L1~L5)은 그대로 두고, 두 예측 결과를 카드 모양으로 재구성한 것.

class IndicatorPoint(BaseModel):
    """3지표 카드의 한 스냅샷(특정 연차) 값.

    데이터가 없는 연차는 available=false + note 로 정직하게 비운다(값을 지어내지 않음).
    """

    year: int
    available: bool = True
    value: Optional[float] = Field(None, description="대표값(중앙값 등)")
    p25: Optional[float] = Field(None, description="하위25%(분포 밴드용)")
    p75: Optional[float] = Field(None, description="상위25%(분포 밴드용)")
    unit: Optional[str] = None
    sample_n: Optional[int] = Field(None, description="추적 표본 수(작을수록 불확실)")
    source: Optional[str] = None
    note: Optional[str] = Field(None, description="available=false 이유 등")


class FacetPoint(BaseModel):
    """만족도 facet 궤적 한 시점(중앙값)."""

    year: int
    value: float = Field(..., description="해당 facet 만족도 중앙값(1~5)")
    sample_n: int


class FacetTrajectory(BaseModel):
    """만족도 세부 facet 하나의 궤적 + 변화 요약."""

    key: str = Field(..., description="원변수 키(satis_growth 등)")
    label: str = Field(..., description="사람이 읽는 이름(자기발전(성장) 만족 등)")
    dimension: str = Field(..., description="묶음 차원: 직무/성장/소득/안정/미래")
    points: list[FacetPoint] = Field(default_factory=list)
    start: Optional[float] = None
    latest: Optional[float] = None
    delta: Optional[float] = None
    direction: Optional[str] = Field(None, description="상승/하락/유지")
    scale: str = "1~5"
    source: Optional[str] = None


class ScenarioView(BaseModel):
    """선택지 하나(A 또는 B)의 평행우주 뷰.

    핵심 서사 = '너와 비슷한 사람들이 이 길을 갔을 때': **만족도·소득·후회**가 주인공.
    시점(스냅샷)은 데이터가 지지하는 곳만 채우고, 없으면 available=false 로 정직하게 비운다.
    """

    choice: str
    kind: str = Field(..., description="정규화된 선택 유형: 이직/창업/진학")
    coverage: str

    # ---- 주인공 3지표 (만족도 · 소득 · 후회) ----
    satisfaction: list[IndicatorPoint] = Field(default_factory=list,
        description="삶의 만족도 궤적(종합 1~5, 청년·YP). '이 길 간 사람의 만족도가 이렇게 변함'")
    satisfaction_summary: Optional[dict] = Field(None,
        description="종합 만족도 변화 한 줄 요약 {start, latest, delta, direction, span_years, sample_n, source}")
    satisfaction_facets: list[FacetTrajectory] = Field(default_factory=list,
        description="만족도 세부 facet(직무·자기발전·소득·고용안정·장래성)별 궤적+변화요약")
    income: list[IndicatorPoint] = Field(default_factory=list,
        description="소득 — 비슷한 사람들의 월소득 중앙값·분포(만원, L5, 이직은 L3 인과 반영)")
    regret: list[IndicatorPoint] = Field(default_factory=list,
        description="후회 리스크 — 이직=이탈확률(L4)/창업=폐업확률(생멸)/진학=이탈데이터없음")
    regret_summary: Optional[dict] = Field(None,
        description="후회 리스크 한 줄 요약 {label, worst_year, worst_value, unit, source}")

    # ---- 보조 지표 ----
    growth_potential: list[IndicatorPoint] = Field(default_factory=list,
        description="(보조) 성장 가능성 — 현재 대비 소득 상승률(L5 궤적 기울기)")

    # ---- 맥락 ----
    health_context: list[LifeIndicator] = Field(default_factory=list,
        description="건강 맥락 — 정신·신체건강·직업환경(집단 기준, 선택 무관 참고값)")
    choice_context: list[LifeIndicator] = Field(default_factory=list,
        description="선택 맥락 — 창업 생존율(창업) / 계열 취업률·진학률(진학)")

    confidence: dict = Field(default_factory=dict,
        description="신뢰지표 — L4 5-fold C-index, L3 인과 95% CI 등(이직에서 제공)")
    raw: PredictResponse = Field(..., description="원본 /predict 결과 전체(만족도 원자료 등 포함, 프론트 자유 사용)")


class CompareResponse(BaseModel):
    """A vs B 평행우주 비교 — 발표 화면(두 행성·3지표·타임라인)에 1:1 대응."""

    profile: Profile
    snapshots: list[int] = Field(default_factory=lambda: [1, 3, 5, 10],
        description="지표 카드 시점(년). 데이터 없는 시점은 각 IndicatorPoint.available=false")
    choice_a: str
    choice_b: str
    scenarios: dict[str, ScenarioView] = Field(default_factory=dict,
        description="{'A': ScenarioView, 'B': ScenarioView}")
    note: str = Field("", description="비교 해석 주의사항(동일 유형 경고·인과 적용 범위 등)")
