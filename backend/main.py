"""FastAPI 엔트리포인트.

예측 코어는 core.run_prediction 에, A/B 비교는 compare.build_comparison 에 있고
여기선 라우팅만 한다.
  · POST /predict  — 현재의 나 + 선택 1개 → 평행우주 추정(L1~L5)
  · POST /compare  — 현재의 나 + 선택 A/B → 발표 카드용 비교 뷰(3지표×1·3·5·10)
  · POST /simulate — /compare 수치 + RAG 근거 + Claude 서사(전체 파이프라인)
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from schemas import (
    PredictRequest,
    PredictResponse,
    CompareRequest,
    CompareResponse,
    SimulateRequest,
)
from core import run_prediction
from compare import build_comparison

import rag
import diary_bridge
from utils.claude_api import generate_scenarios

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
    return run_prediction(req)


@app.post("/compare", response_model=CompareResponse)
def compare(req: CompareRequest) -> CompareResponse:
    return build_comparison(req)


@app.post("/simulate")
def simulate(req: SimulateRequest) -> dict:
    """전체 파이프라인: (일기신호) → 엔진 수치(/compare) → RAG 근거 → Claude 서사.

    - diary 가 있으면 일기모듈(2번)로 감정신호를 뽑아 profile(satis_*)을 개인화하고
      서사 컨텍스트로도 넣는다. 위기(L3) 감지 시 서사 대신 상담 안내를 반환.
    - ANTHROPIC_API_KEY 가 없으면 수치+근거는 반환하고 서사만 건너뛴다.
    """
    # 0) 일기모듈 — 감정신호 추출 & 개인화
    diary: dict = {"available": False}
    if getattr(req, "diary", None):
        diary = diary_bridge.analyze_diary(req.diary)

        # 위기(L3): 서사 생성 중단, 상담 안내 (엔진 수치는 그대로 계산해 반환)
        if diary.get("block_report"):
            cmp = build_comparison(req).model_dump()
            return {
                "profile": cmp["profile"],
                "choice_a": cmp["choice_a"],
                "choice_b": cmp["choice_b"],
                "compare": cmp,
                "diary": diary,
                "crisis": True,
                "narrative": {
                    "a": "",
                    "b": "",
                    "comparison": diary_bridge.crisis_message(diary.get("crisis_level", 3)),
                    "_crisis": True,
                },
                "api_used": False,
                "model": settings.claude_model,
            }

        # 일기 valence → satis_* 근사로 profile 의 빈 칸만 채움(사용자 입력 우선)
        for k, v in diary_bridge.to_profile_signals(diary).items():
            if getattr(req.profile, k, None) is None:
                setattr(req.profile, k, v)

    cmp = build_comparison(req).model_dump()
    scen_a = cmp["scenarios"]["A"]
    scen_b = cmp["scenarios"]["B"]

    ev_a = rag.evidence_for_choice(req.choice_a)
    ev_b = rag.evidence_for_choice(req.choice_b)

    # 일기 신호를 서사 컨텍스트(note)에 합침
    note = cmp.get("note", "")
    dctx = diary_bridge.diary_context_line(diary)
    if dctx:
        note = (note + "  /  [일기 신호] " + dctx).strip(" /")

    try:
        narrative = generate_scenarios(
            req.profile.model_dump(),
            scen_a,
            scen_b,
            ev_a,
            ev_b,
            note=note,
            model=settings.claude_model,
        )
    except Exception as exc:  # 키 오류·API 장애가 나도 수치·근거는 살려서 반환
        narrative = {
            "a": f"(서사 생성 실패: {type(exc).__name__})",
            "b": "",
            "comparison": "",
            "_error": str(exc)[:300],
        }

    return {
        "profile": cmp["profile"],
        "choice_a": cmp["choice_a"],
        "choice_b": cmp["choice_b"],
        "snapshots": cmp.get("snapshots"),
        "compare": cmp,
        "evidence": {"A": ev_a, "B": ev_b},
        "diary": diary,
        # L2(주의): 차단하진 않지만 지원 안내를 첨부(모듈 안전 규칙)
        "support_note": diary_bridge.crisis_message(diary["crisis_level"])
        if diary.get("crisis_level", 0) >= 2
        else "",
        "narrative": narrative,
        "rag_docs": rag.get_index().n_docs,
        "api_used": not narrative.get("_skipped", False),
        "model": settings.claude_model,
    }
