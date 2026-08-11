"""자유입력 선택지 → 예측 가능한 유형(kind) 분류 + 확신도 + 커버리지 계측.

## 왜 바꿨나
기존 `core.choice_kind()` 는 한국어 키워드 `in` 검사였다. 두 가지가 깨졌다.

1. **부정·대조를 못 읽는다.** "박사 안 가고 취업할래" 가 '박사' 하나로 진학이 됐다.
   "이직 말고 창업" 은 '이직' 이 먼저 매칭돼 창업을 놓쳤다.
2. **틀렸는지 알 수 없다.** 어디에도 안 걸리면 조용히 `기타` → 개인단위 레이어
   (L2/L3/L4)가 통째로 꺼지는데, 그게 얼마나 자주 일어나는지 아무도 몰랐다.

그래서 (a) 부정/대조 마커를 반영한 **점수 기반** 분류로 바꾸고, (b) `confidence` 를
함께 돌려주며, (c) 분류 결과를 집계해 **`기타` 비율(=커버리지 손실)을 측정**한다.
임베딩/LLM 분류로 가기 전에 '지금 얼마나 새고 있는지' 부터 숫자로 잡는 게 순서다.

분류는 결정적(deterministic)이라 테스트가 가능하고 지연·비용이 0 이다.
"""

from __future__ import annotations

import re
import threading
from collections import Counter
from dataclasses import dataclass, field

# 유형별 단서. 앞쪽일수록 강한 단서(가중치가 높다).
KEYWORDS: dict[str, list[tuple[str, float]]] = {
    "창업": [("창업", 1.0), ("사업", 0.8), ("자영", 1.0), ("개업", 1.0),
             ("장사", 0.8), ("프리랜", 0.6), ("startup", 1.0), ("법인", 0.6),
             ("차리", 0.7), ("가게", 0.6), ("공방", 0.6), ("1인 기업", 0.9)],
    "진학": [("진학", 1.0), ("대학원", 1.0), ("유학", 1.0), ("석사", 1.0),
             ("박사", 1.0), ("학업", 0.8), ("편입", 0.9), ("로스쿨", 1.0),
             ("전문대학원", 1.0), ("공부", 0.4)],
    "이직": [("이직", 1.0), ("전직", 1.0), ("옮기", 0.9), ("다른 회사", 0.9),
             ("갈아타", 0.8), ("퇴사", 0.7), ("스카웃", 0.8), ("스카우트", 0.8),
             ("연봉 높", 0.5), ("취업", 0.5), ("입사", 0.6), ("구직", 0.5),
             ("경력직", 0.7)],
    "유지": [("유지", 0.9), ("현상 유지", 1.0), ("현직", 0.9), ("잔류", 1.0),
             ("그대로", 0.8), ("계속 다니", 1.0), ("남기", 0.7), ("남는", 0.7),
             ("버티", 0.7), ("존버", 0.7)],
}

# 키워드 **뒤**에 붙어 그 선택지를 물리는 표현.
# 한국어는 서술어가 뒤에 오므로 부정·대조는 항상 대상 뒤에 붙는다
#   "박사 안 가고 취업"  → '안 가고' 가 무는 건 박사, 뒤의 취업이 아니다
#   "이직 말고 창업"     → '말고' 가 무는 건 이직, 뒤의 창업이 아니다
# 그래서 **앞쪽은 보지 않는다.** (앞을 보면 위 두 문장에서 취업·창업까지 같이 죽는다.)
#
# "안" 은 '안정' 같은 명사에 섞이므로 단독 음절로 쓰인 형태만 명시한다.
NEGATE_AFTER = (
    "안 ", "안가", "안감", "안갈", "안하", "안할", "안함", "안 가", "안 하",
    "않", "못 ", "못가", "못하",
    "말고", "대신", "보다는", "아니라", "포기", "그만두", "그만둘", "접고",
    "접을", "제외", "빼고",
)

_WINDOW_AFTER = 6      # 키워드 뒤 몇 글자까지 부정/대조를 볼지

MIN_CONFIDENCE = 0.34  # 이 아래면 유형을 단정하지 않는다(=기타로 넘김)


@dataclass
class ChoiceKind:
    """분류 결과. `kind` 만 쓰던 기존 코드와 호환되도록 문자열처럼도 동작한다."""

    kind: str
    confidence: float
    scores: dict[str, float] = field(default_factory=dict)
    matched: list[str] = field(default_factory=list)
    method: str = "rules"

    def __str__(self) -> str:          # noqa: D105
        return self.kind

    def __eq__(self, other) -> bool:   # noqa: D105 - kind == "이직" 비교 유지
        if isinstance(other, str):
            return self.kind == other
        return NotImplemented

    def __hash__(self) -> int:         # noqa: D105
        return hash(self.kind)


# ---------------------------------------------------------------- 계측
_lock = threading.Lock()
_STATS: Counter = Counter()
_LOW_CONF_SAMPLES: list[str] = []      # 기타/저확신 입력 표본(최근 것 일부만)
_MAX_SAMPLES = 30


def _record(text: str, res: ChoiceKind) -> None:
    with _lock:
        _STATS["total"] += 1
        _STATS[f"kind:{res.kind}"] += 1
        if res.kind == "기타" or res.confidence < MIN_CONFIDENCE + 0.1:
            _STATS["low_confidence"] += 1
            if len(_LOW_CONF_SAMPLES) < _MAX_SAMPLES:
                _LOW_CONF_SAMPLES.append(text[:80])


def classification_stats() -> dict:
    """분류 커버리지 — `기타` 비율이 곧 개인단위 레이어를 못 켠 비율이다.

    `/health` 로 노출한다. 이 값이 높으면 키워드 사전이나 분류 방식을 손봐야 한다는
    신호이며, 임베딩/LLM 분류 도입 여부를 감으로가 아니라 이 숫자로 판단한다.
    """
    with _lock:
        total = _STATS["total"]
        by_kind = {k.split(":", 1)[1]: v for k, v in _STATS.items()
                   if k.startswith("kind:")}
        other = by_kind.get("기타", 0)
        return {
            "total_classified": total,
            "by_kind": by_kind,
            "other_ratio": round(other / total, 4) if total else None,
            "low_confidence_ratio": (round(_STATS["low_confidence"] / total, 4)
                                     if total else None),
            "low_confidence_samples": list(_LOW_CONF_SAMPLES),
            "note": "other_ratio = 개인단위 레이어(L2/L3/L4)를 켜지 못한 요청 비율",
        }


def reset_stats() -> None:
    """테스트용."""
    with _lock:
        _STATS.clear()
        _LOW_CONF_SAMPLES.clear()


# ---------------------------------------------------------------- 분류
def _polarity(text: str, end: int) -> float:
    """키워드 1회 등장의 부호. 바로 뒤에 부정/대조가 붙어 있으면 -1, 아니면 +1."""
    after = text[end:end + _WINDOW_AFTER]
    return -1.0 if any(m in after for m in NEGATE_AFTER) else 1.0


def classify(choice: str) -> ChoiceKind:
    """자유입력 → ChoiceKind. 근거 없는 유형은 만들지 않는다(없으면 '기타')."""
    text = re.sub(r"\s+", " ", str(choice or "")).strip().lower()
    scores: dict[str, float] = {}
    matched: list[str] = []

    for kind, kws in KEYWORDS.items():
        s = 0.0
        for kw, w in kws:
            for m in re.finditer(re.escape(kw), text):
                pol = _polarity(text, m.end())
                s += w * pol
                matched.append(f"{kind}:{kw}{'(-)' if pol < 0 else ''}")
        if s:
            scores[kind] = round(s, 3)

    positive = {k: v for k, v in scores.items() if v > 0}
    if not positive:
        res = ChoiceKind("기타", 0.0, scores, matched)
        _record(choice, res)
        return res

    ranked = sorted(positive.items(), key=lambda kv: -kv[1])
    best, best_s = ranked[0]
    second_s = ranked[1][1] if len(ranked) > 1 else 0.0
    # 1등이 2등을 얼마나 앞서는가 → 확신도. 단독 매칭이면 1.0.
    conf = round(best_s / (best_s + second_s), 3) if (best_s + second_s) else 0.0

    if conf < MIN_CONFIDENCE:
        res = ChoiceKind("기타", conf, scores, matched, method="rules(ambiguous)")
    else:
        res = ChoiceKind(best, conf, scores, matched)
    _record(choice, res)
    return res
