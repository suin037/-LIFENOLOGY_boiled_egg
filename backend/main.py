"""FastAPI 엔트리포인트."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from schemas import PredictRequest, PredictResponse
from models.knn_model import find_neighbors
from models.econml_model import estimate_effect
from models.lifelines_model import estimate_survival, risk_timeline
from rulebase import query_life_indicators, startup_closure_timeline
from utils.scoring import build_feature_vector
from utils.claude_api import generate_narrative


def _choice_kind(choice: str) -> str:
    """자유입력 choice 를 이직/창업/진학 3분류로 정규화."""
    c = str(choice)
    if any(k in c for k in ("창업", "사업", "자영", "startup")):
        return "창업"
    if any(k in c for k in ("진학", "대학원", "유학", "학업", "석사", "박사")):
        return "진학"
    return "이직"

app = FastAPI(title="parallel-me API")

# 프론트(Vite 기본 5173) 에서의 호출 허용
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "model": settings.claude_model}


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest) -> PredictResponse:
    features = build_feature_vector(req)
    kind = _choice_kind(req.choice)

    # Layer 1: 룰베이스 생활지표 패널 — 선택지 무관 항상 제공 (choice 는 창업 지표 포함 여부에 반영됨)
    life_indicators = query_life_indicators(features)

    # 개인단위 레이어(L2/L3/L4)는 '이직'에만 인과 데이터가 있어 적용. 나머지는 None.
    neighbors: list = []
    expected_wage = changed_ratio = effect = survival = None
    timeline: dict = {}

    if kind == "이직":
        neighbors = find_neighbors(features)
        effect = estimate_effect(features, choice=req.choice)
        survival = estimate_survival(features)
        timeline = risk_timeline(features)
        expected_wage = sum(n.monthly_wage or 0 for n in neighbors) / max(len(neighbors), 1)
        changed_ratio = sum(1 for n in neighbors if n.job_changed) / max(len(neighbors), 1)
        coverage = "이직: 개인단위 매칭(L2)·인과(L3)·생존(L4) + 생활지표(L1)"
    elif kind == "창업":
        timeline = startup_closure_timeline(features)      # 폐업 누적확률
        coverage = ("창업: 생활지표(L1) + 창업 생존/폐업 통계. "
                    "개인단위 인과·매칭은 창업 추적 데이터 부재로 미제공")
    else:  # 진학
        coverage = ("진학: 생활지표(L1) 중심. "
                    "취업률(KEDI)·개인단위 모델은 데이터 확보 후 확장 예정")

    narrative = generate_narrative(req, expected_wage or 0, effect or 0, survival or 0)

    return PredictResponse(
        choice=req.choice,
        coverage=coverage,
        expected_wage=expected_wage,
        causal_effect=effect,
        survival_months=survival,
        neighbors=neighbors,
        neighbor_changed_ratio=changed_ratio,
        risk_timeline=timeline,
        life_indicators=life_indicators,
        narrative=narrative,
    )
