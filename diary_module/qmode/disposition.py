# -*- coding: utf-8 -*-
"""disposition.py — 사용자 성향 분석 → 예측 스크립트(시나리오 서사)용 재료.

무엇을 위한 것인가
    예측(평행우주 시나리오 + 서사)을 개인화하려면 두 가지가 필요하다.
      1) 가치 성향 → 시나리오 '내용' 선택 (어느 축을 강조할지)
      2) 전달 스타일 → '전달 방식' (톤·서술 방식)
    이 모듈은 질문형 일기 답변에서 이 둘을 뽑아 예측 스크립트가 쓸 '재료'로 만든다.
    (최종 문장은 만들지 않는다 — 재료 제공형. psych_link/psych_narrative 와 같은 원칙.)

두 출력
    · value_material : questions.json 의 axes 로 축별 답변을 묶은 재료 블록.
                       자유 답변을 수치로 강제 환산하지 않는다(오독 위험). 대신 축별
                       원재료 + 구조적 단서(D4 선의 부러움=가치영역, coping 방향)를 준다.
                       → 예측 LLM 이 이 재료로 축 위치를 판단/서술.  (LLM 수치추출은 후속)
    · delivery_style : 이미 계산되는 언어지표(diary_metrics)만으로 규칙 산출. API 불필요.

기존 diary_module 파일은 수정하지 않는다. session/aggregate 산출물을 입력으로 받는다.

standalone(모델 불필요):
    python diary_module/qmode/disposition.py
"""

from __future__ import annotations

import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
DIARY = HERE.parent
if str(DIARY) not in sys.path:
    sys.path.insert(0, str(DIARY))

from qmode.scheduler import Scheduler          # noqa: E402  (questions.json 의 axes 조회)
from qmode import value_ranking                # noqa: E402  (온보딩 가치순위 초기값)

_SCH = Scheduler()

# 축 키 → (낮은 극, 높은 극) 사람이 읽는 이름
AXIS_POLES = {
    "stability_vs_challenge": ("안정지향", "도전지향"),
    "growth_vs_balance":      ("균형지향", "성장지향"),
    "relation_vs_autonomy":   ("자율지향", "관계지향"),
    "meaning_vs_reward":      ("보상지향", "의미지향"),
}
_AXIS_EXTRACT = "AXIS_EXTRACT"     # D4 — 부러움 내용에서 가치영역 단서


# ── 1) 가치 성향 재료 ────────────────────────────────────────────────
def collect_value_material(sessions):
    """축별로 관련 답변을 묶는다.

    반환: {
      "axes": { axis_key: [ {qid, question, answer}, ... ] },
      "envy_value_hint": [답변, ...],   # D4 '선의'일 때만(악의/unclear 제외 — 제약4)
      "coverage": {axis_key: n},        # 축별 신호 수
      "missing_axes": [축...],          # 신호가 0인 축
    }
    """
    axes = {a: [] for a in AXIS_POLES}
    envy_hint = []
    for s in sessions:
        for it in s.get("items", []):
            if it.get("skipped"):
                continue
            qid = it.get("question_id")
            q = _SCH.by_id.get(qid, {})
            ans = it.get("answer", "")
            for ax in q.get("axes", []):
                if ax == _AXIS_EXTRACT:
                    # D4 — 선의 부러움만 가치영역 단서로 채택(악의=박탈감이라 제외).
                    if it.get("envy") == "benign":
                        envy_hint.append(ans)
                    continue
                if ax in axes:
                    axes[ax].append({"qid": qid, "question": q.get("text"), "answer": ans})
    coverage = {a: len(v) for a, v in axes.items()}
    missing = [a for a, n in coverage.items() if n == 0]
    return {"axes": axes, "envy_value_hint": envy_hint,
            "coverage": coverage, "missing_axes": missing}


# ── 2) 전달 스타일 (지표 규칙, API 불필요) ────────────────────────────
def delivery_style(diary_metrics):
    """누적 diary_metrics → 전달 스타일 플래그 + 서술 가이드.

    diary_metrics: aggregate.accumulate()['diary_metrics'] (None 이면 데이터 부족).
    """
    if not diary_metrics:
        return {"flags": [], "guide": "데이터 부족(답변 5개 미만) — 기본 톤 사용.",
                "signals": {}}

    m = diary_metrics
    cb = m.get("coping_balance", 0.0)
    ins = m.get("insight_ratio", 0.0)
    ed = m.get("emotion_density", 0.0)
    ev = m.get("emotion_valence", 0.0)
    ab = m.get("absolutist_ratio", 0.0)
    fp = m.get("first_person_ratio", 0.0)

    flags = []
    # 대처 지향 — 행동 제안을 어떻게 줄지
    if cb > 0.2:
        flags.append(("행동지향", "구체적인 다음 한 스텝을 제안하면 잘 맞음"))
    elif cb < -0.2:
        flags.append(("회피경향", "압박·과제 대신 '아주 작은 한 걸음'으로 낮춰 제안"))
    # 성찰 성향 — 설명을 반기는지
    if ins > 0.03:
        flags.append(("분석·성찰형", "이유·구조를 짚는 설명을 반김 — 근거를 곁들여도 좋음"))
    elif ins < 0.01 and ed > 0.06:
        flags.append(("감정우선", "설명보다 공감을 먼저 — 해석은 뒤로 미룸"))
    # 정서 부하 — 안아주기 우선 여부
    if ed > 0.08 and ev < -0.3:
        flags.append(("정서부하 높음", "조언보다 감정의 타당성 인정을 먼저, 톤을 낮게"))
    # 인지 왜곡 — 리프레이밍 필요
    if ab > 0.02:
        flags.append(("흑백사고 신호", "단정적 표현 대신 여지를 두는 리프레이밍"))
    # 자기초점 — 거리두기 제안
    if fp > 0.08:
        flags.append(("자기초점 강함", "거리두기(관찰자 시점) 관점 제안이 유효"))

    guide = "; ".join(f"{n}: {d}" for n, d in flags) or "뚜렷한 스타일 신호 없음 — 중립 톤."
    return {"flags": [n for n, _ in flags], "guide": guide,
            "signals": {"coping_balance": cb, "insight_ratio": ins,
                        "emotion_density": ed, "emotion_valence": ev,
                        "absolutist_ratio": ab, "first_person_ratio": fp}}


# ── 통합 블록 (예측 스크립트 주입용) ──────────────────────────────────
def build_disposition_block(sessions, diary_metrics, value_weights=None):
    """성향 재료 → 예측 서사 프롬프트에 붙일 블록.

    '내용 선택'용 가치 재료 + '전달 방식'용 스타일 가이드를 한 덩어리로.
    value_weights : 온보딩 가치순위(value_ranking.axis_weights) 결과. 있으면 이걸
                    '내용 강조 순서'의 초기값으로 앞세우고, 일기 축재료는 보강으로 둔다.
    """
    vm = collect_value_material(sessions)
    ds = delivery_style(diary_metrics)

    lines = ["[사용자 성향 재료 — 시나리오 '내용 선택'과 '전달 방식'에 반영. 단정 금지, 재료로만.]"]
    if value_weights:
        lines += ["", value_ranking.build_block(value_weights),
                  "", "· 가치 성향(일기 기반 보강 — 위 초기값을 갱신):"]
    else:
        lines += ["", "· 가치 성향(내용 강조축):"]
    any_axis = False
    for ax, items in vm["axes"].items():
        if not items:
            continue
        any_axis = True
        lo, hi = AXIS_POLES[ax]
        quotes = " / ".join(f"「{i['answer'][:24]}…」" for i in items[:2])
        lines.append(f"   - {lo}↔{hi} ({len(items)}개 답변): {quotes}")
    if vm["envy_value_hint"]:
        lines.append(f"   - 부러움(선의)→가치영역 단서: "
                     + " / ".join(f"「{a[:24]}…」" for a in vm['envy_value_hint'][:2]))
    if not any_axis and not vm["envy_value_hint"]:
        lines.append("   - (아직 축 신호 부족 — 성향 단정 말 것)")
    if vm["missing_axes"]:
        lines.append(f"   - 신호 없는 축(단정 금지): "
                     + ", ".join(AXIS_POLES[a][0] + "↔" + AXIS_POLES[a][1]
                                 for a in vm["missing_axes"]))

    lines += ["", "· 전달 스타일(톤·서술 방식):", f"   - {ds['guide']}"]
    return "\n".join(lines)


def analyze_disposition(sessions, diary_metrics, value_weights=None):
    """성향 분석 전체 결과(dict).

    value_weights : 온보딩 가치순위 결과(선택). 있으면 내용 강조축의 초기값으로 쓴다.
    """
    return {
        "value_material": collect_value_material(sessions),
        "value_weights": value_weights,
        "delivery_style": delivery_style(diary_metrics),
        "block": build_disposition_block(sessions, diary_metrics, value_weights),
    }


if __name__ == "__main__":
    import json

    # 모델 없이 검증 — session 아이템 형태를 흉내낸 합성 세션.
    sessions = [
        {"date": "2026-07-25", "items": [
            {"question_id": "C2", "answer": "안정적인 지금을 지킬지, 새 팀에 도전할지 계속 저울질했다.",
             "metrics": {"coping_balance": -0.4}},
            {"question_id": "R5", "answer": "성장하고 싶은데 몸이 못 따라간다. 친구라면 쉬라고 했을 것.",
             "metrics": {}},
            {"question_id": "D2", "answer": "혼자 있는 시간을 늘리고 싶고, 불필요한 모임을 줄이고 싶다.",
             "metrics": {}}]},
        {"date": "2026-07-26", "items": [
            {"question_id": "D4", "answer": "독립해서 자기 일 하는 친구가 부러웠다. 나도 저렇게 해보고 싶다.",
             "envy": "benign", "metrics": {}},
            {"question_id": "R4", "answer": "돈보다 의미를 좇는 게 나답다고 느꼈다.",
             "metrics": {}}]},
    ]
    # 누적 diary_metrics 흉내 (전달 스타일 규칙 검증용)
    dm = {"coping_balance": -0.35, "insight_ratio": 0.045, "emotion_density": 0.09,
          "emotion_valence": -0.4, "absolutist_ratio": 0.025, "first_person_ratio": 0.09}

    res = analyze_disposition(sessions, dm)
    print("=== 가치 성향 커버리지 ===")
    print(json.dumps(res["value_material"]["coverage"], ensure_ascii=False))
    print("신호 없는 축:", res["value_material"]["missing_axes"])
    print("부러움(선의) 단서:", res["value_material"]["envy_value_hint"])
    print("\n=== 전달 스타일 ===")
    print("플래그:", res["delivery_style"]["flags"])
    print("가이드:", res["delivery_style"]["guide"])
    print("\n=== 예측 스크립트 주입 블록 ===")
    print(res["block"])

    print("\n=== 데이터 부족(diary_metrics=None) 처리 ===")
    print(delivery_style(None)["guide"])
