"""Layer 5 (종단 궤적 예측) — '데이터 기반 미래 예측'.

핵심 아이디어: 단일 예측값이나 AI 추정이 아니라, '너와 비슷한 사람들'을 KLIPS 패널의
시작 시점에서 찾아 **같은 사람들을 앞으로 추적**해, 향후 N년의 소득·이직 궤적을
분위수(p25/50/75) 분포로 보여준다.

  · 실제 관측된 경로 → "AI가 지어낸 미래" 아님
  · 단일값이 아닌 분포(범위) → 예측 불확실성을 정직하게 노출
  · 뒤 연차일수록 추적 표본(sample_n)이 줄어 신뢰도 하락 → 그 수치도 함께 반환

KLIPS(18~27차, 10년) 사용. 원본이 없으면 빈 리스트 반환(엔진은 정상 동작).
"""

from functools import lru_cache

import numpy as np
import pandas as pd

from config import settings

KLIPS_PATH = settings.goms_clean_abspath.parent / "raw" / "klips" / "klips_base.pkl"
FEATS = ["나이", "성별", "월임금_실질", "학력"]


@lru_cache(maxsize=1)
def _panel():
    if not KLIPS_PATH.exists():
        return None
    b = pd.read_pickle(KLIPS_PATH)[
        ["pid", "wave", "나이", "성별", "학력", "월임금_실질", "이직"]
    ].copy()
    b = b[b["월임금_실질"] > 0].dropna(subset=["나이", "성별", "월임금_실질"])
    b["학력"] = b["학력"].fillna(b["학력"].median())
    b["이직"] = pd.to_numeric(b["이직"], errors="coerce").fillna(0)
    mu, sd = b[FEATS].mean(), b[FEATS].std().replace(0, 1)
    by_pid = {pid: g.set_index("wave") for pid, g in b.groupby("pid")}
    return {"b": b, "mu": mu, "sd": sd, "by_pid": by_pid}


def project_trajectory(features: dict, horizon: int = 10, k: int = 300,
                       min_n: int = 15) -> list[dict]:
    """프로필 → 향후 `horizon`년 소득·이직 궤적(분위수)."""
    P = _panel()
    if P is None:
        return []
    b, mu, sd, by_pid = P["b"], P["mu"], P["sd"], P["by_pid"]

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
    edu = float(b["학력"].median())

    # 시작 후보: 시작 나이 ±1
    cand = b[b["나이"].between(A - 1, A + 1)]
    if len(cand) < min_n:
        return []
    zq = np.array([
        (A - mu["나이"]) / sd["나이"], (sex - mu["성별"]) / sd["성별"],
        (float(W) - mu["월임금_실질"]) / sd["월임금_실질"], (edu - mu["학력"]) / sd["학력"],
    ])
    Z = ((cand[FEATS] - mu) / sd).to_numpy()
    dist = np.sqrt(((Z - zq) ** 2).sum(axis=1))
    starts = cand.assign(_d=dist).nsmallest(k, "_d")[["pid", "wave"]].to_numpy()

    out = []
    for h in range(horizon + 1):
        incs, moved, tot = [], 0, 0
        for pid, w0 in starts:
            g = by_pid.get(pid)
            if g is None:
                continue
            w = int(w0) + h
            if w in g.index:
                r = g.loc[w]
                r = r.iloc[0] if isinstance(r, pd.DataFrame) else r
                incs.append(float(r["월임금_실질"]))
            seg = g[(g.index > int(w0)) & (g.index <= int(w0) + h)]
            if len(seg):
                tot += 1
                moved += int((seg["이직"] == 1).any())
        if len(incs) >= min_n:
            out.append({
                "year": h, "age": int(A) + h, "sample_n": len(incs),
                "income_p25": int(np.percentile(incs, 25)),
                "income_p50": int(np.percentile(incs, 50)),
                "income_p75": int(np.percentile(incs, 75)),
                "job_change_cum": round(moved / tot, 3) if tot else None,
            })
    return out
