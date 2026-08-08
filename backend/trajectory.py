"""Layer 5 (종단 궤적 예측) — '데이터 기반 미래 예측'.

핵심 아이디어: 단일 예측값이나 AI 추정이 아니라, '너와 비슷한 사람들'을 KLIPS 패널의
시작 시점에서 찾아 **같은 사람들을 앞으로 추적**해, 향후 N년의 소득·이직 궤적을
분위수(p25/50/75) 분포로 보여준다.

  · 실제 관측된 경로 → "AI가 지어낸 미래" 아님
  · 단일값이 아닌 분포(범위) → 예측 불확실성을 정직하게 노출
  · 뒤 연차일수록 추적 표본(sample_n)이 줄어 신뢰도 하락 → 그 수치도 함께 반환

KLIPS(18~27차, 10년) 사용. 원본이 없으면 빈 리스트 반환(엔진은 정상 동작).
"""

import json
from functools import lru_cache

import numpy as np
import pandas as pd

from config import settings

KLIPS_PATH = settings.data_abspath / "raw" / "klips" / "klips_base.pkl"
YP_PATH = settings.data_abspath / "clean" / "yp_clean.csv"
BUILD_REPORT_PATH = KLIPS_PATH.parent / "klips_build_report.json"


@lru_cache(maxsize=1)
def wage_basis() -> dict:
    """소득 궤적의 화폐 기준 — 전처리 빌드 리포트에서 읽는다.

    `월임금_실질` 은 preprocess_klips.py 가 CPI 로 디플레이트한 값이다. 어느 연도
    기준인지 응답에 같이 실어야 "5년 뒤 400만원" 을 명목으로 오독하지 않는다.
    리포트가 없으면(구 빌드) 기준을 모른다고 정직하게 알린다.
    """
    if not BUILD_REPORT_PATH.exists():
        return {"deflated": False, "base_year": None,
                "label": "명목(기준연도 미상 — klips_build_report.json 없음)"}
    try:
        r = json.loads(BUILD_REPORT_PATH.read_text(encoding="utf-8"))
    except Exception:
        return {"deflated": False, "base_year": None, "label": "기준 불명"}
    if not r.get("deflated"):
        return {"deflated": False, "base_year": None, "label": "명목(디플레이트 안 됨)"}
    y = r.get("cpi_base_year")
    return {"deflated": True, "base_year": y, "years": r.get("years"),
            "label": f"{y}년 기준 실질"}


SATIS = ["satis_work", "satis_growth", "satis_income", "satis_stability", "satis_future"]
YP_FEATS = ["age", "sex", "income_now", "edu_level"]
# 매칭 피처: 나이·성별·소득 + 학력·고용형태(정규여부)
#  ※ 전공/만족도는 KLIPS(노동패널)에 없어 궤적 매칭엔 사용 불가.
#  ※ 정규여부는 '종사상지위' 가 있는 빌드에서만 쓴다. 18~27차 빌드부터 포함되지만,
#    구 빌드(종사상지위 없음)에서도 궤적이 죽지 않도록 optional 로 둔다.
BASE_FEATS = ["나이", "성별", "월임금_실질", "학력"]
REQUIRED_COLS = ["pid", "wave", "나이", "성별", "학력", "월임금_실질", "이직"]


@lru_cache(maxsize=1)
def _panel():
    if not KLIPS_PATH.exists():
        return None
    raw = pd.read_pickle(KLIPS_PATH)
    if [c for c in REQUIRED_COLS if c not in raw.columns]:
        return None  # 필수 컬럼이 없는 빌드 → 궤적 생략(엔진은 계속 동작)

    has_status = "종사상지위" in raw.columns
    cols = REQUIRED_COLS + (["종사상지위"] if has_status else [])
    b = raw[cols].copy()
    b = b[b["월임금_실질"] > 0].dropna(subset=["나이", "성별", "월임금_실질"])
    b["학력"] = b["학력"].fillna(b["학력"].median())
    feats = list(BASE_FEATS)
    if has_status:
        # 고용형태 → 정규여부 (상용1=정규, 임시2·일용3=비정규; 자영/무급은 결측→중앙값)
        st = pd.to_numeric(b["종사상지위"], errors="coerce")
        b["정규여부"] = np.where(st == 1, 1.0, np.where(st.isin([2, 3]), 2.0, np.nan))
        b["정규여부"] = b["정규여부"].fillna(b["정규여부"].median())
        feats.append("정규여부")
    b["이직"] = pd.to_numeric(b["이직"], errors="coerce").fillna(0)
    mu, sd = b[feats].mean(), b[feats].std().replace(0, 1)
    # pid별 DataFrame 사전은 약 3만 개 객체를 만들어 서버 첫 기동을 크게 늦춘다.
    # 선택된 시작점만 아래에서 한 번 merge하면 같은 추적을 벡터 연산으로 수행할 수 있다.
    return {"b": b, "mu": mu, "sd": sd, "feats": feats}


def project_trajectory(features: dict, horizon: int = 10, k: int = 300,
                       min_n: int = 15) -> list[dict]:
    """프로필 → 향후 `horizon`년 소득·이직 궤적(분위수)."""
    P = _panel()
    if P is None:
        return []
    b, mu, sd, feats = P["b"], P["mu"], P["sd"], P["feats"]

    A = features.get("age")
    if A is None:
        return []
    try:
        sex = float(features.get("sex"))
    except (TypeError, ValueError):
        sex = float(b["성별"].median())
    W = features.get("monthly_wage")
    if W is None:
        near = b[b["나이"].between(A - 1, A + 1)]["월임금_실질"]
        W = float(near.median()) if len(near) else float(b["월임금_실질"].median())
    # 학력·고용형태: 입력에 있으면 매칭에 사용, 없으면 중앙값(=중립)
    edu = features.get("edu_level")
    edu = float(edu) if edu is not None else float(b["학력"].median())

    # 시작 후보: 시작 나이 ±1
    cand = b[b["나이"].between(A - 1, A + 1)]
    if len(cand) < min_n:
        return []
    q = {"나이": A, "성별": sex, "월임금_실질": float(W), "학력": edu}
    if "정규여부" in feats:
        reg = features.get("is_regular")
        reg = float(reg) if reg is not None else float(b["정규여부"].median())
        q["정규여부"] = reg
    zq = np.array([(q[c] - mu[c]) / sd[c] for c in feats])
    Z = ((cand[feats] - mu) / sd).to_numpy()
    dist = np.sqrt(((Z - zq) ** 2).sum(axis=1))
    starts = (cand.assign(_d=dist).nsmallest(k, "_d")[["pid", "wave"]]
              .rename(columns={"wave": "start_wave"}).reset_index(drop=True))
    starts["start_id"] = np.arange(len(starts))
    followed = starts.merge(
        b[["pid", "wave", "월임금_실질", "이직"]], on="pid", how="left"
    )
    followed["year_from_start"] = followed["wave"] - followed["start_wave"]
    followed = followed[followed["year_from_start"].between(0, horizon)]

    out = []
    for h in range(horizon + 1):
        incs = followed.loc[followed["year_from_start"] == h, "월임금_실질"].to_numpy()
        seg = followed[(followed["year_from_start"] > 0) &
                       (followed["year_from_start"] <= h)]
        moved_by_start = seg.groupby("start_id")["이직"].max() if len(seg) else []
        tot = len(moved_by_start)
        moved = int(np.sum(moved_by_start)) if tot else 0
        if len(incs) >= min_n:
            out.append({
                "year": h, "age": int(A) + h, "sample_n": len(incs),
                "income_p25": int(np.percentile(incs, 25)),
                "income_p50": int(np.percentile(incs, 50)),
                "income_p75": int(np.percentile(incs, 75)),
                "job_change_cum": round(moved / tot, 3) if tot else None,
            })
    return out


# ---------------------------------------------------------------- 만족도 궤적 (YP)
@lru_cache(maxsize=1)
def _yp_panel():
    """YP 청년패널 — 웨이브별 종합 만족도(1~5) 추적용. (KLIPS 엔 만족도 없음)"""
    if not YP_PATH.exists():
        return None
    y = pd.read_csv(YP_PATH)
    for c in SATIS + YP_FEATS:
        if c in y.columns:
            y[c] = pd.to_numeric(y[c], errors="coerce")
    have = [c for c in SATIS if c in y.columns]
    if not have:
        return None
    y["만족도"] = y[have].mean(axis=1)
    y = y.dropna(subset=["age", "sex", "만족도"])
    match = y.dropna(subset=YP_FEATS)
    if len(match) < 50:
        return None
    mu, sd = match[YP_FEATS].mean(), match[YP_FEATS].std().replace(0, 1)
    by_pid = {p: g.set_index("wave") for p, g in y.groupby("person_id")}
    return {"match": match, "mu": mu, "sd": sd, "by_pid": by_pid}


def project_wellbeing_trajectory(features: dict, horizon: int = 3, k: int = 300,
                                 min_n: int = 15) -> list[dict]:
    """프로필 → 향후 몇 년 '종합 만족도(1~5)' 궤적 (청년·YP 4웨이브 기준).

    소득 궤적과 짝지어 "돈은 늘지만 만족도는?"에 답한다. 청년 범위 밖이면 빈 리스트.
    """
    P = _yp_panel()
    if P is None:
        return []
    match, mu, sd, by_pid = P["match"], P["mu"], P["sd"], P["by_pid"]
    A = features.get("age")
    if A is None:
        return []
    try:
        sex = float(features.get("sex"))
    except (TypeError, ValueError):
        sex = float(match["sex"].median())
    W = features.get("monthly_wage")
    if W is None:
        near = match[match["age"].between(A - 1, A + 1)]["income_now"]
        W = float(near.median()) if len(near) else float(match["income_now"].median())
    edu = features.get("edu_level")
    edu = float(edu) if edu is not None else float(match["edu_level"].median())

    cand = match[match["age"].between(A - 1, A + 1)]
    if len(cand) < min_n:
        return []
    q = {"age": A, "sex": sex, "income_now": float(W), "edu_level": edu}
    zq = np.array([(q[c] - mu[c]) / sd[c] for c in YP_FEATS])
    Z = ((cand[YP_FEATS] - mu) / sd).to_numpy()
    dist = np.sqrt(((Z - zq) ** 2).sum(axis=1))
    starts = cand.assign(_d=dist).nsmallest(k, "_d")[["person_id", "wave"]].to_numpy()

    out = []
    for h in range(horizon + 1):
        vals = []
        for pid, w0 in starts:
            g = by_pid.get(pid)
            if g is None:
                continue
            w = int(w0) + h
            if w in g.index:
                r = g.loc[w]
                r = r.iloc[0] if isinstance(r, pd.DataFrame) else r
                if pd.notna(r["만족도"]):
                    vals.append(float(r["만족도"]))
        if len(vals) >= min_n:
            out.append({
                "year": h, "age": int(A) + h, "sample_n": len(vals),
                "satis_p25": round(float(np.percentile(vals, 25)), 2),
                "satis_p50": round(float(np.percentile(vals, 50)), 2),
                "satis_p75": round(float(np.percentile(vals, 75)), 2),
            })
    return out


def project_satisfaction_facets(features: dict, horizon: int = 3, k: int = 300,
                                min_n: int = 15) -> dict:
    """프로필 → 만족도 세부 facet별 궤적(중앙값, 청년·YP).

    종합 만족도(project_wellbeing_trajectory) 하나로 뭉치지 않고, 5개 facet
    (직무·자기발전·소득·고용안정·장래성)을 각각 보여준다. "이 길 간 사람들은
    소득 만족은 높은데 장래성 만족은 낮더라" 같은 결을 만든다.
    선택별로 갈리진 않지만(YP 직무만족은 취업자만 관측), '너와 비슷한 사람들'의
    facet별 변화를 개인화해 보여주는 용도.

    반환: {facet_key: [{year, age, sample_n, mean}], ...} (표본 부족 facet/연차는 생략)
          (facet 은 1~5 정수라 중앙값이 4로 뭉개져 → 평균값 사용)
    """
    P = _yp_panel()
    if P is None:
        return {}
    match, mu, sd, by_pid = P["match"], P["mu"], P["sd"], P["by_pid"]
    A = features.get("age")
    if A is None:
        return {}
    try:
        sex = float(features.get("sex"))
    except (TypeError, ValueError):
        sex = float(match["sex"].median())
    W = features.get("monthly_wage")
    if W is None:
        near = match[match["age"].between(A - 1, A + 1)]["income_now"]
        W = float(near.median()) if len(near) else float(match["income_now"].median())
    edu = features.get("edu_level")
    edu = float(edu) if edu is not None else float(match["edu_level"].median())

    cand = match[match["age"].between(A - 1, A + 1)]
    if len(cand) < min_n:
        return {}
    q = {"age": A, "sex": sex, "income_now": float(W), "edu_level": edu}
    zq = np.array([(q[c] - mu[c]) / sd[c] for c in YP_FEATS])
    Z = ((cand[YP_FEATS] - mu) / sd).to_numpy()
    dist = np.sqrt(((Z - zq) ** 2).sum(axis=1))
    starts = cand.assign(_d=dist).nsmallest(k, "_d")[["person_id", "wave"]].to_numpy()

    out: dict = {}
    for facet in SATIS:
        series = []
        for h in range(horizon + 1):
            vals = []
            for pid, w0 in starts:
                g = by_pid.get(pid)
                if g is None or facet not in g.columns:
                    continue
                w = int(w0) + h
                if w in g.index:
                    r = g.loc[w]
                    r = r.iloc[0] if isinstance(r, pd.DataFrame) else r
                    if pd.notna(r[facet]):
                        vals.append(float(r[facet]))
            if len(vals) >= min_n:
                # facet 은 1~5 정수라 중앙값이면 대부분 4로 뭉개짐 → 평균으로 결을 살림
                series.append({"year": h, "age": int(A) + h, "sample_n": len(vals),
                               "mean": round(float(np.mean(vals)), 2)})
        if series:
            out[facet] = series
    return out
