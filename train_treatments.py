"""이직 외 treatment(창업·진학)의 L3/L4 + 모든 treatment 의 **동적** 처치효과.

## 왜 필요한가
`core.py` 는 L2/L3/L4 를 `kind == "이직"` 에서만 켠다. 창업·진학은 집단통계(L1)뿐이라
A/B 둘 다 이직이 아니면 비교할 수치가 사실상 없었다. KLIPS 원본에는 종사상지위와
학력이 웨이브마다 있으므로 **전이(transition)를 treatment 로 정의**하면 같은 종단
인과·생존 틀을 그대로 쓸 수 있다.

## treatment 정의 (연속 파동 t → t+1)
| key | treatment | 대조군 | 결과변수 |
|---|---|---|---|
| `move`    | 이직 (`이직`==1)                    | 계속 재직          | t+h 월소득_실질 |
| `startup` | 임금근로(상용·임시·일용) → 자영      | 임금근로 유지      | t+h 월소득_실질 |
| `enroll`  | 학력코드 상승                        | 학력 유지          | t+h 월소득_실질 |

자영 행은 임금(`p{w}1642`)이 100% 결측이라 `월소득_실질`(임금+사업소득 통합,
preprocess_klips.py 산출)을 결과변수로 쓴다. 이게 없으면 창업 효과는 **원리적으로**
관측 불가다.

## 표본 게이트
`MIN_TREATED` 미만이면 **모델을 만들지 않는다.** 추정치가 나오긴 하지만 신뢰구간이
소득 전체 범위를 덮어 "모른다"를 숫자로 포장하는 꼴이 되기 때문. 대신 측정된 표본
수를 `treatment_report.json` 에 남겨, 서빙이 "데이터가 없다"를 **근거와 함께** 말한다.

## 동적 처치효과 (`dynamic_effects.json`)
기존 서빙은 L3 점추정 하나를 10년 내내 같은 값으로 더했다(효과의 시간 변화 무시,
불확실성이 밴드에 미반영). 여기서 상대시간 h=1..H 별로 LinearDML 을 따로 적합해
`{ate, ci_low, ci_high}` 프로파일을 만든다. 서빙은 이걸로 연차별 효과와 밴드 폭을
만든다.

산출:
    backend/models/artifacts/econml_klips_startup.pkl
    backend/models/artifacts/lifelines_klips_startup.pkl
    backend/models/artifacts/dynamic_effects.json
    backend/models/artifacts/treatment_report.json

사용법:
    python train_treatments.py
    python train_treatments.py --max-horizon 5
"""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

KLIPS_DIR = Path("data/raw/klips")
ARTIFACTS = Path("backend/models/artifacts")

AGE_MIN, AGE_MAX = 20, 45      # klips_train.py 와 동일 — 이직 모델과 같은 모집단
MIN_TREATED = 200              # 이 미만이면 인과모델을 만들지 않는다
MAX_HORIZON = 5                # 동적 효과 상대시간 (KLIPS 10년이지만 t+5 넘으면 표본 급감)

X_COLS = ["age", "sex", "edu"]                       # 이질성
W_COLS = ["income_now", "tenure", "occ", "firm_size"]  # 혼재변수


# ---------------------------------------------------------------- 패널 구성
def load_panel() -> pd.DataFrame:
    b = pd.read_pickle(KLIPS_DIR / "klips_base.pkl")
    need = {"월소득_실질", "종사상지위", "자영여부"}
    if missing := need - set(b.columns):
        raise KeyError(
            f"klips_base.pkl 에 {sorted(missing)} 없음 — "
            "preprocess/preprocess_klips.py 를 다시 실행할 것(자영 소득 컬럼 추가본)."
        )
    return b.sort_values(["pid", "wave"]).reset_index(drop=True)


def transition_frame(b: pd.DataFrame, horizon: int) -> pd.DataFrame:
    """t 시점 행 + t+1 전이 + t+horizon 결과. treatment 정의에 공통으로 쓰는 뼈대."""
    g = b.groupby("pid", sort=False)
    nxt = g.shift(-1)
    out_wage = g["월소득_실질"].shift(-horizon)
    out_wave = g["wave"].shift(-horizon)

    d = pd.DataFrame({
        "pid": b["pid"],
        "age": b["나이"], "sex": b["성별"], "edu": b["학력"],
        "occ": b["직종"], "firm_size": b["종업원규모"], "tenure": b["근속기간"],
        "income_now": b["월소득_실질"],
        "status": b["종사상지위"], "status_next": nxt["종사상지위"],
        "edu_next": nxt["학력"], "move_next": nxt["이직"],
        "gap1": nxt["wave"] - b["wave"],
        "y": out_wage, "gap_h": out_wave - b["wave"],
    })
    # 전이는 연속 파동에서만, 결과는 정확히 h년 뒤 관측된 것만
    d = d[(d["gap1"] == 1) & (d["gap_h"] == horizon)]
    d = d.dropna(subset=["y", "age", "sex", "edu", "income_now"])
    d = d[(d["income_now"] > 0) & (d["y"] > 0)]
    d = d[d["age"].between(AGE_MIN, AGE_MAX)]
    d["occ"] = d["occ"].fillna(0)
    d["tenure"] = d["tenure"].fillna(d["tenure"].median())
    d["firm_size"] = d["firm_size"].fillna(d["firm_size"].median())
    return d


def apply_treatment(d: pd.DataFrame, key: str) -> pd.DataFrame:
    """treatment 별로 (처치군 + 유효 대조군) 만 남기고 T 컬럼을 붙인다.

    대조군을 좁히는 게 핵심이다. 예컨대 창업 효과를 볼 때 이미 자영인 사람이
    대조군에 섞이면 '임금근로자가 창업했을 때' 라는 질문과 다른 걸 추정하게 된다.
    """
    wage_work = d["status"].isin([1, 2, 3])
    if key == "move":
        t = (d["move_next"] == 1)
        elig = d["move_next"].notna()
    elif key == "startup":
        # 임금근로자만 대상 — 처치=자영 전환, 대조=임금근로 유지
        t = wage_work & (d["status_next"] == 4)
        elig = wage_work & d["status_next"].isin([1, 2, 3, 4])
    elif key == "enroll":
        t = d["edu_next"] > d["edu"]
        elig = d["edu_next"].notna()
    else:
        raise ValueError(f"알 수 없는 treatment: {key}")
    out = d[elig].copy()
    out["T"] = t[elig].astype(int)
    return out


# ---------------------------------------------------------------- L3
def fit_linear_dml(d: pd.DataFrame, seed: int = 42):
    """LinearDML — 분석적 95% CI. 표본이 작은 treatment 에선 CausalForest 보다 안정적."""
    from econml.dml import LinearDML
    from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier

    est = LinearDML(
        model_y=RandomForestRegressor(n_estimators=100, min_samples_leaf=20,
                                      random_state=seed),
        model_t=RandomForestClassifier(n_estimators=100, min_samples_leaf=20,
                                       random_state=seed),
        discrete_treatment=True, random_state=seed,
    )
    X = d[X_COLS].to_numpy()
    est.fit(d["y"].to_numpy(), d["T"].to_numpy(), X=X, W=d[W_COLS].to_numpy())
    lo, hi = (float(v) for v in est.ate_interval(X, alpha=0.05))
    return est, float(est.ate(X)), lo, hi


def train_causal(d: pd.DataFrame, key: str, label: str) -> dict:
    """CausalForestDML(개인별 이질효과) + LinearDML(분석적 CI) 한 쌍."""
    from econml.dml import CausalForestDML
    from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier

    X = d[X_COLS].to_numpy()
    Y, T, W = d["y"].to_numpy(), d["T"].to_numpy(), d[W_COLS].to_numpy()
    est = CausalForestDML(
        model_y=RandomForestRegressor(n_estimators=150, min_samples_leaf=20),
        model_t=RandomForestClassifier(n_estimators=150, min_samples_leaf=20),
        discrete_treatment=True, n_estimators=300, random_state=42,
    )
    est.fit(Y, T, X=X, W=W)
    ate = float(est.ate(X))
    lb, ub = (float(v) for v in est.ate_interval(X, alpha=0.05))
    _, lin_ate, llb, lub = fit_linear_dml(d)
    print(f"[L3 {label}] CForest ATE {ate:+.2f} (CI {lb:+.2f}~{ub:+.2f}) | "
          f"LinearDML {lin_ate:+.2f} (CI {llb:+.2f}~{lub:+.2f}) | "
          f"n={len(d):,} 처치 {int(T.sum()):,}")
    return {
        "model": est, "x_cols": X_COLS,
        "medians": {c: float(d[c].median()) for c in X_COLS},
        "ate": ate, "ate_ci": (lb, ub),
        "linear_ate": lin_ate, "linear_ci": (llb, lub),
        "n": int(len(d)), "n_treated": int(T.sum()),
        "treatment": key,
        "source": f"KLIPS 18-27차 종단 ({label})",
        "prefer_linear": True,      # 처치군이 작아 CausalForest 구간은 참고용
        "caveat": CAVEATS.get(key),
    }


# 추정치를 그대로 읽으면 안 되는 지점 — artifact 에 실어 서빙까지 전달한다.
CAVEATS = {
    "startup": (
        "결과변수가 임금근로자는 '월평균임금'(p{w}1642), 자영은 '월평균 사업소득'"
        "(p{w}1672)로 **서로 다른 개념**이다(사업소득은 사업 관련 비용·변동성이 다르게 "
        "반영됨). 따라서 이 효과는 '창업하면 소득이 이만큼 오른다'가 아니라 "
        "'창업으로 전환한 사람의 신고 소득이 임금 대비 이만큼 높게 관측된다'로 읽어야 "
        "한다. 또한 폐업해 소득이 끊긴 사람은 결과 관측에서 빠져 생존편의가 남는다 "
        "(→ L4 자영 이탈확률과 반드시 함께 볼 것)."
    ),
}


# ---------------------------------------------------------------- 동적 효과
def dynamic_profile(b: pd.DataFrame, key: str, label: str,
                    max_horizon: int) -> dict:
    """상대시간 h=1..H 별 ATE 프로파일. 효과의 감쇠/증폭과 불확실성을 잡는다."""
    prof = {}
    for h in range(1, max_horizon + 1):
        d = apply_treatment(transition_frame(b, h), key)
        n_t = int(d["T"].sum())
        if n_t < MIN_TREATED:
            print(f"  [{label} t+{h}] 처치 {n_t} < {MIN_TREATED} → 중단")
            break
        try:
            _, ate, lo, hi = fit_linear_dml(d)
        except Exception as exc:                       # 수렴 실패 등
            print(f"  [{label} t+{h}] 적합 실패({type(exc).__name__}) → 중단")
            break
        prof[str(h)] = {"ate": round(ate, 2), "ci_low": round(lo, 2),
                        "ci_high": round(hi, 2), "n": int(len(d)), "n_treated": n_t}
        print(f"  [{label} t+{h}] ATE {ate:+7.2f} (CI {lo:+7.2f}~{hi:+7.2f}) "
              f"n={len(d):,} 처치 {n_t:,}")
    return prof


# ---------------------------------------------------------------- L4 (창업 스펠)
def build_selfemp_spells(b: pd.DataFrame) -> pd.DataFrame:
    """자영 상태의 연속 관측 구간 = 창업 스펠. event=1 이면 '자영을 그만둔 걸 관측'.

    KOSIS 기업생멸(집단통계)을 개인단위 생존모델로 대체한다. 사업체 폐업이 아니라
    **응답자가 자영 상태에서 벗어난 시점**이므로, 업종전환·폐업·재취업을 모두 포함한
    '창업 상태 이탈'로 읽어야 한다(라벨에 그대로 적는다).
    """
    s = b[b["자영여부"] == 1].copy()
    # 연속 파동이 끊기면 새 스펠
    brk = (s.groupby("pid")["wave"].diff() != 1).astype(int)
    s["run"] = brk.groupby(s["pid"]).cumsum()
    last_obs = b.groupby("pid")["wave"].max().rename("last_wave")

    sp = (s.groupby(["pid", "run"])
            .agg(w0=("wave", "min"), w1=("wave", "max"),
                 tenure_max=("근속기간", "max"),
                 age=("나이", "first"), sex=("성별", "first"), edu=("학력", "last"))
            .reset_index()
            .join(last_obs, on="pid"))
    # 이 스펠의 마지막 관측 뒤에도 이 사람 관측이 있으면 → 이탈을 봤다
    sp["event"] = (sp["w1"] < sp["last_wave"]).astype(int)
    # 근속기간(자영 시작년 기준)이 있으면 그걸, 없으면 관측된 파동 수로 대체
    obs_years = (sp["w1"] - sp["w0"] + 1).astype(float)
    sp["duration_months"] = (sp["tenure_max"].fillna(obs_years).clip(lower=0.5) * 12)
    sp = sp.dropna(subset=["age", "sex", "edu"])
    return sp[sp["age"].between(AGE_MIN, AGE_MAX)]


def _cv_concordance(df, cov_cols, dur="duration_months", ev="event", k=5, seed=42):
    """5-fold 교차검증 C-index → (학습평균, 테스트평균, 테스트표준편차, 갭)."""
    from lifelines import CoxPHFitter

    d = df[cov_cols + [dur, ev]].dropna()
    d = d.sample(frac=1, random_state=seed).reset_index(drop=True)
    folds = np.array_split(np.arange(len(d)), k)
    tr, te = [], []
    for i in range(k):
        te_idx = folds[i]
        tr_idx = np.concatenate([folds[j] for j in range(k) if j != i])
        m = CoxPHFitter().fit(d.iloc[tr_idx], dur, ev)
        tr.append(float(m.score(d.iloc[tr_idx], scoring_method="concordance_index")))
        te.append(float(m.score(d.iloc[te_idx], scoring_method="concordance_index")))
    return (float(np.mean(tr)), float(np.mean(te)), float(np.std(te)),
            float(np.mean(tr) - np.mean(te)))


def train_selfemp_survival(sp: pd.DataFrame) -> dict:
    from lifelines import KaplanMeierFitter, CoxPHFitter

    print(f"[L4 창업] 자영 스펠 {len(sp):,}개 (이탈 {int(sp['event'].sum()):,}건, "
          f"{sp['event'].mean():.1%})")
    km = KaplanMeierFitter().fit(sp["duration_months"], event_observed=sp["event"],
                                 label="self_employed")
    cov_cols = ["age", "sex", "edu"]
    cox = CoxPHFitter().fit(sp[["duration_months", "event"] + cov_cols],
                            duration_col="duration_months", event_col="event")
    cv = _cv_concordance(sp, cov_cols)
    print(f"[L4 창업/CV] 5-fold C-index 학습 {cv[0]:.3f} / 테스트 {cv[1]:.3f}±{cv[2]:.3f} "
          f"| 갭 {cv[3]:.3f} {'✓안정' if cv[3] < 0.05 else '⚠과적합 의심'}")

    surv = km.survival_function_
    idx = np.asarray(surv.index, dtype=float)
    for yr in (1, 3, 5, 10):
        p = 1 - float(surv.iloc[int(np.abs(idx - yr * 12).argmin())].iloc[0])
        print(f"           {yr}년 후 자영 이탈 누적확률 = {p:.1%}")

    return {"km": km, "cox": cox, "cov_cols": cov_cols,
            "medians": {c: float(sp[c].median()) for c in cov_cols},
            "source": "KLIPS 자영 스펠", "n": int(len(sp)), "n_features": len(cov_cols),
            "treatment": "startup", "max_horizon_years": 10,
            "event_label": "자영(창업) 상태 이탈 — 폐업·업종전환·재취업 포함",
            "cv_concordance": {"train": round(cv[0], 3), "test": round(cv[1], 3),
                               "test_std": round(cv[2], 3), "gap": round(cv[3], 3)}}


# ---------------------------------------------------------------- main
TREATMENTS = [("move", "이직"), ("startup", "창업"), ("enroll", "진학")]


def main() -> None:
    global MIN_TREATED
    ap = argparse.ArgumentParser(description="이직 외 treatment L3/L4 + 동적 처치효과")
    ap.add_argument("--max-horizon", type=int, default=MAX_HORIZON)
    ap.add_argument("--min-treated", type=int, default=MIN_TREATED)
    args = ap.parse_args()
    MIN_TREATED = args.min_treated

    ARTIFACTS.mkdir(parents=True, exist_ok=True)
    b = load_panel()
    base = transition_frame(b, horizon=1)
    report: dict = {"built_at": datetime.now(timezone.utc).isoformat(),
                    "age_band": [AGE_MIN, AGE_MAX], "min_treated": MIN_TREATED,
                    "source": "KLIPS 18-27차", "treatments": {}}
    dynamic: dict = {}

    for key, label in TREATMENTS:
        d = apply_treatment(base, key)
        n_t = int(d["T"].sum())
        entry = {"label": label, "n_rows": int(len(d)), "n_treated": n_t}
        print(f"\n=== {label}({key}) — 전이쌍 {len(d):,} / 처치 {n_t:,} "
              f"({n_t / max(len(d), 1):.2%}) ===")

        if n_t < MIN_TREATED:
            entry.update(trained=False,
                         reason=f"처치군 {n_t}건 < 최소 {MIN_TREATED}건 — "
                                f"신뢰구간이 너무 넓어 모델을 만들지 않음")
            report["treatments"][key] = entry
            print(f"  → 표본 부족. 모델 생성 안 함 ({entry['reason']})")
            continue

        # 동적 효과 프로파일은 모든 학습 가능 treatment 에 대해
        prof = dynamic_profile(b, key, label, args.max_horizon)
        if prof:
            dynamic[key] = {"source": "KLIPS 18-27차", "label": label,
                            "caveat": CAVEATS.get(key), "horizons": prof}

        # 창업만 신규 artifact 생성(이직은 klips_train.py 산출물이 이미 서빙 중)
        if key == "startup":
            art = train_causal(d, key, label)
            joblib.dump(art, ARTIFACTS / "econml_klips_startup.pkl")
            sp = build_selfemp_spells(b)
            joblib.dump(train_selfemp_survival(sp), ARTIFACTS / "lifelines_klips_startup.pkl")
            entry.update(trained=True, artifacts=["econml_klips_startup.pkl",
                                                  "lifelines_klips_startup.pkl"],
                         ate=round(art["ate"], 2),
                         linear_ate=round(art["linear_ate"], 2),
                         linear_ci=[round(v, 2) for v in art["linear_ci"]],
                         n_spells=int(len(sp)), caveat=CAVEATS.get(key))
        else:
            entry.update(trained=True, artifacts=[],
                         note="기존 klips_train.py 산출물 사용(econml_klips.pkl) — "
                              "여기서는 동적 효과 프로파일만 추가")
        report["treatments"][key] = entry

    report["dynamic_effects"] = {k: sorted(v["horizons"]) for k, v in dynamic.items()}
    (ARTIFACTS / "dynamic_effects.json").write_text(
        json.dumps(dynamic, ensure_ascii=False, indent=2), encoding="utf-8")
    (ARTIFACTS / "treatment_report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n[done] → {ARTIFACTS}/ (dynamic_effects.json, treatment_report.json)")


if __name__ == "__main__":
    main()
