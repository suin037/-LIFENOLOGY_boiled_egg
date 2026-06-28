"""
GOMS 원본(.SAV) → 정제 CSV 변환 스크립트.

사용법:
    python preprocess.py

원본 .SAV 는 SPSS 포맷이라 pyreadstat 으로 읽습니다.
"""

from pathlib import Path

import pandas as pd
import pyreadstat

RAW_PATH = Path("data/raw/GP19__2020.SAV")
OUT_PATH = Path("data/goms_clean.csv")

# 분석에 사용할 컬럼만 추려서 표준 이름으로 매핑 (실제 코드북 보고 채우세요)
COLUMN_MAP = {
    # "원본변수명": "정제후이름",
    # "G181AGE": "age",
    # "G181SEX": "sex",
    # "G181MAJORCAT": "major",
    # "G181WAGE": "monthly_wage",
}


def load_raw() -> pd.DataFrame:
    if not RAW_PATH.exists():
        raise FileNotFoundError(
            f"원본 파일이 없습니다: {RAW_PATH}\n"
            "data/raw/ 에 GP19__2020.SAV 를 배치하세요."
        )
    df, meta = pyreadstat.read_sav(str(RAW_PATH))
    print(f"[load] rows={len(df)}, cols={len(df.columns)}")
    return df


def clean(df: pd.DataFrame) -> pd.DataFrame:
    if COLUMN_MAP:
        df = df.rename(columns=COLUMN_MAP)[list(COLUMN_MAP.values())]
    # TODO: 결측 처리, 이상치 제거, 파생변수 생성
    df = df.dropna()
    return df


def main() -> None:
    df = load_raw()
    clean_df = clean(df)
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    clean_df.to_csv(OUT_PATH, index=False, encoding="utf-8-sig")
    print(f"[done] saved -> {OUT_PATH} ({len(clean_df)} rows)")


if __name__ == "__main__":
    main()
