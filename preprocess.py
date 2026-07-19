"""
GOMS 원본(.SAV) -> 정제 CSV 변환 스크립트.

사용법:
    python preprocess.py --explore   # SAV 컬럼명/라벨 훑어보기 (COLUMN_MAP 채우기 전)
    python preprocess.py             # 변환 실행

train_models.py 가 기대하는 최종 컬럼:
    age, sex, major, monthly_wage, job_changed(0/1), tenure_months
"""

import argparse
from pathlib import Path

import pandas as pd
import pyreadstat

RAW_PATH = Path("data/raw/GP19__2020.SAV")
OUT_PATH = Path("data/goms_clean.csv")

# ⚠️ 실제 GP19 코드북 보고 원본변수명을 채우세요. (--explore 로 후보 확인)
COLUMN_MAP = {
    # "원본변수명": "정제후이름",
    # "g191age":  "age",            # 나이 (없으면 출생연도로 계산)
    # "g191sex":  "sex",            # 성별
    # "g191major": "major",         # 전공 계열
    # "g191wage": "monthly_wage",   # 월평균 근로소득(만원)
    # "g191jobmove": "job_changed", # 첫 직장 이동/이직 경험 (0/1로 변환 필요)
    # "g191tenure": "tenure_months",# 근속기간(개월)
}

REQUIRED = ["age", "sex", "major", "monthly_wage", "job_changed", "tenure_months"]


def load_raw() -> tuple[pd.DataFrame, object]:
    if not RAW_PATH.exists():
        raise FileNotFoundError(
            f"원본 파일이 없습니다: {RAW_PATH}\n"
            "data/raw/ 에 GP19__2020.SAV 를 배치하세요."
        )
    df, meta = pyreadstat.read_sav(str(RAW_PATH))
    print(f"[load] rows={len(df)}, cols={len(df.columns)}")
    return df, meta


def explore(df: pd.DataFrame, meta) -> None:
    """컬럼명 + SPSS 라벨을 키워드별로 출력 -> COLUMN_MAP 채우는 용."""
    labels = dict(zip(meta.column_names, meta.column_labels))
    keywords = ["연령", "나이", "성별", "전공", "임금", "소득", "월급",
                "이직", "이동", "근속", "기간", "직장"]
    for kw in keywords:
        hits = [(c, l) for c, l in labels.items() if l and kw in str(l)]
        if hits:
            print(f"\n### '{kw}' 포함 변수 ({len(hits)}개, 최대 15개 표시)")
            for c, l in hits[:15]:
                print(f"  {c:20s} {l}")


def clean(df: pd.DataFrame) -> pd.DataFrame:
    if not COLUMN_MAP:
        raise ValueError(
            "COLUMN_MAP 이 비어있습니다. "
            "python preprocess.py --explore 로 변수를 찾아 채워주세요."
        )
    df = df.rename(columns=COLUMN_MAP)[list(COLUMN_MAP.values())]

    # 숫자형 강제 변환 (SPSS 값라벨 잔재 제거)
    for c in ["age", "monthly_wage", "tenure_months"]:
        if c in df.columns:
            df[c] = pd.to_numeric(df[c], errors="coerce")

    # job_changed 를 0/1 로 (코드북 값에 맞게 수정: 예. 1=이동경험 있음)
    if "job_changed" in df.columns:
        df["job_changed"] = (pd.to_numeric(df["job_changed"], errors="coerce") == 1).astype(int)

    # 이상치: 임금 0 이하 / 상위 0.5% 절단
    if "monthly_wage" in df.columns:
        df = df[df["monthly_wage"] > 0]
        df = df[df["monthly_wage"] <= df["monthly_wage"].quantile(0.995)]

    # 필수 컬럼만 대상으로 결측 제거 (전체 dropna 금지!)
    present = [c for c in REQUIRED if c in df.columns]
    before = len(df)
    df = df.dropna(subset=present)
    print(f"[clean] {before} -> {len(df)} rows (결측/이상치 제거)")
    return df


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--explore", action="store_true")
    args = parser.parse_args()

    df, meta = load_raw()
    if args.explore:
        explore(df, meta)
        return

    clean_df = clean(df)
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    clean_df.to_csv(OUT_PATH, index=False, encoding="utf-8-sig")
    print(f"[done] saved -> {OUT_PATH} ({len(clean_df)} rows)")


if __name__ == "__main__":
    main()
