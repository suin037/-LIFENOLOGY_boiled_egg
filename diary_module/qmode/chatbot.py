# -*- coding: utf-8 -*-
"""chatbot.py — 마스코트 대화형 일기.

세 페르소나(마스코트)와 대화하며 하루를 남긴다. 대화 끝에 compose()가 그 대화를
1인칭 일기로 정리하고 기분·감정을 추론한다. 영역 분류는 domain_tag 재사용.
LLM 하나가 (1)대화 (2)일기작성 (3)감정을 하고, 영역은 /tag.

키 없으면 폴백(간단 응답 / 사용자 발화 이어붙이기)으로 오프라인에서도 흐름 검증 가능.
"""

from __future__ import annotations

import json
import os
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
DIARY = HERE.parent
ROOT = DIARY.parent
for p in (str(DIARY), str(ROOT)):
    if p not in sys.path:
        sys.path.insert(0, p)

# 마스코트 페르소나 — 캐릭터 시트 기반.
PERSONAS = {
    "lumi": {
        "label": "루미",
        "system": (
            "너는 '루미', 다정하고 공감적인 별빛 가이드다. 사용자의 하루를 따뜻하게 물어보고 "
            "짧게 공감하며 대화를 이어간다. 한 번에 1~2문장, 질문은 하나씩. 판단·진단·조언 강요를 "
            "하지 않는다. 힘든 얘기엔 먼저 마음을 알아준다."),
        "opener": "오늘 하루 어땠어? 좋았던 일이든 힘들었던 일이든, 편하게 말해줘.",
    },
    "cosmo": {
        "label": "코스모",
        "system": (
            "너는 '코스모', 차분하고 분석적인 행성 탐험가다. 사용자가 오늘 한 선택과 그 이유를 "
            "정리하도록 돕는다. 한 번에 1~2문장, 사실→감정→선택 순으로 짧게 되짚어 묻는다. "
            "단정·진단은 피하고 '이렇게 볼 수도 있어' 식으로 관점을 준다."),
        "opener": "오늘 있었던 일을 같이 정리해볼까? 무슨 일이 있었는지 편하게 적어줘.",
    },
    "nova": {
        "label": "노바",
        "system": (
            "너는 '노바', 재미있고 활력 넘치는 유성 가이드다. 사용자의 하루를 가볍고 즐겁게 "
            "끌어낸다. 한 번에 1~2문장, 호기심 가득한 반응 + 이어지는 질문 하나. 과장은 하되 "
            "무례하지 않게. 힘든 얘기엔 톤을 낮춰 곁에 있어준다."),
        "opener": "오~ 오늘 무슨 일 있었어?! 아무거나 툭 던져봐.",
    },
}


def _client():
    try:
        import report_one as R1
        R1._load_dotenv()
    except Exception:
        pass
    if not os.getenv("ANTHROPIC_API_KEY"):
        return None
    try:
        from anthropic import Anthropic
        return Anthropic()
    except ImportError:
        return None


def _to_anthropic(messages):
    """[{role,text}] → anthropic messages. 선두 assistant(오프너) 제거, user부터 시작."""
    out = []
    for m in messages or []:
        t = (m.get("text") or "").strip()
        if not t:
            continue
        role = "assistant" if m.get("role") in ("bot", "assistant") else "user"
        out.append({"role": role, "content": t})
    while out and out[0]["role"] != "user":   # anthropic 은 user 로 시작해야 함
        out.pop(0)
    return out


def opener(persona="lumi"):
    return PERSONAS.get(persona, PERSONAS["lumi"])["opener"]


def chat(messages, persona="lumi", model=None, max_tokens=200):
    """대화 한 턴 → 마스코트 답변 텍스트."""
    p = PERSONAS.get(persona, PERSONAS["lumi"])
    amsgs = _to_anthropic(messages)
    if not amsgs:
        return p["opener"]
    client = _client()
    if client is None:      # 폴백 — 짧은 공감/되물음
        return "그랬구나. 조금 더 얘기해줄래?"
    model = model or "claude-sonnet-5"
    for attempt in range(2):
        try:
            resp = client.messages.create(
                model=model, max_tokens=max_tokens, system=p["system"],
                thinking={"type": "disabled"}, messages=amsgs)
            return "".join(b.text for b in resp.content if b.type == "text").strip()
        except Exception as e:      # noqa: BLE001
            if attempt == 0 and any(s in str(e).lower() for s in ("529", "overload", "rate", "500", "timeout")):
                time.sleep(1.5); continue
            return "그랬구나. 오늘 얘기 잘 들었어."
    return "그랬구나."


_COMPOSE_SYSTEM = (
    "너는 사용자와의 대화를 읽고 그 하루를 사용자 시점(1인칭)의 짧은 일기로 정리하는 도우미다. "
    "지어내지 말고 대화에 있는 내용만. 진단 라벨 금지. JSON만 출력한다."
)


def compose(messages, model=None, max_tokens=400):
    """대화 → {text(1인칭 일기), mood(1~5), emotion(한 단어), domains, primary}."""
    user_text = " ".join(
        (m.get("text") or "") for m in (messages or []) if m.get("role") not in ("bot", "assistant")
    ).strip()
    from qmode import domain_tag as DT

    client = _client()
    if client is None:      # 폴백 — 사용자 발화 이어붙이기 + 키워드 태깅
        dom = DT.tag(user_text)
        return {"text": user_text or "(내용 없음)", "mood": 3, "emotion": "",
                "domains": dom["domains"], "primary": dom["primary"], "method": "fallback"}

    convo = "\n".join(
        ("나: " if m.get("role") not in ("bot", "assistant") else "가이드: ") + (m.get("text") or "")
        for m in (messages or []) if (m.get("text") or "").strip()
    )
    schema = ('반드시 이 JSON만:\n{"text":"1인칭 일기 2~3문장","mood":1~5(오늘 기분,높을수록 좋음),'
              '"emotion":"오늘을 한 단어로"}\n대화에 없는 내용은 넣지 말 것.')
    model = model or "claude-sonnet-5"
    text, mood, emotion = user_text, 3, ""
    try:
        resp = client.messages.create(
            model=model, max_tokens=max_tokens, system=_COMPOSE_SYSTEM,
            thinking={"type": "disabled"},
            messages=[{"role": "user", "content": "[대화]\n" + convo + "\n\n" + schema}])
        txt = "".join(b.text for b in resp.content if b.type == "text").strip()
        if txt.startswith("```"):
            txt = txt.strip("`"); txt = txt[txt.find("{"):txt.rfind("}") + 1]
        obj = json.loads(txt)
        text = obj.get("text") or user_text
        mood = int(obj.get("mood") or 3)
        mood = max(1, min(5, mood))
        emotion = (obj.get("emotion") or "").strip()
    except Exception:      # noqa: BLE001
        pass
    dom = DT.tag(text)
    return {"text": text, "mood": mood, "emotion": emotion,
            "domains": dom["domains"], "primary": dom["primary"], "method": "llm"}


if __name__ == "__main__":
    convo = [
        {"role": "bot", "text": opener("lumi")},
        {"role": "user", "text": "오늘 남친이랑 연락 문제로 좀 싸웠어. 서운했어."},
        {"role": "bot", "text": "그랬구나… 많이 속상했겠다."},
        {"role": "user", "text": "응. 내가 먼저 사과했는데 답이 늦더라."},
    ]
    print("=== chat 한 턴 ===")
    print("루미:", chat(convo, "lumi"))
    print("\n=== compose ===")
    print(json.dumps(compose(convo), ensure_ascii=False, indent=2))
