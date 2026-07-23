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
from rag.psych_narrative import get_psych_evidence, build_psych_prompt_block
from rag.safety import assess_safety, crisis_message

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


def _safe(fn, fallback, *args, **kwargs):
    """상류 모델 오류(아티팩트↔모듈 계약 불일치 등)에도 서버가 죽지 않게 폴백.

    ⚠️ 임시 방어막. suin-model 학습 아티팩트와 backend 모델 모듈의 계약을 맞추는
    실제 배선은 별도 TODO(WORKLOG §7.4). 폴백이 발동하면 콘솔에 로그를 남긴다.
    """
    try:
        return fn(*args, **kwargs)
    except Exception as e:
        print(f"[predict] {getattr(fn, '__name__', fn)} 폴백: {type(e).__name__}: {e}")
        return fallback


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest) -> PredictResponse:
    features = build_feature_vector(req)

    neighbors = _safe(find_neighbors, [], features)
    effect = _safe(estimate_effect, 0.0, features, choice=req.choice)
    survival = _safe(estimate_survival, 0.0, features)

    expected_wage = sum(n.monthly_wage or 0 for n in neighbors) / max(len(neighbors), 1)

    # ── 위기 안전 분기(필수) ────────────────────────────────────────
    # 감정 신호(추후 일기 텍스트 포함)에서 급성 위기/강한 고통을 감지.
    safety_level, _ = assess_safety(emotions=req.emotions)
    if safety_level == "crisis":
        # 급성 위기: 조언·행동제안·평행우주 서사를 내지 않고 지지 메시지+자원으로 분기.
        return PredictResponse(
            expected_wage=expected_wage,
            causal_effect=effect,
            survival_months=survival,
            neighbors=neighbors,
            narrative=crisis_message(),
            safety_level="crisis",
        )

    # 재료 제공형 심리 RAG: 3지표 점수가 오면 관련 이론카드를 근거로 주입한다.
    # (레이어2 지표화·감정추출이 서빙에 연결되면 이 입력이 채워진다.)
    psych_block = ""
    if req.indicator_scores:
        evidence = get_psych_evidence(
            indicator_scores=req.indicator_scores,
            emotions=req.emotions,
            decision_type=req.choice,
        )
        psych_block = build_psych_prompt_block(evidence)

    # high_distress: 서사는 생성하되 톤을 낮추고 행동제안을 강요하지 않는다.
    narrative = generate_narrative(
        req, expected_wage, effect, survival,
        psych_block=psych_block, safety_mode=safety_level,
    )

    return PredictResponse(
        expected_wage=expected_wage,
        causal_effect=effect,
        survival_months=survival,
        neighbors=neighbors,
        narrative=narrative,
        safety_level=safety_level,
    )
