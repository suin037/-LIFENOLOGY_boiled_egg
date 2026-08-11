"""FastAPI 엔트리포인트.

예측 코어는 core.run_prediction 에, A/B 비교는 compare.build_comparison 에 있고
여기선 라우팅만 한다.
  · POST /predict  — 현재의 나 + 선택 1개 → 평행우주 추정(L1~L5)
  · POST /compare  — 현재의 나 + 선택 A/B → 발표 카드용 비교 뷰(3지표×1·3·5·10)
  · POST /simulate — /compare 수치 + RAG 근거 + Claude 서사(전체 파이프라인)
"""

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import httpx
import json
import logging
import sys
import traceback

log = logging.getLogger("parallel-me")

from config import ROOT, settings
from schemas import (
    Profile,
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
from utils.cloudflare_images import generate_pair
from domain_router import route_domains
from models.job_change_candidate import financial_impact, prediction_for_choice

# 삶의 영역(domain) key → 라벨. 프론트 LIFE_DOMAINS 와 1:1 (행동+영역 구조화 입력).
DOMAIN_LABELS = {
    "career": "직업", "education": "교육", "business": "사업", "finance": "재무",
    "health": "건강", "housing": "주거", "relationship": "관계",
    "lifestyle": "생활방식", "long_term_values": "장기 가치",
}


def _domain_labels(keys) -> list[str]:
    """domain key 리스트 → 라벨 리스트(모르는 key 는 그대로)."""
    return [DOMAIN_LABELS.get(k, k) for k in (keys or [])]


# ── 근거 수준(로드맵 항목4) ──────────────────────────────────────────────
# 응답이 '어떤 강도의 근거'인지 프론트에 명시 → 데이터 없는데 숫자 만드는 문제 방지.
EVIDENCE_LABEL = {
    "model": "모델예측",        # 개별·인과 모델 산출(econml 인과효과 / lifelines 생존)
    "group_stat": "집단통계",   # 유사집단 중앙값 궤적(GOMS/YP/KOSIS 등)
    "rag": "RAG설명",           # 수치 없이 심리·이론 근거만
    "insufficient": "데이터부족",  # 뒷받침 데이터 없음 → 숫자 만들지 않음
}

def _has_available(arr) -> bool:
    return any((p or {}).get("available") for p in (arr or []))


def _scenario_evidence(scen: dict, has_rag: bool) -> dict:
    """시나리오를 뒷받침하는 '가장 강한' 근거 수준 + 구성요소."""
    raw = scen.get("raw") or {}
    has_model = raw.get("causal_effect") is not None or raw.get("survival_months") is not None
    has_group = any(_has_available(scen.get(k))
                    for k in ("income", "satisfaction", "growth_potential", "regret"))
    level = ("model" if has_model else "group_stat" if has_group
             else "rag" if has_rag else "insufficient")
    return {"level": level, "label": EVIDENCE_LABEL[level],
            "components": {"model": has_model, "group_stat": has_group, "rag": bool(has_rag)}}


def _coverage_from_routes(routed: dict) -> dict:
    """route_domains 결과 → 수치 그래프 표시 정당성(그래프 가드). 라우터가 근거의 단일 소스."""
    # 정량 근거: career(모델) 또는 실제 지표가 잡힌 group_stat 영역이 하나라도 있어야 정당.
    quant = any(v["evidence"] == "model" or (v["evidence"] == "group_stat" and v["indicators"])
                for v in routed.values())
    return {
        "per_domain": {k: {"label": v["label"], "evidence": v["evidence"]} for k, v in routed.items()},
        "quantitative_ok": quant if routed else True,  # domain 미지정이면 기존대로 허용
        "guard_note": (None if (quant or not routed) else
                       "이 질문의 삶의 영역은 정량 예측 데이터가 없어요 — "
                       "수치 그래프 대신 통계·설명 근거로만 답합니다."),
    }


app = FastAPI(title="parallel-me API")

# jy-model의 성향 분석/저장 API를 같은 백엔드 포트에서 제공한다.
# 선택 의존성 문제로 로딩하지 못해도 기존 예측 API는 계속 기동한다.
try:
    if str(ROOT) not in sys.path:
        sys.path.insert(0, str(ROOT))
    from diary_module.qmode.api import app as qmode_app

    app.mount("/qmode", qmode_app)
except Exception:
    qmode_app = None

# 프론트(Vite 기본 5173) 에서의 호출 허용
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):\d+",  # 로컬 개발/프리뷰 포트 허용
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _simulate_without_artifacts(req, diary, safety_level) -> dict:
    """로컬 모델 파일이 없을 때 RAG+Claude 서사만 제공하는 개발용 폴백."""
    default_indicators = {
        "경제적안정도": 0.5,
        "성장가능성": 0.5,
        "삶의질": 0.5,
    }
    psych_a = get_psych_evidence(
        default_indicators, emotions=req.emotions, decision_type=req.choice_a,
        eligible_indicators=[], basis="fallback_without_prediction"
    )
    psych_b = get_psych_evidence(
        default_indicators, emotions=req.emotions, decision_type=req.choice_b,
        eligible_indicators=[], basis="fallback_without_prediction"
    )
    ev_a = stat_evidence.evidence_for_choice(req.choice_a)
    ev_b = stat_evidence.evidence_for_choice(req.choice_b)
    note_parts = [
        "개발용 폴백: 로컬 예측 모델 아티팩트가 없어 수치 예측은 제외하고, "
        "검색된 통계·심리 근거와 사용자 입력만으로 서사를 작성한다. 숫자를 만들지 말 것."
    ]
    if req.choice_a_detail:
        note_parts.append(f"[사용자가 적은 A의 구체적 상황] {req.choice_a_detail}")
    if req.choice_b_detail:
        note_parts.append(f"[사용자가 적은 B의 구체적 상황] {req.choice_b_detail}")
    diary_line = diary_bridge.diary_context_line(diary)
    if diary_line:
        note_parts.append("[일기 신호] " + diary_line)
    for label, psych in (("A", psych_a), ("B", psych_b)):
        block = build_psych_prompt_block(psych)
        if block:
            note_parts.append(f"[{label} 심리근거]\n{block}")
    scen_a = {"choice": req.choice_a, "coverage": "RAG 서사 미리보기(수치 모델 제외)"}
    scen_b = {"choice": req.choice_b, "coverage": "RAG 서사 미리보기(수치 모델 제외)"}
    narrative = generate_scenarios(
        req.profile.model_dump(), scen_a, scen_b, ev_a, ev_b,
        note="\n\n".join(note_parts), model=settings.claude_model,
    )
    return {
        "profile": req.profile.model_dump(),
        "choice_a": req.choice_a,
        "choice_b": req.choice_b,
        "compare": None,
        "indicators": {"A": default_indicators, "B": default_indicators},
        "evidence": {"A": ev_a, "B": ev_b},
        "diary": diary,
        "safety_level": safety_level,
        "narrative": narrative,
        "api_used": not narrative.get("_skipped", False),
        "model": settings.claude_model,
        "fallback": "missing_prediction_artifacts",
    }


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "model": settings.claude_model}


@app.post("/models/job-change/financial-impact")
def job_change_financial_impact(profile: Profile) -> dict:
    """검증된 집단 방향성과 실험적 개인 조건 추정치를 분리해 반환한다."""
    return financial_impact(profile.model_dump())


@app.post("/visualize")
async def visualize(
    avatar: UploadFile = File(...),
    choice_a: str = Form(...),
    choice_b: str = Form(...),
    narrative_a: str = Form(...),
    narrative_b: str = Form(...),
    visual_a: str = Form("{}"),
    visual_b: str = Form("{}"),
) -> dict:
    """동일 아바타를 참고해 RAG A/B 서사를 2D 장면 두 장으로 만든다."""
    if not narrative_a.strip() or not narrative_b.strip():
        raise HTTPException(400, "A/B narrative is required")
    avatar_png = await avatar.read()
    if len(avatar_png) > 4 * 1024 * 1024:
        raise HTTPException(413, "Avatar image is too large")
    try:
        try:
            scene_a = json.loads(visual_a) if visual_a else {}
            scene_b = json.loads(visual_b) if visual_b else {}
        except json.JSONDecodeError as exc:
            raise HTTPException(400, "Visual scene direction must be valid JSON") from exc
        images = await generate_pair(
            avatar_png, choice_a, choice_b, narrative_a, narrative_b,
            scene_a, scene_b,
        )
    except (httpx.HTTPStatusError, httpx.RequestError) as exc:
        raise HTTPException(
            502, f"Cloudflare returned HTTP {exc.response.status_code}"
        ) from exc
    except Exception as exc:
        raise HTTPException(502, str(exc)[:300]) from exc
    return {"images": images, "model": settings.cloudflare_reference_model}


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest) -> PredictResponse:
    return run_prediction(req)


@app.post("/compare")
def compare(req: CompareRequest) -> dict:
    # 발표 카드용 수치 + 영역 라우팅/근거수준(항목3·4)을 함께 반환.
    # 프론트가 화면 수치를 /compare 에서 읽으므로 여기에도 실어야 표시된다.
    cmp = build_comparison(req).model_dump()
    routed_a = route_domains(getattr(req, "choice_a_domains", None), cmp["profile"])
    routed_b = route_domains(getattr(req, "choice_b_domains", None), cmp["profile"])
    cmp["domain_stats"] = {"A": routed_a, "B": routed_b}
    cmp["domain_coverage"] = {"A": _coverage_from_routes(routed_a),
                              "B": _coverage_from_routes(routed_b)}
    cmp["evidence_levels"] = {
        "A": _scenario_evidence(cmp["scenarios"]["A"], has_rag=False),
        "B": _scenario_evidence(cmp["scenarios"]["B"], has_rag=False),
    }
    validated_predictions = {
        "A": prediction_for_choice(cmp["scenarios"]["A"]["kind"], cmp["profile"]),
        "B": prediction_for_choice(cmp["scenarios"]["B"]["kind"], cmp["profile"]),
    }
    cmp["validated_predictions"] = validated_predictions
    cmp["indicator_evidence"] = {
        "A": indicators_mod.evidence_statuses(cmp["scenarios"]["A"]["kind"], validated_predictions["A"]),
        "B": indicators_mod.evidence_statuses(cmp["scenarios"]["B"]["kind"], validated_predictions["B"]),
    }
    return cmp


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

    try:
        cmp = build_comparison(req).model_dump()
    except FileNotFoundError:
        return _simulate_without_artifacts(req, diary, safety_level)
    except Exception:
        # 아티팩트는 있는데 입력 데이터 스키마가 어긋난 경우(예: 패널 컬럼 누락).
        # 500 으로 죽이면 프론트가 원인을 알 수 없으므로 서사 폴백으로 내려가되,
        # 조용히 넘어가지 않도록 서버 로그에는 전체 스택을 남긴다.
        log.error("build_comparison 실패 — 서사 폴백으로 전환\n%s", traceback.format_exc())
        return _simulate_without_artifacts(req, diary, safety_level)
    scen_a = cmp["scenarios"]["A"]
    scen_b = cmp["scenarios"]["B"]
    baseline = getattr(req.profile, "monthly_wage", None)

    # 1) 3지표 산출(엔진 → 0~1). 요청 override 가 있으면 그걸 사용.
    ind_a = req.indicator_scores or indicators_mod.compute_indicators(scen_a, baseline)
    ind_b = req.indicator_scores or indicators_mod.compute_indicators(scen_b, baseline)
    validated_a = prediction_for_choice(scen_a["kind"], cmp["profile"])
    validated_b = prediction_for_choice(scen_b["kind"], cmp["profile"])
    status_a = indicators_mod.evidence_statuses(scen_a["kind"], validated_a, req.indicator_scores)
    status_b = indicators_mod.evidence_statuses(scen_b["kind"], validated_b, req.indicator_scores)

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
    psych_scores_a = indicators_mod.psych_eligible_scores(status_a)
    psych_scores_b = indicators_mod.psych_eligible_scores(status_b)
    psych_basis = "user_provided_state" if req.indicator_scores else "validated_model"
    psych_a = get_psych_evidence(
        psych_scores_a, emotions=req.emotions, decision_type=req.choice_a,
        focus_override=focus_a if focus_a in psych_scores_a else None,
        eligible_indicators=psych_scores_a.keys(), basis=psych_basis,
    )
    psych_b = get_psych_evidence(
        psych_scores_b, emotions=req.emotions, decision_type=req.choice_b,
        focus_override=focus_b if focus_b in psych_scores_b else None,
        eligible_indicators=psych_scores_b.keys(), basis=psych_basis,
    )

    # 3) 통계 근거(숫자 근거) — 선택지별
    ev_a = stat_evidence.evidence_for_choice(req.choice_a)
    ev_b = stat_evidence.evidence_for_choice(req.choice_b)

    # 4) 서사 컨텍스트(note): 일기신호 + 심리카드 근거블록(A/B)
    note = cmp.get("note", "")
    if req.choice_a_detail:
        note += f"\n[사용자가 적은 A의 구체적 상황] {req.choice_a_detail}"
    if req.choice_b_detail:
        note += f"\n[사용자가 적은 B의 구체적 상황] {req.choice_b_detail}"
    # 삶의 영역(domain) 컨텍스트 — '행동+영역' 구조화 입력의 영역 축을 서사에 알린다.
    _dl = _domain_labels(req.choice_a_domains) + _domain_labels(req.choice_b_domains)
    if _dl:
        note += "\n[관련 삶의 영역] " + " · ".join(dict.fromkeys(_dl))
    dctx = diary_bridge.diary_context_line(diary)
    if dctx:
        note += "  /  [일기 신호] " + dctx
    blk_a = build_psych_prompt_block(psych_a)
    blk_b = build_psych_prompt_block(psych_b)
    if blk_a:
        note += f"\n\n[A={req.choice_a} 심리근거]\n" + blk_a[:900]
    if blk_b:
        note += f"\n\n[B={req.choice_b} 심리근거]\n" + blk_b[:900]
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

    # 영역별 데이터 라우팅(항목3) — 각 선택의 삶의 영역 → 실측 집단통계 지표
    routed_a = route_domains(req.choice_a_domains, cmp["profile"])
    routed_b = route_domains(req.choice_b_domains, cmp["profile"])

    return {
        "profile": cmp["profile"],
        "choice_a": cmp["choice_a"],
        "choice_b": cmp["choice_b"],
        "snapshots": cmp.get("snapshots"),
        "compare": cmp,
        "indicators": {"A": ind_a, "B": ind_b},
        "indicator_evidence": {"A": status_a, "B": status_b},
        "validated_predictions": {
            "A": validated_a,
            "B": validated_b,
        },
        "personalization": pz,
        "psych": {
            "A": {"focus": psych_a.get("focus_indicator"), "level": psych_a.get("level"),
                  "cards": [c["card_id"] for c in psych_a.get("cards", [])]},
            "B": {"focus": psych_b.get("focus_indicator"), "level": psych_b.get("level"),
                  "cards": [c["card_id"] for c in psych_b.get("cards", [])]},
        },
        "evidence": {"A": ev_a, "B": ev_b},
        # 근거 수준(항목4): 시나리오별 4단계 라벨 + domain 그래프 가드
        "evidence_levels": {
            "A": _scenario_evidence(cmp["scenarios"]["A"], bool(psych_a.get("cards"))),
            "B": _scenario_evidence(cmp["scenarios"]["B"], bool(psych_b.get("cards"))),
        },
        # 영역별 데이터 라우팅(항목3): 각 선택의 삶의 영역 → 실측 집단통계 지표
        "domain_stats": {"A": routed_a, "B": routed_b},
        "domain_coverage": {
            "A": _coverage_from_routes(routed_a),
            "B": _coverage_from_routes(routed_b),
        },
        "diary": diary,
        "safety_level": safety_level,
        "support_note": diary_bridge.crisis_message(diary["crisis_level"])
        if diary.get("crisis_level", 0) >= 2 else "",
        "narrative": narrative,
        "api_used": not narrative.get("_skipped", False),
        "model": settings.claude_model,
    }
