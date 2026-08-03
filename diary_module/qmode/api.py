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

    return {
        "disposition": {
            "value_order": prof.get("value_order"),
            "coping": prof.get("coping"),
            "risk_tolerance": prof.get("risk_tolerance"),
            "decision_style": prof.get("decision_style"),
            "protect_most": prof.get("protect_most"),
            "summary": prof.get("summary"),
            "mbti": prof.get("mbti"),
            "confidence": prof.get("confidence"),
            "n_answers": prof.get("n_answers"),
        },
        "persona_block": prof.get("jobchange_material"),
        "report": narrative or f"(서사 생략: {nerr})",
        "report_error": nerr,
    }


# ── SQLite 영속화 (내장, 파일 하나 — 비용·설치 0) ────────────────────
DB_PATH = HERE / "qmode_store.db"


def _db():
    con = sqlite3.connect(str(DB_PATH))
    con.execute(
        "CREATE TABLE IF NOT EXISTS users("
        "uid TEXT PRIMARY KEY, profile TEXT, entries TEXT, "
        "persona_block TEXT, disposition TEXT, updated_at TEXT)"
    )
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
        (req.uid, json.dumps(profile, ensure_ascii=False),
         json.dumps([e.model_dump() for e in req.entries], ensure_ascii=False),
         persona_block, json.dumps(disposition, ensure_ascii=False), _now()),
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
    return {"found": True, "persona_block": row[0],
            "disposition": json.loads(row[1]) if row[1] else None, "updated_at": row[2]}


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
    return {"found": True, "profile": json.loads(row[0]) if row[0] else None,
            "entries": json.loads(row[1]) if row[1] else [],
            "persona_block": row[2], "disposition": json.loads(row[3]) if row[3] else None,
            "updated_at": row[4]}


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
    return row[0] if row else None


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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
