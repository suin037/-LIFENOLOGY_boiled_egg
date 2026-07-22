"""
YP2021(청년패널) 종단 데이터 학습 스크립트 (시뮬레이션 모델 고도화).

klips_train.py 와 동일한 (t, t+1) 전이 구조를 쓰되, 데이터가 청년(19~31세)이라
서비스 타겟(25~35)에 더 적합한 L3/L4 산출물을 만든다.

Layer 3: 이직 -> 익년 소득 인과효과.
          이전 소득·기업규모·종사지위·직종을 혼재변수(W)로 통제한 종단 인과추론.
Layer 4: 일자리 spell 생존분석 (실데이터 근속 -> N년 후 이직 확률).

입력 (preprocess_yp.py 산출물, data/clean/ 에 배치):
    yp_clean.csv    사람×웨이브 long 패널 (person_id, wave, age, sex, edu_level,
                    firm_size, emp_status, occupation_raw, income_now, changed_job ...)
    yp_spells.csv   일자리 spell (duration_months, event, 공변량)

출력 (서빙에서 청년(≤31세)에 우선 사용):
    backend/models/artifacts/econml_yp.pkl
    backend/models/artifacts/lifelines_yp.pkl

사용법:
    python train_yp.py
"""

from __future__ import annotations

from pathlib import Path

import joblib
import numpy as np
import pandas as pd

CLEAN_DIR = Path("data/clean")
ARTIFACTS = Path("backend/models/artifacts")

# YP 표본은 19~31세. 타겟(25~35)보다 약간 넓게 잡아 표본 확보(데이터 밖은 자동 무효).
AGE_MIN, AGE_MAX = 19, 34


# ---------------------------------------------------------------- L3
def build_causal_panel() -> pd.DataFrame:
    """연속 관측 (t, t+1) 쌍 -> 인과추론용 행.

    T = t+1 이직 여부, Y = t+1 월소득(만원)
    W(혼재변수) = t 시점 소득·기업규모·종사지위·직종
    X(이질성)   = 나이·성별·학력
    """
    p = pd.read_csv(CLEAN_DIR / "yp_clean.csv")
    p = p[["person_id", "wave", "year", "age", "sex", "edu_level",
           "firm_size", "emp_status", "occupation_raw",
           "income_now", "changed_job"]].copy()
    p = p.dropna(subset=["income_now"])
    p = p[p["income_now"] > 0]
    p = p.sort_values(["person_id", "wave"])

    nxt = p.groupby("person_id").shift(-1)
    d = pd.DataFrame({
        "pid": p["person_id"],
        "age": p["age"],
        "sex": p["sex"],                     # 1=남 2=여 (GOMS·KLIPS 와 동일 코딩)
        "edu": p["edu_level"],
        "firm_size": p["firm_size"],
        "emp_status": p["emp_status"],
        "occ": p["occupation_raw"],
        "wage_now": p["income_now"],
        "wage_next": nxt["income_now"],
        "T_move": nxt["changed_job"],
        "wave_gap": nxt["wave"] - p["wave"],
    })
    d = d[d["wave_gap"] == 1]                 # 연속 파동만
    d = d.dropna(subset=["wage_next", "T_move", "age", "sex", "edu", "wage_now"])
    d = d[d["age"].between(AGE_MIN, AGE_MAX)]
    d["T_move"] = d["T_move"].astype(int)
    d["occ"] = d["occ"].fillna(0)
    d["emp_status"] = d["emp_status"].fillna(d["emp_status"].median())
    d["firm_size"] = d["firm_size"].fillna(d["firm_size"].median())
    print(f"[L3 panel] {len(d):,} 개 (사람-연도 전이쌍), 이직 비율 {d['T_move'].mean():.1%}")
    return d


def train_econml_yp(d: pd.DataFrame) -> dict:
    from econml.dml import CausalForestDML, LinearDML
    from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier

    X_COLS = ["age", "sex", "edu"]
    W_COLS = ["wage_now", "firm_size", "emp_status", "occ"]

    Y = d["wage_next"].to_numpy()
    T = d["T_move"].to_numpy()
    X = d[X_COLS].to_numpy()
    W = d[W_COLS].to_numpy()

    est = CausalForestDML(
        model_y=RandomForestRegressor(n_estimators=150, min_samples_leaf=20),
        model_t=RandomForestClassifier(n_estimators=150, min_samples_leaf=20),
        discrete_treatment=True,
        n_estimators=300,
        random_state=42,
    )
    est.fit(Y, T, X=X, W=W)
    ate = float(est.ate(X))
    lb, ub = (float(v) for v in est.ate_interval(X, alpha=0.05))
    mean_wage = float(d["wage_now"].mean())
    print(f"[L3 YP] ATE(이직→익년소득) = {ate:+.2f} 만원 "
          f"(95% CI {lb:+.2f} ~ {ub:+.2f}) | 평균소득 대비 {ate / mean_wage:+.1%}")

    # 비교용 LinearDML - 해석 가능한 분석적 신뢰구간
    lin = LinearDML(
        model_y=RandomForestRegressor(n_estimators=150, min_samples_leaf=20),
        model_t=RandomForestClassifier(n_estimators=150, min_samples_leaf=20),
        discrete_treatment=True, random_state=42,
    )
    lin.fit(Y, T, X=X, W=W)
    lin_ate = float(lin.ate(X))
    llb, lub = (float(v) for v in lin.ate_interval(X, alpha=0.05))
    print(f"[L3 YP/LinearDML] ATE = {lin_ate:+.2f} 만원 (95% CI {llb:+.2f} ~ {lub:+.2f})")

    medians = {c: float(d[c].median()) for c in X_COLS}
    return {"model": est, "x_cols": X_COLS, "medians": medians,
            "ate": ate, "ate_ci": (lb, ub),
            "linear_ate": lin_ate, "linear_ci": (llb, lub),
            "source": "YP2021 청년패널 종단"}


# ---------------------------------------------------------------- L4
def train_lifelines_yp() -> dict:
    from lifelines import KaplanMeierFitter, CoxPHFitter

    s = pd.read_csv(CLEAN_DIR / "yp_spells.csv")
    s = s.rename(columns={"edu_level": "edu"})
    s = s.dropna(subset=["duration_months", "event", "age", "sex", "edu"])
    s = s[s["age"].between(AGE_MIN, AGE_MAX)]
    s["duration_months"] = s["duration_months"].clip(lower=0.5)
    print(f"[L4 panel] 스펠 {len(s):,}개 (이직 이벤트 {int(s['event'].sum()):,}건, "
          f"{s['event'].mean():.1%})")

    km = KaplanMeierFitter()
    km.fit(s["duration_months"], event_observed=s["event"], label="all")

    cox = CoxPHFitter()
    cox.fit(s[["duration_months", "event", "age", "sex", "edu"]],
            duration_col="duration_months", event_col="event")

    # 서비스 멘트용: N년 시점 이직(이탈) 누적확률
    surv = km.survival_function_
    idx = np.asarray(surv.index, dtype=float)
    for yr in (1, 3, 5):
        m = yr * 12
        p = 1 - float(surv.iloc[int(np.abs(idx - m).argmin())].iloc[0])
        print(f"           {yr}년 후 이직 누적확률 = {p:.1%}")

    medians = {"age": float(s["age"].median()),
               "sex": float(s["sex"].median()),
               "edu": float(s["edu"].median())}
    return {"km": km, "cox": cox, "cov_cols": ["age", "sex", "edu"],
            "medians": medians, "source": "YP2021 스펠"}


def main() -> None:
    ARTIFACTS.mkdir(parents=True, exist_ok=True)
    d = build_causal_panel()
    joblib.dump(train_econml_yp(d), ARTIFACTS / "econml_yp.pkl")
    joblib.dump(train_lifelines_yp(), ARTIFACTS / "lifelines_yp.pkl")
    print(f"[done] YP artifacts -> {ARTIFACTS}/")


if __name__ == "__main__":
    main()
