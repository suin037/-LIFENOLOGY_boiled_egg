"""Layer 1 — 룰베이스 '생활지표 조회' 엔진.

사용자 프로필(나이·성별·선택)로 연결된 공공통계 lookup 을 조회해
'인생 여러 차원'의 지표 패널을 만든다:
    경제(또래 임금·이직 소득변화) · 삶의질 · 정신건강 · 신체건강 ·
    직업환경 · 창업 …

설계 원칙(확장형):
  - 각 소스(_src_*)는 list[dict] 를 반환하고, 파일이 없거나 매칭이 실패하면
    '조용히' 빈 리스트를 돌려준다. -> 데이터가 더 붙을수록 패널이 저절로 넓어진다.
  - 심리학적 해석은 여기서 하지 않는다. 이 숫자 패널을 받아 RAG(팀 3)가 해석한다.

반환 dict 스키마:
  {dimension, indicator, value, unit, group, source}
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

import pandas as pd

from config import settings

DATA = settings.goms_clean_abspath.parent          # <ROOT>/data
DGROUP = DATA / "dgroup"
LANOLLAB = DATA / "lanollab"

ELFS_AGE = DGROUP / "kosis_고용형태별근로실태조사_연령별/lookup_elfs_wage_by_age_v1.csv"
BIZSURV = DGROUP / "kosis_기업생멸행정통계/lookup_bizsurvival_survival_v1.csv"
QOL = DGROUP / "kosis_사회통합실태조사/lookup_qol_indicators_v2.csv"
YOUTHQOL = DGROUP / "국가데이터처_청년삶의질2025/lookup_youthqol_indicators_v1.csv"
MASTER = LANOLLAB / "lookup_lanollab_master_v1.csv"


@lru_cache(maxsize=16)
def _csv(path_str: str):
    p = Path(path_str)
    return pd.read_csv(p) if p.exists() else None


# ---------------------------------------------------------------- 나이 → 연령구간
def _elfs_ageband(age: float) -> str:
    if age <= 29: return "29세이하"
    if age <= 39: return "30~39세"
    if age <= 49: return "40~49세"
    if age <= 59: return "50~59세"
    return "60세이상"


def _lanollab_ageband(age: float) -> str:
    if age <= 29: return "19-29"
    if age <= 39: return "30-39"
    if age <= 49: return "40-49"
    if age <= 59: return "50-59"
    if age <= 69: return "60-69"
    return "70+"


def _qol_ageband(age: float):
    if age < 30: return "20대"
    if age < 40: return "30대"
    return None                      # qol 은 20/30대만 -> 전체로 폴백


def _youthqol_ageband(age: float) -> str:
    if 25 <= age <= 29: return "25-29"
    if 30 <= age <= 34: return "30-34"
    return "19-34"


def _sex_int(profile: dict):
    try:
        return int(float(profile.get("sex")))
    except (TypeError, ValueError):
        return None


# ---------------------------------------------------------------- 소스 어댑터
def _src_job_change_income(profile: dict) -> list[dict]:
    """이직자 소득변화(GOMS 단면) — Layer1 대표 지표."""
    df = _csv(str(settings.goms_clean_abspath))
    if df is None or "income_change_pct" not in df.columns or "changed_job" not in df.columns:
        return []
    d = df[df["changed_job"] == 1]
    ic = pd.to_numeric(d["income_change_pct"], errors="coerce").dropna()
    if ic.empty:
        return []
    return [{"dimension": "경제", "indicator": "이직자 소득변화(중앙값)",
             "value": round(float(ic.median()), 1), "unit": "%",
             "group": f"이직 경험자 {len(ic):,}명", "source": "대졸자직업이동경로조사(GOMS)"}]


def _src_wage(profile: dict) -> list[dict]:
    """또래(연령대) 평균 월임금 벤치마크."""
    df = _csv(str(ELFS_AGE))
    if df is None:
        return []
    band = _elfs_ageband(profile.get("age", 30))
    d = df[(df["age_group"] == band) & (df["emp_type"] == "전체근로자")]
    if d.empty:
        return []
    d = d[d["year"] == d["year"].max()]
    return [{"dimension": "경제", "indicator": "또래 평균 월임금(전체근로자)",
             "value": round(float(d["월임금총액_만원"].iloc[0]), 1), "unit": "만원",
             "group": f"{band}·{int(d['year'].iloc[0])}",
             "source": "고용형태별근로실태조사(KOSIS)"}]


def _match_master(df, indicator: str, sex, age):
    """lanollab 통일스키마: 성별×연령대 → 연령대 → 성별 → 전체 순 폴백."""
    band = _lanollab_ageband(age)
    sub = df[df["지표명"] == indicator]
    if sub.empty:
        return None
    candidates = [
        ("성별×연령대", (sub["sex"] == sex) & (sub["agegroup"] == band)),
        ("연령대", sub["agegroup"] == band),
        ("성별", sub["sex"] == sex),
        ("전체", pd.Series(True, index=sub.index)),
    ]
    for gtype, cond in candidates:
        m = sub[(sub["구분유형"] == gtype) & cond]
        if not m.empty:
            r = m.iloc[0]
            return float(r["값"]), str(r["단위"]), gtype, str(r.get("출처", ""))
    return None


def _src_health(profile: dict) -> list[dict]:
    """정신건강·신체건강·직업환경 (KNHANES/CHS/KWCS 통합 마스터)."""
    df = _csv(str(MASTER))
    if df is None:
        return []
    sex, age = _sex_int(profile), profile.get("age", 30)
    dims = {"스트레스인지율": "정신건강", "우울장애유병률": "정신건강",
            "불안감유병": "정신건강", "수면장애": "신체건강",
            "업무스트레스": "직업환경"}
    out = []
    for ind, dim in dims.items():
        r = _match_master(df, ind, sex, age)
        if r:
            v, unit, gtype, src = r
            out.append({"dimension": dim, "indicator": ind, "value": round(v, 1),
                        "unit": unit, "group": gtype, "source": src or "KNHANES/CHS/KWCS"})
    return out


def _src_qol(profile: dict) -> list[dict]:
    """삶의 질(사회통합실태조사) — 삶의만족도·행복감·계층상승 인식."""
    df = _csv(str(QOL))
    if df is None:
        return []
    band = _qol_ageband(profile.get("age", 30))
    picks = ["삶의 만족도", "행복감(어제)", "계층 상승 가능성 인식(본인)"]
    out = []
    for ind in picks:
        sub = df[df["indicator_name"] == ind]
        if sub.empty:
            continue
        m = sub[sub["group"] == band] if band else sub[sub["group"] == "전체"]
        if m.empty:
            m = sub[sub["group"] == "전체"]
        if m.empty:
            continue
        m = m[m["year"] == m["year"].max()]
        r = m.iloc[0]
        out.append({"dimension": "삶의질", "indicator": ind, "value": float(r["value"]),
                    "unit": str(r["unit"]), "group": str(r["group"]),
                    "source": "사회통합실태조사"})
    return out


def _src_youth(profile: dict) -> list[dict]:
    """청년(≤34) 전용 삶의질 지표 — 번아웃·외로움·소득만족 등."""
    df = _csv(str(YOUTHQOL))
    age = profile.get("age", 30)
    if df is None or age > 34:
        return []
    band = _youthqol_ageband(age)
    picks = ["번아웃 경험률", "외로움 경험률", "소득 만족도", "삶의 만족도(청년삶실태)"]
    out = []
    for ind in picks:
        sub = df[df["indicator_name"] == ind]
        if sub.empty:
            continue
        m = sub[sub["group"] == band]
        if m.empty:
            m = sub
        m = m[m["year"] == m["year"].max()]
        r = m.iloc[0]
        out.append({"dimension": "삶의질(청년)", "indicator": ind, "value": float(r["value"]),
                    "unit": str(r["unit"]), "group": str(r["group"]),
                    "source": "청년 삶의 질(국가데이터처)"})
    return out


def _src_startup(profile: dict) -> list[dict]:
    """창업 선택 시 — 창업 N년 생존율."""
    if "창업" not in str(profile.get("choice", "")):
        return []
    df = _csv(str(BIZSURV))
    if df is None:
        return []
    d = df[(df["industry"] == "전체") & (df["ksic_section"] == "전체") & (df["firm_size"] == "계")]
    if d.empty:
        return []
    d = d[d["ref_year"] == d["ref_year"].max()]
    out = []
    for h in (1, 3, 5):
        m = d[d["survival_horizon_yr"] == h]
        if not m.empty:
            out.append({"dimension": "창업", "indicator": f"창업 {h}년 생존율",
                        "value": round(float(m["survival_rate"].iloc[0]), 1), "unit": "%",
                        "group": "전체 업종", "source": "기업생멸행정통계"})
    return out


# 등록된 소스(추가 데이터셋은 여기에 _src 함수 하나만 더 붙이면 패널 확장)
_SOURCES = [
    _src_job_change_income,   # 경제 — 이직 소득변화 (MVP 핵심)
    _src_wage,                # 경제 — 또래 임금
    _src_health,              # 정신/신체건강 · 직업환경
    _src_qol,                 # 삶의질
    _src_youth,               # 청년 삶의질
    _src_startup,             # 창업 (choice=창업)
]


def query_life_indicators(profile: dict) -> list[dict]:
    """프로필 -> 인생 여러 차원의 지표 패널. 실패한 소스는 건너뛴다."""
    out: list[dict] = []
    for src in _SOURCES:
        try:
            out.extend(src(profile))
        except Exception:
            continue
    return out


def startup_closure_timeline(profile: dict, years=(1, 3, 5)) -> dict:
    """창업 폐업 누적확률 타임라인 (L4 '후회 리스크'의 창업판).

    창업은 개인단위 인과 데이터가 없어 이직의 L3/L4 를 못 쓴다.
    대신 기업생멸통계 생존율(전체 업종)을 폐업확률(=1-생존율)로 바꿔
    '시간이 지날수록 접을 확률' 타임라인을 제공한다.
    """
    df = _csv(str(BIZSURV))
    if df is None:
        return {}
    d = df[(df["industry"] == "전체") & (df["ksic_section"] == "전체") & (df["firm_size"] == "계")]
    if d.empty:
        return {}
    d = d[d["ref_year"] == d["ref_year"].max()]
    out = {}
    for h in years:
        m = d[d["survival_horizon_yr"] == h]
        if not m.empty:
            out[h] = round(1 - float(m["survival_rate"].iloc[0]) / 100.0, 3)
    return out
