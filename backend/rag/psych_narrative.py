"""
재료 제공형 심리 RAG — 검색된 이론카드 → '심리 해석 + 근거' 재료로 가공.

이 모듈은 최종 문장을 만들지 않는다(재료 제공형). 레이어2의 3지표 점수 + 감정
키워드로 관련 이론카드를 retrieve하고, 레이어3 메인 내러티브 생성기가 프롬프트에
그대로 주입할 수 있는 '근거 블록' + '행동 제안 후보'로 정리해 반환한다.
최종 서사는 utils/claude_api.py::generate_narrative 가 통합해서 낸다.

LLM을 호출하지 않는다(순수 검색 + 텍스트 가공). 비용·지연 없음.
"""

from rag.psych_retriever import retrieve, bucket

# 낮을수록 개입이 필요한 지표. 가장 낮은 지표를 심리검색 초점으로 삼는다.
_INDICATOR_ORDER = ["경제적안정도", "성장가능성", "삶의질"]
_NORMALIZE = {"경제적_안정도": "경제적안정도", "성장_가능성": "성장가능성", "삶의_질": "삶의질"}


def select_focus(indicator_scores):
    """3지표 점수 dict → (초점지표, 점수). 가장 낮은(=가장 개입 필요한) 지표 선택.

    indicator_scores 예: {"경제적안정도": 0.6, "성장가능성": 0.3, "삶의질": 0.18}
    언더스코어 표기 키도 허용.
    """
    if not indicator_scores:
        return None, None
    norm = {_NORMALIZE.get(k, k): v for k, v in indicator_scores.items()}
    focus = min(norm, key=norm.get)
    return focus, norm[focus]


def get_psych_evidence(indicator_scores, emotions=None, decision_type=None, k=3):
    """레이어2 신호 → 관련 이론카드 top-k(재료). 카드가 없으면 빈 리스트."""
    focus, score = select_focus(indicator_scores)
    if focus is None:
        return {"focus_indicator": None, "level": None, "cards": []}
    level = bucket(score, focus)
    cards = retrieve(indicator=focus, score=score, emotions=emotions,
                     decision_type=decision_type, k=k)
    return {"focus_indicator": focus, "score": score, "level": level, "cards": cards}


def build_psych_prompt_block(evidence):
    """근거 카드 → 레이어3 프롬프트에 주입할 한국어 텍스트 블록.

    최종 문장이 아니라 '재료'다. 메인 생성기가 이 블록을 근거로 서사를 통합한다.
    출처를 반드시 인용하도록 지시문을 포함한다.
    """
    cards = evidence.get("cards", [])
    if not cards:
        return ""

    focus = evidence.get("focus_indicator")
    level = evidence.get("level")
    lines = [
        "[심리학 근거 카드]",
        f"(초점 지표: {focus}={level}. 아래 이론을 근거로 심리 상태를 해석하고, "
        "행동 제안 1개를 고르되, 반드시 해당 출처를 문장 안에 인용하라.)",
        "",
    ]
    for i, c in enumerate(cards, 1):
        actions = c.get("interventions", [])
        lines.append(f"{i}) 이론: {c['theory_ko']} — {c['concept_ko']}")
        lines.append(f"   해석근거: {c.get('summary', '')}")
        if actions:
            lines.append("   행동제안 후보: " + " / ".join(actions))
        if c.get("narrative_guidance"):
            lines.append(f"   톤 가이드: {c['narrative_guidance']}")
        lines.append(f"   출처: {c.get('source', '')}")
        lines.append("")
    return "\n".join(lines).rstrip()


if __name__ == "__main__":
    # 데모: 삶의 질이 가장 낮은 사용자 + 후회 감정 + 이직 고민
    ev = get_psych_evidence(
        indicator_scores={"경제적안정도": 0.62, "성장가능성": 0.40, "삶의질": 0.18},
        emotions=["후회", "자책"],
        decision_type="이직",
        k=3,
    )
    print(f"초점 지표: {ev['focus_indicator']} = {ev['score']} ({ev['level']})")
    print(f"검색된 카드: {[c['card_id'] for c in ev['cards']]}\n")
    print("=" * 60)
    print("레이어3 프롬프트에 주입될 근거 블록:")
    print("=" * 60)
    print(build_psych_prompt_block(ev))
