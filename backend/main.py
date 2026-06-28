"""FastAPI 엔트리포인트."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from schemas import PredictRequest, PredictResponse
from models.knn_model import find_neighbors
from models.econml_model import estimate_effect
from models.lifelines_model import estimate_survival
from utils.scoring import build_feature_vector
from utils.claude_api import generate_narrative

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

    neighbors = find_neighbors(features)
    effect = estimate_effect(features, choice=req.choice)
    survival = estimate_survival(features)

    expected_wage = sum(n.monthly_wage or 0 for n in neighbors) / max(len(neighbors), 1)

    narrative = generate_narrative(req, expected_wage, effect, survival)

    return PredictResponse(
        expected_wage=expected_wage,
        causal_effect=effect,
        survival_months=survival,
        neighbors=neighbors,
        narrative=narrative,
    )
