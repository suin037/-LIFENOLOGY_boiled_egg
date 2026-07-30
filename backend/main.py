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

import stat_evidence
import indicators as indicators_mod
import diary_bridge
import personalize
from utils.claude_api import generate_scenarios
from rag.psych_narrative import get_psych_evidence, build_psych_prompt_block
from rag import safety as rag_safety

app = FastAPI(title="parallel-me API")

# 프론트(Vite 기본 5173) 에서의 호출 허용
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):\d+",  # 로컬 개발/프리뷰 포트 허용
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
    """전체 파이프라인: (일기신호) → 엔진 L1~L5 수치 → 3지표 산출 →
    심리카드(민주 psych RAG) + 통계근거 → Claude 서사.

    - diary/emotions 로 안전 분기(위기 시 상담 안내). 엔진 수치는 항상 계산.
    - indicator_scores 는 엔진에서 산출(요청에 주면 override).
    - ANTHROPIC_API_KEY 없으면 수치·지표·근거는 반환하고 서사만 건너뛴다.
    """
    # 0) 일기모듈 — 감정신호 추출 & 개인화
    diary: dict = {"available": False}
    if getattr(req, "diary", None):
        diary = diary_bridge.analyze_diary(req.diary)
        for k, v in diary_bridge.to_profile_signals(diary).items():
            if getattr(req.profile, k, None) is None:
                setattr(req.profile, k, v)

    # 0-1) 안전 분기(민주 safety, 정본) — 감정 + 일기 텍스트 종합
    safety_level, safety_hits = rag_safety.assess_safety(
        emotions=req.emotions, text=req.diary or ""
    )
    crisis = diary.get("block_report") or safety_level == "crisis"
    if crisis:
        cmp = build_comparison(req).model_dump()
        return {
            "profile": cmp["profile"],
            "choice_a": cmp["choice_a"],
            "choice_b": cmp["choice_b"],
            "compare": cmp,
            "diary": diary,
            "crisis": True,
            "safety_level": "crisis",
            "narrative": {"a": "", "b": "", "comparison": rag_safety.crisis_message(), "_crisis": True},
            "api_used": False,
            "model": settings.claude_model,
        }

    cmp = build_comparison(req).model_dump()
    scen_a = cmp["scenarios"]["A"]
    scen_b = cmp["scenarios"]["B"]
    baseline = getattr(req.profile, "monthly_wage", None)

    # 1) 3지표 산출(엔진 → 0~1). 요청 override 가 있으면 그걸 사용.
    ind_a = req.indicator_scores or indicators_mod.compute_indicators(scen_a, baseline)
    ind_b = req.indicator_scores or indicators_mod.compute_indicators(scen_b, baseline)

    # 1-1) 성향 개인화(Option A): 가치가중치 → 서술순서·초점·질적강조·확신도.
    #      모델 매칭엔 관여 안 함. value_weights 없으면 focus_* = None(기존 동작 유지).
    #  · value_weights 직접 오면 그걸, 아니면 온보딩 순위(value_ranking)를
    #    지윤 정본(qmode.value_ranking.axis_weights)으로 변환해 사용.
    value_weights = getattr(req.profile, "value_weights", None)
    if not value_weights and getattr(req, "value_ranking", None):
        try:
            from qmode.value_ranking import axis_weights
            value_weights = axis_weights(req.value_ranking)
        except Exception:
            value_weights = None
    pz = personalize.build_personalization(
        value_weights=value_weights,
        diary_weights=req.diary_axis_weights,
        n_answers=req.diary_n_answers,
        indicator_scores_a=ind_a, indicator_scores_b=ind_b,
        disposition_block=req.disposition_block or "",
    )
    focus_a = pz["focus_a"][0] if pz["focus_a"] else None
    focus_b = pz["focus_b"][0] if pz["focus_b"] else None

    # 2) 심리카드(민주 psych RAG): 3지표 + 감정 → 초점지표의 이론카드
    #    성향이 있으면 '중요하며 위태로운' 축을 초점으로 넘김(없으면 최저지표 폴백).
    psych_a = get_psych_evidence(ind_a, emotions=req.emotions,
                                 decision_type=req.choice_a, focus_override=focus_a)
    psych_b = get_psych_evidence(ind_b, emotions=req.emotions,
                                 decision_type=req.choice_b, focus_override=focus_b)

    # 3) 통계 근거(숫자 근거) — 선택지별
    ev_a = stat_evidence.evidence_for_choice(req.choice_a)
    ev_b = stat_evidence.evidence_for_choice(req.choice_b)

    # 4) 서사 컨텍스트(note): 일기신호 + 심리카드 근거블록(A/B)
    note = cmp.get("note", "")
    dctx = diary_bridge.diary_context_line(diary)
    if dctx:
        note += "  /  [일기 신호] " + dctx
    blk_a = build_psych_prompt_block(psych_a)
    blk_b = build_psych_prompt_block(psych_b)
    if blk_a:
        note += f"\n\n[A={req.choice_a} 심리근거]\n" + blk_a
    if blk_b:
        note += f"\n\n[B={req.choice_b} 심리근거]\n" + blk_b
    # 4-1) 성향 개인화 지시문(서술 우선순위·톤·질적강조) 주입 — 지윤 handoff §2.
    #      성향(가중치)이 실제로 있을 때만 붙인다.
    if value_weights:
        note = (note + "\n\n" + personalize.narrative_directive(
            pz, req.choice_a, req.choice_b)).strip()

    note = note.strip()

    try:
        narrative = generate_scenarios(
            req.profile.model_dump(), scen_a, scen_b, ev_a, ev_b,
            note=note, model=settings.claude_model,
        )
    except Exception as exc:  # 키/ API 오류에도 수치·지표·근거는 반환
        narrative = {"a": f"(서사 생성 실패: {type(exc).__name__})", "b": "", "comparison": "", "_error": str(exc)[:300]}

    return {
        "profile": cmp["profile"],
        "choice_a": cmp["choice_a"],
        "choice_b": cmp["choice_b"],
        "snapshots": cmp.get("snapshots"),
        "compare": cmp,
        "indicators": {"A": ind_a, "B": ind_b},
        "personalization": pz,
        "psych": {
            "A": {"focus": psych_a.get("focus_indicator"), "level": psych_a.get("level"),
                  "cards": [c["card_id"] for c in psych_a.get("cards", [])]},
            "B": {"focus": psych_b.get("focus_indicator"), "level": psych_b.get("level"),
                  "cards": [c["card_id"] for c in psych_b.get("cards", [])]},
        },
        "evidence": {"A": ev_a, "B": ev_b},
        "diary": diary,
        "safety_level": safety_level,
        "support_note": diary_bridge.crisis_message(diary["crisis_level"])
        if diary.get("crisis_level", 0) >= 2 else "",
        "narrative": narrative,
        "api_used": not narrative.get("_skipped", False),
        "model": settings.claude_model,
    }
