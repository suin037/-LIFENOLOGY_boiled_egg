"""RAG 런타임 검색기.

팀의 근거 코퍼스(통계 청크 + 심리학 이론카드 + knowledge)를 로드해,
질의(choice·지표 등)로 관련 근거를 retrieve 한다.
엔진 수치와 함께 서사(3번/Claude)에게 '통계 근거'로 넘겨줄 재료다.

- 언어 무관 매칭을 위해 char n-gram TF-IDF 사용(한국어 형태소기 불필요).
- 데이터가 없으면 조용히 빈 결과(엔진 방어성 원칙과 동일).
- .pkl(psychology_db) 대신 원본 json에서 직접 인덱스를 새로 만들어 sklearn 버전 의존을 피함.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Optional

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"


def _safe_load(p: Path):
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        return None


def _load_docs() -> list[dict]:
    """모든 근거 문서를 {text, source, indicator, kind, id} 형태로 모은다."""
    docs: list[dict] = []
    seen: set[str] = set()

    def add(text: str, source: str, indicator: str, kind: str, _id: str = ""):
        text = (text or "").strip()
        if not text:
            return
        key = text[:120]
        if key in seen:
            return
        seen.add(key)
        docs.append(
            {"text": text, "source": source or "", "indicator": indicator or "", "kind": kind, "id": _id or ""}
        )

    # 1) 통계 근거 청크 (rag_*chunks*.json) — dgroup / lanollab 전역
    for p in DATA.glob("**/rag_*chunks*.json"):
        obj = _safe_load(p)
        if obj is None:
            continue
        items = obj.get("chunks") or obj.get("documents") or [] if isinstance(obj, dict) else obj
        if not isinstance(items, list):
            continue
        for it in items:
            if not isinstance(it, dict):
                continue
            text = it.get("document") or it.get("text") or it.get("content") or ""
            meta = it.get("metadata", {}) if isinstance(it.get("metadata"), dict) else {}
            indicator = meta.get("indicator") or meta.get("topic") or meta.get("doc_type") or ""
            source = meta.get("source") or ""
            add(text, source, indicator, "stat", it.get("id", ""))

    # 2) 심리학 이론카드 (cards_*.json)
    for p in DATA.glob("**/cards_*.json"):
        obj = _safe_load(p)
        if obj is None:
            continue
        cards = obj.get("cards", []) if isinstance(obj, dict) else obj
        theory_top = obj.get("theory_ko", "") if isinstance(obj, dict) else ""
        if not isinstance(cards, list):
            continue
        for c in cards:
            if not isinstance(c, dict):
                continue
            theory = c.get("theory_ko") or theory_top
            concept = c.get("concept_ko", "")
            summary = c.get("summary") or c.get("document") or ""
            head = " ".join(x for x in [theory, concept] if x)
            source = f"{theory} ({c.get('theorist','')}, {c.get('year','')})".strip()
            add(f"{head}: {summary}" if head else summary, source, "심리이론", "card", c.get("card_id", ""))

    # 3) knowledge/*.json (심리학 청크·긍정정서 등, 스키마 혼재 → 관대하게 파싱)
    kdir = DATA / "knowledge"
    if kdir.exists():
        for p in kdir.glob("*.json"):
            obj = _safe_load(p)
            if obj is None:
                continue
            items = obj if isinstance(obj, list) else (obj.get("chunks") or obj.get("cards") or [obj])
            if not isinstance(items, list):
                continue
            for it in items:
                if not isinstance(it, dict):
                    continue
                text = it.get("document") or it.get("text") or it.get("summary") or it.get("content") or ""
                meta = it.get("metadata", {}) if isinstance(it.get("metadata"), dict) else {}
                source = meta.get("source") or it.get("source") or it.get("theory_ko") or ""
                indicator = meta.get("indicator") or meta.get("topic") or "심리"
                add(text, source, indicator, "knowledge", it.get("id", ""))

    return docs


class RagIndex:
    """근거 코퍼스 위 char n-gram TF-IDF 검색기. import 시 1회 구축."""

    def __init__(self) -> None:
        self.docs: list[dict] = []
        self._vec = None
        self._mat = None
        self._cos = None
        try:
            self.docs = _load_docs()
            if self.docs:
                from sklearn.feature_extraction.text import TfidfVectorizer
                from sklearn.metrics.pairwise import cosine_similarity

                self._cos = cosine_similarity
                self._vec = TfidfVectorizer(analyzer="char_wb", ngram_range=(2, 4), min_df=1)
                self._mat = self._vec.fit_transform(d["text"] for d in self.docs)
        except Exception:
            # 근거 로드 실패해도 엔진은 계속 동작(빈 검색)
            self.docs = self.docs or []

    @property
    def n_docs(self) -> int:
        return len(self.docs)

    def retrieve(self, query: str, k: int = 4, kind: Optional[str] = None) -> list[dict]:
        """query 로 상위 k 근거 반환. kind='stat'|'card'|'knowledge' 로 필터 가능."""
        if not query or self._vec is None or self._mat is None:
            return []
        try:
            qv = self._vec.transform([query])
            sims = self._cos(qv, self._mat)[0]
        except Exception:
            return []
        order = sims.argsort()[::-1]
        out: list[dict] = []
        for i in order:
            if sims[i] <= 0:
                break
            d = self.docs[int(i)]
            if kind and d["kind"] != kind:
                continue
            out.append({**d, "score": round(float(sims[i]), 4)})
            if len(out) >= k:
                break
        return out


# 프로세스 1회 구축(엔진 방어성: 실패해도 예외 안 냄)
_INDEX: Optional[RagIndex] = None


def get_index() -> RagIndex:
    global _INDEX
    if _INDEX is None:
        _INDEX = RagIndex()
    return _INDEX


# 선택(choice)별 근거 질의 힌트 — 3지표(만족도·소득·후회) + 도메인
_CHOICE_HINTS = {
    "이직": "이직 소득 임금 고용안정 직무만족 근속 후회 이탈",
    "창업": "창업 자영업 생존율 폐업 소득 위험 스트레스",
    "진학": "대학원 진학 취업률 학력 소득 성장 장래성",
}


def evidence_for_choice(choice: str, kind_mix: bool = True, k_stat: int = 3, k_card: int = 2) -> list[dict]:
    """선택지에 맞는 통계 근거 + 심리 이론카드를 섞어 반환."""
    idx = get_index()
    if idx.n_docs == 0:
        return []
    base = _CHOICE_HINTS.get((choice or "").strip(), choice or "")
    q_stat = f"{base} 만족도 삶의질 소득"
    stat = idx.retrieve(q_stat, k=k_stat, kind="stat")
    if not kind_mix:
        return stat
    q_card = f"{base} 만족 회복탄력성 성장 긍정정서 대처"
    cards = idx.retrieve(q_card, k=k_card, kind="card")
    # card 가 비면 knowledge 로 보강
    if not cards:
        cards = idx.retrieve(q_card, k=k_card, kind="knowledge")
    return stat + cards
