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

    # ── 심리 RAG(재료 제공형)용 선택 입력 ──────────────────────────
    # 레이어2 3지표 점수(0~1). 주어지면 관련 이론카드를 근거로 서사에 주입한다.
    indicator_scores: Optional[dict[str, float]] = Field(
        None, description="예: {'경제적안정도':0.6,'성장가능성':0.3,'삶의질':0.18}"
    )
    # 일기/체크인에서 추출한 감정 키워드(의미검색 보조).
    emotions: list[str] = Field(default_factory=list, description="예: ['후회','불안']")


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
    safety_level: str = Field(
        "normal", description="위기 안전 등급: normal | high_distress | crisis. "
        "crisis면 narrative는 서사가 아니라 지지 메시지+상담 자원이다."
    )
