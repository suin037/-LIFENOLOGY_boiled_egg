# -*- coding: utf-8 -*-
"""report.py — 질문형 일기(+건강 패널) → 리포트 한 장.

기존 diary_module 파일은 수정하지 않는다. report_one.py 의 조각을 import 해서 쓴다.
    report_one._sparkline / _load_dotenv / NARR_MODEL / NARR_SYSTEM

엮는 재료
    1) qmode.session.analyze_session(...) 결과 세션들 (질문 답변 + 카드 직결 + 안전)
    2) qmode.aggregate 로 누적한 diary_metrics (길이게이트·부러움 분기)
    3) qmode.health_input 패널 + 또래 통계 병치 (선택)
안전 우선: 세션 위기(≥3)나 건강 위기면 리포트 대신 지지 메시지로 하드 분기한다.

구조 렌더(render_report)는 모델·API 없이 결정적으로 돈다 → 오프라인 검증 가능.
서사(Claude)는 선택 — ANTHROPIC_API_KEY 있을 때만 통합, 없으면 자동 생략.

실행(전체 e2e, 실모델):
    python diary_module/qmode/report.py            # 데모 세션 + 건강패널 렌더
    python diary_module/qmode/report.py --no-narrative   # 서사 없이(키 불필요)
"""

from __future__ import annotations

import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
DIARY = HERE.parent
ROOT = DIARY.parent
for p in (str(DIARY), str(ROOT)):
    if p not in sys.path:
        sys.path.insert(0, p)

from qmode import health_input                                  # noqa: E402
from qmode.session import build_diary_metrics, to_prompt_block  # noqa: E402
from qmode.scheduler import Scheduler                           # noqa: E402
import report_one as R1                                         # noqa: E402  (조각 재사용)

_SCH = Scheduler()


# ── 재료 수집 ────────────────────────────────────────────────────────
def _collect_cards(sessions):
    """세션들의 질문 답변에 직결된 카드를 (질문라벨, 카드) 로 모은다(중복 제거).

    위기 분기된 항목(카드 없음)은 건너뛴다.
    """
    seen, out = set(), []
    for s in sessions:
        for it in s.get("items", []):
            if it.get("skipped") or it.get("crisis_message"):
                continue
            for c in it.get("cards", []):
                key = (it.get("question_id"), c["card_id"])
                if key in seen:
                    continue
                seen.add(key)
                out.append((it.get("question_text") or it.get("question_id"), c))
    return out


def _valence_series(sessions):
    """세션 답변들의 emotion_valence 를 시간순으로 → 스파크라인용."""
    vals = []
    for s in sessions:
        for it in s.get("items", []):
            if it.get("skipped"):
                continue
            v = (it.get("metrics") or {}).get("emotion_valence")
            if v is not None:
                vals.append(v)
    return vals


def _session_crisis(sessions):
    return max((s.get("session_crisis", 0) for s in sessions), default=0)


# ── 서사(선택) ───────────────────────────────────────────────────────
def build_narrative_prompt(sessions, agg, health_result, paired):
    lines = [
        "다음은 한 사람이 며칠간 '질문형 일기'에 답한 요약과, (있다면) 건강 자기보고다. "
        "이를 바탕으로 4~6문장의 따뜻하고 현실적인 리포트를 써라. 감정을 먼저 인정하고, "
        "제공된 이론 카드 중 하나의 관점과 행동 제안을 자연스럽게 녹이되 반드시 그 출처를 "
        "문장 안에 짧게 인용하라. 진단 라벨('~장애입니다')은 절대 쓰지 말 것.\n",
        to_prompt_block(sessions, agg),
        "",
        "[이론 근거 카드]",
    ]
    for label, c in _collect_cards(sessions):
        acts = c.get("interventions", [])
        lines.append(f"- 「{(label or '')[:22]}…」→ {c['theory_ko']} · {c['concept_ko']}")
        lines.append(f"    해석: {c.get('summary', '')}")
        if acts:
            lines.append(f"    행동제안: {acts[0]}")
        lines.append(f"    출처: {c.get('source', '')}")
    if health_result and health_result.get("items"):
        lines.append("")
        lines.append(health_result.get("prompt_block", ""))
        # 병치 값이 있으면 또래 수치를 명시적으로 준다.
        peers = [f"{it['id']}: 나={it['level']} / 또래 {it['peers']['value']}{it['peers']['unit']}"
                 for it in (paired or []) if it.get("peers")]
        if peers:
            lines.append("[또래 병치 수치] " + " | ".join(peers))
    return "\n".join(lines)


def generate_narrative(prompt, model=None):
    """Claude 서사 통합. 미설정/실패 시 (None, 사유)."""
    import os
    model = model or R1.NARR_MODEL
    if not os.getenv("ANTHROPIC_API_KEY"):
        return None, "ANTHROPIC_API_KEY 미설정(.env 확인)"
    try:
        from anthropic import Anthropic
    except ImportError:
        return None, "anthropic 미설치"
    try:
        client = Anthropic()
        resp = client.messages.create(
            model=model, max_tokens=500, system=R1.NARR_SYSTEM,
            thinking={"type": "disabled"},
            messages=[{"role": "user", "content": prompt}],
        )
        return "".join(b.text for b in resp.content if b.type == "text").strip(), None
    except Exception as e:      # noqa: BLE001
        return None, f"API 오류: {e}"


# ── 렌더(결정적) ─────────────────────────────────────────────────────
def render_report(sessions, *, agg=None, health_result=None,
                  life_indicators=None, narrative=None, source_label=""):
    agg = agg or build_diary_metrics(sessions)
    L = []
    add = L.append
    add("=" * 62)
    add("　　　　질 문 형 일 기 · 종 합 리 포 트")
    add("=" * 62)
    if source_label:
        add(f"대상: {source_label}")
    dates = sorted({s.get("date") for s in sessions if s.get("date")})
    if dates:
        add(f"기간: {dates[0]} ~ {dates[-1]}  ({len(dates)}일)")
    add("")

    # ── 안전 하드 분기 ──
    scz = _session_crisis(sessions)
    h_safe = (health_result or {}).get("safety", {})
    if scz >= 3 or h_safe.get("level") == "crisis":
        add("⚠️  안전 안내")
        add("-" * 62)
        msg = next((s.get("crisis_message") for s in sessions if s.get("crisis_message")),
                   None) or h_safe.get("message") or ""
        add(msg)
        add("")
        add("오늘은 분석 대신 이걸 먼저 전하고 싶었어요. 혼자 견디지 않으셔도 됩니다.")
        return "\n".join(L)

    # ── 응답 요약 ──
    n_answers = agg.get("n_answers", 0)
    add("■ 응답 요약")
    add("-" * 62)
    add(f"  답변 문항 수 : {n_answers}개"
        + ("" if agg.get("diary_metrics") else f"  (⚠ {agg.get('gate_note')})"))
    add(f"  감정 궤적    : {R1._sparkline(_valence_series(sessions))}")
    dm = agg.get("diary_metrics")
    if dm:
        add(f"  누적 정서극성: {dm.get('emotion_valence')}   "
            f"대처균형: {dm.get('coping_balance')}   통찰: {dm.get('insight_ratio')}")
    add("")

    # ── 문항별 언어 신호 ──
    add("■ 문항별 신호  (답변만 반영 · 질문 텍스트 제외)")
    add("-" * 62)
    for line in to_prompt_block(sessions, agg).splitlines()[1:]:   # 헤더 1줄 제거
        add("  " + line)
    add("")

    # ── 심리 이론 근거(카드 직결) ──
    add("■ 심리 해석 근거  (질문 → 이론카드 직결)")
    add("-" * 62)
    cards = _collect_cards(sessions)
    if not cards:
        add("  (직결된 이론카드 없음)")
    for i, (label, c) in enumerate(cards, 1):
        prov = "  [잠정매핑]" if _is_provisional(label) else ""
        add(f"  {i}) {c['theory_ko']} — {c['concept_ko']}{prov}")
        add(f"     해석: {c.get('summary', '')[:90]}…")
        acts = c.get("interventions", [])
        if acts:
            add(f"     행동 제안: {acts[0]}")
        add(f"     출처: {c.get('source', '')}")
        add("")

    # ── 건강 패널(개인 ↔ 또래 병치) ──
    if health_result and health_result.get("items"):
        paired = health_input.pair_with_baseline(health_result, life_indicators)
        add("■ 건강 자기보고  (나 ↔ 또래 병치)")
        add("-" * 62)
        for it in paired:
            flag = " ⚠" if it["concern"] else ""
            me = f"{it['level']}"
            peer = (f"  |  또래 {it['peers']['value']}{it['peers']['unit']} "
                    f"({it['peers']['group']})" if it.get("peers") else "")
            add(f"  · [{it['dim']}] {it['label']}")
            add(f"      나: {me}{flag}{peer}")
        if health_result.get("clinical_elevated"):
            add("")
            add("  ※ 자주 힘든 날이 이어진 항목이 있어, 또래 비교보다 지지·연결을 우선합니다.")
            if h_safe.get("message"):
                add(f"    {h_safe['message']}")
        add("")

    # ── 통합 서사 ──
    add("■ 통합 리포트" + ("  (Claude 서사)" if narrative else ""))
    add("-" * 62)
    if narrative:
        for para in narrative.split("\n"):
            add("  " + para)
    else:
        add("  (서사 생략 — 위 구조화 재료로 대체)")
    add("")
    add("=" * 62)
    return "\n".join(L)


def _is_provisional(label):
    """라벨(질문 텍스트)로 잠정매핑 여부 추정 — 표시용."""
    from qmode import card_map
    for qid in card_map.PROVISIONAL:
        q = _SCH.by_id.get(qid, {})
        if q.get("text") and q["text"] == label:
            return True
    return False


def build_report(sessions, *, health_result=None, life_indicators=None,
                 agg=None, source_label="", with_narrative=True, model=None):
    """세션(+건강) → 리포트 텍스트. with_narrative=True 이고 키가 있으면 서사 통합."""
    agg = agg or build_diary_metrics(sessions)
    scz = _session_crisis(sessions)
    h_crisis = (health_result or {}).get("safety", {}).get("level") == "crisis"

    narrative = None
    if with_narrative and scz < 3 and not h_crisis:
        R1._load_dotenv()
        paired = (health_input.pair_with_baseline(health_result, life_indicators)
                  if health_result else [])
        prompt = build_narrative_prompt(sessions, agg, health_result, paired)
        narrative, _ = generate_narrative(prompt, model=model)

    return render_report(sessions, agg=agg, health_result=health_result,
                         life_indicators=life_indicators, narrative=narrative,
                         source_label=source_label)


if __name__ == "__main__":
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("--no-narrative", action="store_true", help="Claude 서사 생략")
    ap.add_argument("--ckpt", default=str(ROOT / "model_v3_e6.pt"))
    args = ap.parse_args()

    from infer import DiaryAnalyzer                    # noqa: E402
    from qmode.session import analyze_session          # noqa: E402

    print("모델 로드 중…")
    az = DiaryAnalyzer(ckpt=args.ckpt,
                       taxonomy=str(DIARY / "emotion_taxonomy.json"))

    # 3일치 데모 세션
    days = [
        ("2026-07-25", [
            {"question_id": "C1", "text": "버티는 중."},
            {"question_id": "C2", "text": "회의에서 할 말을 못 하고 삼켰다. "
                                          "옆에서 봤으면 눈치만 보는 사람 같았을 것이다."},
            {"question_id": "R3", "text": "그래도 저녁에 운동을 다녀왔다. "
                                          "몸을 움직이니 기분이 조금 나아졌다."}]),
        ("2026-07-26", [
            {"question_id": "C1", "text": "무거움."},
            {"question_id": "C2", "text": "또 미뤘다. 스스로 한심하게 느껴졌다."},
            {"question_id": "D4", "text": "동기가 승진해서 부러웠다. "
                                          "나도 저렇게 인정받고 싶어서 더 해보고 싶어졌다."}]),
        ("2026-07-27", [
            {"question_id": "C1", "text": "그럭저럭."},
            {"question_id": "C2", "text": "친구에게 먼저 연락했다. 오랜만에 웃었다."},
            {"question_id": "D6", "text": "실수한 나에게, 비슷한 친구였다면 "
                                          "괜찮다고 다독여줬을 것 같다."}]),
    ]
    sessions = [analyze_session(az, d, a, allow_api=False) for d, a in days]

    # 건강 패널 + (backend 가 줄) 또래 통계 흉내
    health = health_input.process_health(
        {"sleep": 2, "stress": 4, "low_mood": 1, "exercise_days": 2,
         "burnout": 4, "loneliness": 3}, is_youth=True)
    life_indicators = [
        {"indicator": "수면장애", "value": 23.1, "unit": "%", "group": "여성 25-29"},
        {"indicator": "스트레스인지율", "value": 31.4, "unit": "%", "group": "여성 25-29"},
        {"indicator": "번아웃 경험률", "value": 41.0, "unit": "%", "group": "청년 25-29"},
    ]

    report = build_report(sessions, health_result=health,
                          life_indicators=life_indicators,
                          source_label="(데모 3일치)",
                          with_narrative=not args.no_narrative)
    print("\n" + report)
