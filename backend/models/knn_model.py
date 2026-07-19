"""KNN: 입력과 유사한 실제 GOMS 응답자(평행우주의 나) 탐색.

v2: 스펙 + 상태·성향 9개 피처로 매칭. 입력에 없는 값은
학습 시 저장한 중앙값(encoders.pkl['medians'])으로 대체.
"""

from functools import lru_cache

import joblib
import numpy as np

from config import settings
from schemas import NeighborCase


@lru_cache(maxsize=1)
def _load():
    return (
        joblib.load(settings.artifacts_abspath / "knn.pkl"),
        joblib.load(settings.artifacts_abspath / "encoders.pkl"),
    )


def _vector(features: dict, enc: dict) -> np.ndarray:
    """feature dict -> 학습과 동일한 순서의 입력 벡터 (결측은 중앙값)."""
    med = enc["medians"]
    row = []
    for col in enc["feature_cols"]:
        if col == "sex_enc":
            row.append(enc["sex_map"].get(str(features.get("sex")), 0))
        elif col == "major_enc":
            row.append(enc["major_map"].get(str(features.get("major")), 0))
        else:
            v = features.get(col)
            row.append(med[col] if v is None else float(v))
    return np.array([row], dtype=float)


def find_neighbors(features: dict, k: int = 5) -> list[NeighborCase]:
    art, enc = _load()
    x = art["scaler"].transform(_vector(features, enc))
    dist, idx = art["model"].kneighbors(x, n_neighbors=k)

    ref = art["ref"]
    out = []
    for d, i in zip(dist[0], idx[0]):
        row = ref.iloc[int(i)]
        out.append(NeighborCase(
            similarity=float(1 / (1 + d)),
            monthly_wage=float(row["monthly_wage"]),
            job_category=str(row["major"]),
            satis_overall=float(row["satis_overall"]),
            life_satis=float(row["life_satis"]),
            job_changed=int(row["job_changed"]),
        ))
    return out
