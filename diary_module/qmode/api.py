# -*- coding: utf-8 -*-
"""api.py — 프론트 ↔ 내 성향모델 연결용 가벼운 로컬 API.

통합본 backend(KNN/EconML/lifelines/RAG)는 무거워 로컬 기동이 부담이라,
여기선 '내 몫'(성향 파악 + 주간 리포트)만 노출한다. 프론트가 일기/체크인을 보내면
DispositionModel + report.py 를 실제로 태워 결과를 돌려준다.

실행:
    uvicorn qmode.api:app --port 8000        (diary_module 을 cwd/PYTHONPATH 로)
  또는
    python diary_module/qmode/api.py

프론트(vite:5173)에서 POST http://localhost:8000/analyze
"""

from __future__ import annotations

import json
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

HERE = Path(__file__).resolve().parent
DIARY = HERE.parent
ROOT = DIARY.parent
for p in (str(DIARY), str(ROOT)):
    if p not in sys.path:
        sys.path.insert(0, p)

from fastapi import FastAPI                              # noqa: E402
from fastapi.middleware.cors import CORSMiddleware       # noqa: E402
from pydantic import BaseModel                           # noqa: E402

import metrics                                           # noqa: E402
from qmode.disposition_model import DispositionModel     # noqa: E402
from qmode import report as RPT, interests, card_map     # noqa: E402
from qmode.session import build_diary_metrics            # noqa: E402
from qmode.aggregate import classify_envy                # noqa: E402
from qmode import crypto_at_rest as CR                   # noqa: E402
import report_one as R1                                  # noqa: E402

app = FastAPI(title="qmode disposition API")
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"],
)
_MODEL = DispositionModel()


class Entry(BaseModel):
    date: Optional[str] = None
    text: Optional[str] = ""
    answers: Optional[dict] = None          # {qid: 답변}
    mood: Optional[int] = None
    energy: Optional[int] = None
    competency: Optional[str] = None
    emotion: Optional[str] = None


class AnalyzeReq(BaseModel):
    ranked_cards: Optional[list] = None      # 온보딩 가치순위(id 또는 label)
    mbti: Optional[str] = None
    entries: list[Entry] = []
    uid: Optional[str] = None                # 있으면 결과를 주별로 DB 저장
    week_key: Optional[str] = None           # 주 식별자(예: 그 주 월요일 날짜)


def _entries_to_sessions(entries):
    """프론트 일기 entries → qmode sessions(질문답변+자유칸, metrics 포함)."""
    sessions = []
    for e in entries:
        items = []
        for qid, ans in (e.answers or {}).items():
            if not (ans or "").strip():
                continue
            verdict = classify_envy(ans) if qid == "D4" else None
            item = {"question_id": qid, "answer": ans,
                    "metrics": metrics.analyze_text(ans),
                    "cards": card_map.load_cards_for(qid, verdict)}  # 질문 직결 이론카드
            if qid == "D4":
                item["envy"] = verdict
            items.append(item)
        free = None
        if (e.text or "").strip():
            free = {"question_id": None, "source": "free", "answer": e.text,
                    "metrics": metrics.analyze_text(e.text)}
        # 체크인은 세션 메타로 (리포트 기분흐름·컨텍스트용)
        sessions.append({"date": e.date, "items": items, "free": free,
                         "checkin": {"mood": e.mood, "energy": e.energy,
                                     "competency": e.competency, "emotion": e.emotion}})
    return sessions


def _psych_block(entries):
    """체크인 감정/기분 → 심리 이론카드 근거 블록(minjub RAG, 모델 없이).
    report 프롬프트에 주입되면 리포트가 그 이론 관점으로 써진다(출처는 NARR_SYSTEM이 숨김)."""
    try:
        import sys as _sys
        _sys.path.insert(0, str(DIARY))
        from psych_link import link_psych          # noqa: E402
    except Exception:
        return None
    from collections import Counter
    emos = [e.emotion for e in entries if e.emotion]
    moods = [e.mood for e in entries if e.mood]
    avg = (sum(moods) / len(moods)) if moods else 3
    NEG = {"지침": "불안", "답답함": "분노"}
    POS = {"성취감": "기쁨", "설렘": "기쁨"}
    if emos:
        top = Counter(emos).most_common(1)[0][0]
        coarse = NEG.get(top) or POS.get(top) or ("불안" if avg < 3 else "기쁨")
    else:
        coarse = "불안" if avg < 3 else ("슬픔" if avg < 3.5 else "기쁨")
    text = " ".join((e.text or "") for e in entries[-5:])
    diary = {"coarse": coarse, "display": coarse,
             "dominant": {"coarse": coarse}, "coarse_dist": {coarse: 0.8}}
    try:
        return link_psych(diary, text).get("prompt_block")
    except Exception:
        return None


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/analyze")
def analyze(req: AnalyzeReq):
    sessions = _entries_to_sessions(req.entries)

    # 성향 (온보딩+MBTI prior + 일기 LLM 갱신)
    prof = _MODEL.analyze(req.ranked_cards, sessions, mbti=req.mbti,
                          span_label="(웹 요청)")

    # 주간 리포트 서사 (report.py)
    narrative, nerr = None, None
    try:
        R1._load_dotenv()
        agg = build_diary_metrics(sessions)
        iblock = interests.build_block(interests.collect(sessions))
        prompt = RPT.build_narrative_prompt(sessions, agg, None,
                                            prof.get("jobchange_material"), iblock)
        pblock = _psych_block(req.entries)   # minjub 심리 RAG 근거(출처는 본문에 안 씀)
        if pblock:
            prompt += "\n\n" + pblock
        narrative, nerr = RPT.generate_narrative(prompt)
    except Exception as e:      # noqa: BLE001
        nerr = str(e)

    disposition = {
        "value_order": prof.get("value_order"),
        "coping": prof.get("coping"),
        "risk_tolerance": prof.get("risk_tolerance"),
        "decision_style": prof.get("decision_style"),
        "protect_most": prof.get("protect_most"),
        "summary": prof.get("summary"),
        "mbti": prof.get("mbti"),
        "confidence": prof.get("confidence"),
        "n_answers": prof.get("n_answers"),
    }
    report = narrative or f"(서사 생략: {nerr})"

    # 내일 할 거리 — 이번 주 답변에 매칭된 심리 이론카드의 행동 제안(intervention).
    # 성향 수치가 아니라 '해볼 것' 이라 사용자 화면에 바로 보여줄 수 있다.
    actions = []
    try:
        seen = set()
        for _, c in RPT._collect_cards(sessions):
            for iv in (c.get("interventions") or []):
                iv = (iv or "").strip()
                if iv and iv not in seen:
                    seen.add(iv)
                    actions.append(iv)
    except Exception:      # noqa: BLE001
        actions = []
    actions = actions[:3]

    # 주별 저장 — 지난 주는 이 저장본을 조회(GET /report). 이번 주만 실시간 재분석.
    if req.uid and req.week_key:
        con = _db()
        con.execute(
            "INSERT OR REPLACE INTO week_reports"
            "(uid, week_key, report, disposition, actions, updated_at)"
            " VALUES(?,?,?,?,?,?)",
            (req.uid, req.week_key, CR.enc_field(report), CR.enc_json(disposition),
             CR.enc_json(actions), _now()),  # 민감 컬럼 암호화 저장(at rest)
        )
        con.commit(); con.close()

    return {"disposition": disposition, "persona_block": prof.get("jobchange_material"),
            "report": report, "actions": actions, "report_error": nerr,
            "saved": bool(req.uid and req.week_key)}


# ── SQLite 영속화 (내장, 파일 하나 — 비용·설치 0) ────────────────────
DB_PATH = HERE / "qmode_store.db"


def _db():
    con = sqlite3.connect(str(DB_PATH))
    con.execute(
        "CREATE TABLE IF NOT EXISTS users("
        "uid TEXT PRIMARY KEY, profile TEXT, entries TEXT, "
        "persona_block TEXT, disposition TEXT, updated_at TEXT)"
    )
    con.execute(
        "CREATE TABLE IF NOT EXISTS week_reports("
        "uid TEXT, week_key TEXT, report TEXT, disposition TEXT, updated_at TEXT, "
        "PRIMARY KEY(uid, week_key))"
    )
    # 내일 할 거리(actions)는 나중에 추가된 컬럼 — 기존 DB 호환 위해 마이그레이션.
    try:
        con.execute("ALTER TABLE week_reports ADD COLUMN actions TEXT")
    except sqlite3.OperationalError:
        pass  # 이미 있음
    return con


def _now():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


class SaveReq(BaseModel):
    uid: str
    ranked_cards: Optional[list] = None
    mbti: Optional[str] = None
    profile: Optional[dict] = None       # age/occupation/income 등(선택)
    entries: list[Entry] = []


@app.post("/save")
def save(req: SaveReq):
    """온보딩+일기 저장 + persona_block 계산해 함께 저장(예측에 넘길 재료)."""
    sessions = _entries_to_sessions(req.entries)
    prof = _MODEL.analyze(req.ranked_cards, sessions, mbti=req.mbti, span_label="(저장)")
    persona_block = prof.get("jobchange_material")
    # 일기 신호(직무불만·이직고민 등)를 서버에서 계산해 persona_block에 얹는다
    # → /scenario 이직 서사가 신호를 반영(새 LLM 호출 없음, 수치 불변).
    try:
        from qmode import diary_signals as DS
        _sig = DS.compute_signals([e.model_dump() for e in req.entries])
        _blk = DS.signal_block(_sig)
        if _blk:
            persona_block = (persona_block + "\n\n" + _blk) if persona_block else _blk
    except Exception:
        pass
    disposition = {
        "coping": prof.get("coping"), "risk_tolerance": prof.get("risk_tolerance"),
        "decision_style": prof.get("decision_style"), "value_order": prof.get("value_order"),
        "summary": prof.get("summary"), "confidence": prof.get("confidence"),
        "n_answers": prof.get("n_answers"), "mbti": prof.get("mbti"),
    }
    profile = {"ranked_cards": req.ranked_cards, "mbti": req.mbti, **(req.profile or {})}
    con = _db()
    con.execute(
        "INSERT OR REPLACE INTO users(uid, profile, entries, persona_block, disposition, updated_at)"
        " VALUES(?,?,?,?,?,?)",
        # 원문 최소화: 일기 entries는 저장하지 않는다(None). 파생물만 남기고 암호화(at rest).
        (req.uid, CR.enc_json(profile), None,
         CR.enc_field(persona_block), CR.enc_json(disposition), _now()),
    )
    con.commit(); con.close()
    return {"ok": True, "uid": req.uid, "persona_block": persona_block, "disposition": disposition}


@app.get("/persona/{uid}")
def get_persona(uid: str):
    """저장된 persona_block(예측 서사에 넘길 재료) 꺼내기."""
    con = _db()
    row = con.execute(
        "SELECT persona_block, disposition, updated_at FROM users WHERE uid=?", (uid,)
    ).fetchone()
    con.close()
    if not row:
        return {"found": False}
    return {"found": True, "persona_block": CR.dec_field(row[0]),
            "disposition": CR.dec_json(row[1]) if row[1] else None, "updated_at": row[2]}


@app.get("/users/{uid}")
def get_user(uid: str):
    con = _db()
    row = con.execute(
        "SELECT profile, entries, persona_block, disposition, updated_at FROM users WHERE uid=?",
        (uid,),
    ).fetchone()
    con.close()
    if not row:
        return {"found": False}
    return {"found": True, "profile": CR.dec_json(row[0]) if row[0] else None,
            "entries": CR.dec_json(row[1]) if row[1] else [],  # 원문 미저장 → 보통 []
            "persona_block": CR.dec_field(row[2]), "disposition": CR.dec_json(row[3]) if row[3] else None,
            "updated_at": row[4]}


@app.get("/report/{uid}/{week_key}")
def get_week_report(uid: str, week_key: str):
    """저장된 주간 리포트 조회 — 지난 주는 실시간 재분석 대신 이 저장본을 본다."""
    con = _db()
    row = con.execute(
        "SELECT report, disposition, updated_at, actions FROM week_reports"
        " WHERE uid=? AND week_key=?",
        (uid, week_key),
    ).fetchone()
    con.close()
    if not row:
        return {"found": False}
    return {"found": True, "report": CR.dec_field(row[0]),
            "disposition": CR.dec_json(row[1]) if row[1] else None,
            "updated_at": row[2],
            "actions": CR.dec_json(row[3]) if row[3] else []}


@app.delete("/reports/{uid}")
def clear_week_reports(uid: str):
    """저장된 주간 리포트 전체 삭제(uid 기준). 데모 재시드 시 옛 리포트가 남지 않게."""
    con = _db()
    n = con.execute("DELETE FROM week_reports WHERE uid=?", (uid,)).rowcount
    con.commit()
    con.close()
    return {"deleted": n}


# ── 예측 시나리오 서사 (persona_block 반영) ──────────────────────────
class ScenarioReq(BaseModel):
    uid: Optional[str] = None            # 저장된 persona 사용
    persona_block: Optional[str] = None  # 직접 전달도 가능(우선)
    choice: str = "이직"
    expected_wage: float = 0
    causal_effect: float = 0
    survival_months: float = 0
    age: Optional[int] = None
    major: Optional[str] = None


def _fetch_persona(uid):
    con = _db()
    row = con.execute("SELECT persona_block FROM users WHERE uid=?", (uid,)).fetchone()
    con.close()
    return CR.dec_field(row[0]) if row else None


@app.post("/scenario")
def scenario(req: ScenarioReq):
    """예측 수치 + persona_block → 성향 반영된 이직 서사. (suin generate_narrative 로컬판)"""
    import os
    pb = req.persona_block or (_fetch_persona(req.uid) if req.uid else None)
    prompt = (
        f"한 사용자가 '{req.choice}'라는 진로를 택한 평행우주를 상상합니다.\n"
        f"- 나이: {req.age or '-'}, 전공: {req.major or '-'}\n"
        f"- 예상 월급: {req.expected_wage:,.0f}만원\n"
        f"- 그 선택의 순수효과: {req.causal_effect:+,.1f}만원\n"
        f"- 예상 재직기간: {req.survival_months:.0f}개월\n\n"
        "이 데이터를 따뜻하면서도 현실적인 3~4문장으로 풀어 설명해줘."
    )
    if pb:
        prompt += (
            f"\n\n{pb}\n지시: 위 '지표 강조 순서'가 높은 것부터 서술하고, '리스크 프레임'과 "
            "'전달 스타일'에 맞춰 톤을 잡아라. 수치는 절대 바꾸지 말고, 불리한 축도 "
            "숨기지 마라(순서·톤만 조정)."
        )
    R1._load_dotenv()
    if not os.getenv("ANTHROPIC_API_KEY"):
        return {"narrative": "(ANTHROPIC_API_KEY 미설정)", "persona_used": bool(pb)}
    try:
        from anthropic import Anthropic
        resp = Anthropic().messages.create(
            model="claude-sonnet-5", max_tokens=700, thinking={"type": "disabled"},
            messages=[{"role": "user", "content": prompt}],
        )
        narr = "".join(b.text for b in resp.content if b.type == "text").strip()
        return {"narrative": narr, "persona_used": bool(pb)}
    except Exception as e:      # noqa: BLE001
        return {"narrative": f"(서사 생성 오류: {e})", "persona_used": bool(pb)}


# ── 마스코트 대화 — 가이드별 역할(노바:일상 되묻기 / 코스모:힘든점·위로 / 루미:건강) ──
class ChatReq(BaseModel):
    messages: list = []                  # [{role:"user"|"bot", text}]
    persona: str = "lumi"                # nova / cosmo / lumi
    context: Optional[dict] = None       # {recent:[{date,emotion,text}], hardStreak:int}


_CHAT_ROLE = {
    "nova": "너는 '노바', 일상을 함께 돌아보는 다정한 친구야. 사용자의 최근 기록에서 있었던 사건 하나를 골라 '그거 그 뒤로 어떻게 됐어요?'처럼 자연스럽게 되물어. 가볍고 따뜻하게.",
    "cosmo": "너는 '코스모', 마음을 살피는 차분한 친구야. 요즘 힘들었던 점이 있었는지 부드럽게 물어. 최근에 힘든 기록이 연달아 있으면, 질문보다 먼저 진심으로 공감하고 위로부터 건네.",
    "lumi": "너는 '루미', 몸 상태를 챙기는 친구야. 수면·활동·컨디션을 가볍게 물어봐.",
}


@app.post("/chat")
def chat(req: ChatReq):
    """가이드 페르소나 + 최근 기록으로 한 턴 대화. 키 없으면 reply=None(프론트가 고정질문 폴백)."""
    import os
    R1._load_dotenv()
    if not os.getenv("ANTHROPIC_API_KEY"):
        return {"reply": None, "reason": "no_api_key"}
    role = _CHAT_ROLE.get(req.persona, _CHAT_ROLE["lumi"])
    ctx = req.context or {}
    recent = ctx.get("recent") or []
    hard = int(ctx.get("hardStreak") or 0)
    ctx_lines = "\n".join(
        f"- {r.get('date','')}: {(r.get('emotion') or '')} · {r.get('text','')}"
        for r in recent[:5]
    ) or "(최근 기록 없음)"
    convo = "\n".join(
        f"{'나' if m.get('role') == 'user' else '너'}: {m.get('text', '')}"
        for m in req.messages[-8:]
    )
    extra = ""
    if req.persona == "cosmo" and hard >= 2:
        extra = f"\n[중요] 최근 힘든 기록이 {hard}번 연속이야. 이번엔 질문 말고, 먼저 짧게 공감·위로 한마디만 건네."
    system = (
        f"{role}\n\n한국어로 1~2문장, 담백하게. 과한 리액션·이모지 남발 금지. "
        f"자연스러운 반말 톤 유지. 진단·조언 강요 금지.{extra}"
    )
    user = (
        f"[사용자 최근 기록]\n{ctx_lines}\n\n[지금까지 대화]\n{convo}\n\n"
        "다음에 네가 건넬 말 딱 한 마디:"
    )
    try:
        from anthropic import Anthropic
        resp = Anthropic().messages.create(
            model="claude-sonnet-5", max_tokens=200, thinking={"type": "disabled"},
            system=system, messages=[{"role": "user", "content": user}],
        )
        reply = "".join(b.text for b in resp.content if b.type == "text").strip()
        kind = "comfort" if (req.persona == "cosmo" and hard >= 2) else "followup"
        return {"reply": reply or None, "kind": kind}
    except Exception as e:      # noqa: BLE001
        return {"reply": None, "reason": f"error: {e}"}


# ── 제3의 제안 — A/B 외에 성향·일기신호에 근거한 '생각 못한 제3의 길' ──────
class ThirdPathReq(BaseModel):
    choice_a: str = "이직"
    choice_b: str = "유지"
    persona_block: Optional[str] = None
    uid: Optional[str] = None
    signal_block: Optional[str] = None   # 프론트가 넘긴 신호 블록(있으면 우선)
    entries: list[Entry] = []            # 없으면 이걸로 서버가 신호 계산
    age: Optional[int] = None
    major: Optional[str] = None


@app.post("/third-path")
def third_path(req: ThirdPathReq):
    """A/B 두 선택 외의 제3의 길을 성향·일기신호에 근거해 1개 제안. 재구성 제안(수치 예측 아님)."""
    import os
    pb = req.persona_block or (_fetch_persona(req.uid) if req.uid else None)
    sig_block = req.signal_block
    if not sig_block and req.entries:
        from qmode import diary_signals as DS
        sig_block = DS.signal_block(DS.compute_signals([e.model_dump() for e in req.entries]))
    prompt = (
        f"사용자가 두 갈림길을 두고 고민 중입니다: A) {req.choice_a}  vs  B) {req.choice_b}.\n"
        f"- 나이 {req.age or '-'} / 전공·직군 {req.major or '-'}\n"
        + (f"\n{pb}\n" if pb else "")
        + (f"\n{sig_block}\n" if sig_block else "")
        + "\nA·B는 사용자가 '이미' 떠올린 프레임이야. 네 역할은 그 프레임 자체를 의심해서, "
        "사용자가 미처 못 본 지점을 찔러주는 거야.\n"
        "규칙:\n"
        "1. 위 성향·기록 신호에서 사용자가 스스로 못 봤을 '숨은 전제'나 '진짜 고민'을 하나 짚어라 "
        "(예: 'A/B 둘 다 사실은 같은 두려움에서 나온 선택'처럼 관점을 뒤집기).\n"
        "2. 그 전제를 흔드는, A도 B도 아닌 제3의 길을 구체적으로 제안하라.\n"
        "3. 뻔한 절충(둘 다 조금씩·천천히)은 금지. 관점을 바꾸는 제안이어야 한다.\n"
        "4. 수치·통계·확률 지어내지 말 것. 오글거리는 미사여구·비유 금지, 담백하게.\n"
        "형식: 첫 줄 = 예상 못한 지점을 찌르는 통찰 한 문장(제목, 기호 없이). "
        "다음 줄부터 = 제3의 길 제안 + 근거 2~3문장."
    )
    R1._load_dotenv()
    if not os.getenv("ANTHROPIC_API_KEY"):
        return {"ok": False, "reason": "no_api_key", "persona_used": bool(pb), "signal_used": bool(sig_block)}
    try:
        from anthropic import Anthropic
        resp = Anthropic().messages.create(
            model="claude-sonnet-5", max_tokens=500, thinking={"type": "disabled"},
            messages=[{"role": "user", "content": prompt}],
        )
        txt = "".join(b.text for b in resp.content if b.type == "text").strip()
        lines = [ln.strip() for ln in txt.split("\n") if ln.strip()]
        title = lines[0] if lines else txt
        rationale = " ".join(lines[1:]).strip() if len(lines) > 1 else ""
        return {"ok": True, "title": title, "rationale": rationale,
                "persona_used": bool(pb), "signal_used": bool(sig_block)}
    except Exception as e:      # noqa: BLE001
        return {"ok": False, "reason": str(e)}


# ── 일기 신호 (직무불만·이직고민 등) — 예측 서사 재료 & 검증용 ──────────
class SignalsReq(BaseModel):
    entries: list[Entry] = []
    window_days: int = 28


@app.post("/signals")
def diary_signals_endpoint(req: SignalsReq):
    """entries → 이직 관련 신호(서버 계산). /save 가 persona_block에 얹는 것과 동일 로직."""
    from qmode import diary_signals as DS
    sig = DS.compute_signals([e.model_dump() for e in req.entries], window_days=req.window_days)
    return {**sig, "block": DS.signal_block(sig)}


# ── 도메인(행성) 자동 태깅 — 일기 저장 시 영역 분류 ────────────────────
class TagReq(BaseModel):
    text: str


@app.post("/tag")
def tag_domain(req: TagReq):
    """일기 텍스트 → 인생 영역(관계/경제/건강/성장/일상). 행성 렌즈가 이 태그로 필터."""
    from qmode import domain_tag as DT
    return DT.tag(req.text)


# ── 마스코트 대화형 일기 ────────────────────────────────────────────────
class ChatMsg(BaseModel):
    role: str            # "user" | "bot"
    text: str


class ChatReq(BaseModel):
    messages: list[ChatMsg] = []
    persona: Optional[str] = "lumi"   # lumi(공감)/cosmo(분석)/nova(재미)


@app.post("/chat")
def chat_turn(req: ChatReq):
    """대화 한 턴 → 마스코트 답변."""
    from qmode import chatbot as CB
    msgs = [m.model_dump() for m in req.messages]
    return {"reply": CB.chat(msgs, persona=req.persona or "lumi")}


@app.post("/diary/compose")
def diary_compose(req: ChatReq):
    """대화 전체 → 1인칭 일기 + 기분 + 감정 + 영역(domains). 체크인 저장용."""
    from qmode import chatbot as CB
    msgs = [m.model_dump() for m in req.messages]
    return CB.compose(msgs)


@app.get("/chat/opener")
def chat_opener(persona: str = "lumi"):
    from qmode import chatbot as CB
    return {"opener": CB.opener(persona), "persona": persona}


# ── 감정 모델(로컬 파인튜닝 klue/roberta) — 감정 미선택 시 일기에서 추론 ──
_EMO = None
_MOOD_BY_EMO = {"기쁨": 5, "당황": 3, "분노": 2, "불안": 2, "슬픔": 2, "상처": 2}


def _emotion_analyzer():
    global _EMO
    if _EMO is None:
        try:
            import infer  # diary_module/infer.py (sys.path 우선)
            _EMO = infer.DiaryAnalyzer(
                ckpt=str(ROOT / "model_v3_e6.pt"),
                taxonomy=str(DIARY / "emotion_taxonomy.json"))
        except Exception:
            _EMO = False   # 체크포인트/deps 없음 → 폴백 신호
    return _EMO or None


class EmotionReq(BaseModel):
    text: str


@app.post("/emotion")
def emotion_infer(req: EmotionReq):
    """일기 텍스트 → 감정모델 추론(감정·기분·위기). 감정 미선택 시 폴백용.
    체크포인트/deps 없으면 {ok:False} → 프론트가 LLM 폴백으로 강등."""
    an = _emotion_analyzer()
    if an is None or not (req.text or "").strip():
        return {"ok": False}
    try:
        r = an.analyze(req.text)
        dom = r.get("dominant") or {}
        return {"ok": True, "emotion": dom.get("display") or dom.get("coarse"),
                "fine": dom.get("fine"),
                "mood": _MOOD_BY_EMO.get(dom.get("coarse"), 3),
                "crisis_level": r.get("crisis_level", 0),
                "block": bool(r.get("block_report"))}
    except Exception:
        return {"ok": False}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
