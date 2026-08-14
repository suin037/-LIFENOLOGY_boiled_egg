"""삶의 영역(domain) → 데이터 라우터. (로드맵 항목3)

'행동(choice) + 삶의 영역(domain)' 구조에서, 영역별로 어느 실측 데이터를 쓸지
라우팅해 집단통계 지표를 돌려준다. 데이터가 없는 영역은 정직하게 비운다
(근거수준: 항목4 evidence 와 정합).

- career            : 기존 엔진(GOMS/YP + 인과·생존) 이 처리 → 여기선 지표 추가 안 함
- finance           : KOSIS 고용형태별 임금(연령별) → 월임금 중앙수준
- business          : 기업생멸 생존율(연차별)
- education         : KEDI 학과별 취업률·진학률
- health / lifestyle: KNHANES·CHS·KWCS 통합표(우울·불안·수면·스트레스·업무스트레스)
- long_term_values  : 사회통합/삶의질(삶의 만족도·여가)
- relationship      : 심리 RAG(정량 없음) — 기존 psych 카드가 담당
- housing           : 데이터 부족
"""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path

import pandas as pd

from config import ROOT
from rulebase import bizsurv_rows

DATA = ROOT / "data"

DOMAIN_LABELS = {
    "career": "직업", "education": "교육", "business": "사업", "finance": "재무",
    "health": "건강", "housing": "주거", "relationship": "관계",
    "lifestyle": "생활방식", "long_term_values": "장기 가치",
}


# ── 연령대 버킷 (데이터별 구간 표기가 달라 각각 매핑) ──────────────────────────
def _b_lanollab(age: int) -> str:
    return ("19-29" if age < 30 else "30-39" if age < 40 else "40-49"
            if age < 50 else "50-59" if age < 70 else "70+")


def _b_wage(age: int) -> str:
    return ("29세이하" if age <= 29 else "30~39세" if age < 40 else "40~49세"
            if age < 50 else "50~59세" if age < 60 else "60세이상")


def _b_qol(age: int) -> str:
    return "20대" if age < 30 else "30대" if age < 40 else "전체"


@lru_cache(maxsize=None)
def _csv(rel: str) -> pd.DataFrame:
    return pd.read_csv(DATA / rel)


def _ind(name, value, unit, n=None, source=None, note=None) -> dict:
    return {"name": name, "value": (None if value is None else round(float(value), 1)),
            "unit": unit, "sample_n": (int(n) if n and n == n else None),
            "source": source, "note": note}


# ── 로더 (영역별) ────────────────────────────────────────────────────────────
LANOLLAB = "lanollab/lookup_lanollab_master_v1.csv"
HEALTH_INDS = ["우울장애유병률", "불안감유병", "수면장애", "스트레스인지율",
               "EQ5D_통증문제", "우울함유병"]
LIFESTYLE_INDS = ["업무스트레스", "주중평균수면시간", "스트레스인지율"]


def _lanollab(profile, names) -> list[dict]:
    try:
        df = _csv(LANOLLAB)
    except Exception:
        return []
    age = int(profile.get("age") or 29)
    ag, sx = _b_lanollab(age), str(float(profile.get("sex") or 2))
    out = []
    for nm in names:
        sub = df[df["지표명"] == nm]
        if sub.empty:
            continue
        # 성별×연령대 → 연령대 → 전체 순으로 가장 구체적인 값을 고른다.
        pick = sub[(sub["구분유형"] == "성별×연령대") & (sub["agegroup"].astype(str) == ag)
                   & (sub["sex"].astype(str) == sx)]
        if pick.empty:
            pick = sub[(sub["구분유형"] == "연령대") & (sub["agegroup"].astype(str) == ag)]
        if pick.empty:
            pick = sub[sub["구분유형"] == "전체"]
        if pick.empty:
            continue
        r = pick.iloc[0]
        out.append(_ind(nm, r["값"], r["단위"], r.get("n"), r.get("출처")))
    return out


def _finance(profile) -> list[dict]:
    try:
        df = _csv("dgroup/kosis_고용형태별근로실태조사_연령별/lookup_elfs_wage_by_age_v1.csv")
    except Exception:
        return []
    age = int(profile.get("age") or 29)
    sub = df[(df["age_group"].astype(str) == _b_wage(age))
             & (df["emp_type"].astype(str) == "정규근로자")]
    if sub.empty:
        return []
    r = sub.sort_values("year").iloc[-1]
    return [_ind(f"또래 정규직 월임금총액({int(r['year'])})", r["월임금총액_만원"], "만원",
                 source="KOSIS 고용형태별근로실태조사")]


def _education(profile) -> list[dict]:
    try:
        df = _csv("dgroup/한국교육개발원_고등교육기관_졸업자_학과별_상황/lookup_kedi_emp_rate_by_field_v1.csv")
    except Exception:
        return []
    major = str(profile.get("major") or "전체")
    sub = df[df["major_field"].astype(str) == major]
    if sub.empty:
        sub = df[df["major_field"].astype(str) == "전체"]
    if sub.empty:
        return []
    r = sub.sort_values("year").iloc[-1]
    return [_ind(f"{r['major_field']} 취업률({int(r['year'])})", r["emp_rate"], "%",
                 source="KEDI 고등교육기관 졸업자"),
            _ind(f"{r['major_field']} 진학률", r["advance_rate"], "%",
                 source="KEDI 고등교육기관 졸업자")]


def _business(profile) -> list[dict]:
    """창업 생존율 — 업종·규모는 자유입력(profile['choice'])에서 뽑는다.

    필터를 여기서 직접 쓰지 않고 `rulebase.bizsurv_rows` 를 부른다. 예전엔 이 함수와
    rulebase 가 각자 '전체·계' 를 하드코딩하고 있었는데, 한쪽만 업종축을 열면 같은
    창업에 대해 화면마다 다른 생존율이 나온다.
    """
    try:
        sub, ctx = bizsurv_rows(profile or {})
    except Exception:
        return []
    if sub is None or sub.empty:
        return []
    out = []
    for h in (1, 3, 5):
        row = sub[sub["survival_horizon_yr"] == h]
        if not row.empty:
            r = row.sort_values("ref_year").iloc[-1]
            out.append(_ind(f"창업 {h}년 생존율", r["survival_rate"], "%",
                            source="KOSIS 기업생멸행정통계",
                            note=f"{ctx.label()} 기준"))
    return out


def _values(profile) -> list[dict]:
    try:
        df = _csv("dgroup/kosis_사회통합실태조사/lookup_qol_indicators_v2.csv")
    except Exception:
        return []
    grp = _b_qol(int(profile.get("age") or 29))
    want = ["삶의 만족도", "여가생활 만족도", "하루 평균 여가시간"]
    out = []
    for nm in want:
        sub = df[df["indicator_name"] == nm]
        if sub.empty:
            continue
        pick = sub[sub["group"].astype(str) == grp]
        if pick.empty:
            pick = sub[sub["group"].astype(str) == "전체"]
        if pick.empty:
            continue
        r = pick.sort_values("year").iloc[-1]
        out.append(_ind(nm, r["value"], r["unit"], source="사회통합실태조사"))
    return out


# domain → (근거수준, 로더). 로더 None = 정량 지표 없음(기존 파이프라인/ RAG/ 데이터부족).
_ROUTES = {
    "career": ("model", None),
    "finance": ("group_stat", _finance),
    "business": ("group_stat", _business),
    "education": ("group_stat", _education),
    "health": ("group_stat", lambda p: _lanollab(p, HEALTH_INDS)),
    "lifestyle": ("group_stat", lambda p: _lanollab(p, LIFESTYLE_INDS)),
    "long_term_values": ("group_stat", _values),
    "relationship": ("rag", None),
    "housing": ("insufficient", None),
}

_ROUTE_NOTE = {
    "career": "GOMS/YP 유사인물·인과·생존 모델(기존 엔진)이 담당",
    "relationship": "정량 데이터 없음 — 심리 이론 근거(RAG)로만 설명",
    "housing": "현재 뒷받침 데이터 없음 — 수치 대신 신중히 안내",
}


def route_domains(domains, profile: dict) -> dict:
    """domain 리스트 → {domain: {label, evidence, indicators[], source_note}}."""
    prof = profile or {}
    result = {}
    for d in domains or []:
        evidence, loader = _ROUTES.get(d, ("insufficient", None))
        inds = loader(prof) if loader else []
        # 로더가 데이터를 못 찾으면 근거수준을 강등(정직).
        if loader and not inds and evidence == "group_stat":
            evidence = "insufficient"
        result[d] = {
            "label": DOMAIN_LABELS.get(d, d),
            "evidence": evidence,
            "indicators": inds,
            "source_note": _ROUTE_NOTE.get(d),
        }
    return result
