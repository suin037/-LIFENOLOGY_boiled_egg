"""KNN: 입력과 유사한 실제 GOMS 응답자(평행우주의 나) 탐색."""

from schemas import NeighborCase

# TODO: 학습 시 fit 한 NearestNeighbors + 원본 df 를 artifacts 에서 로드
# from joblib import load
# _knn = load(settings.artifacts_abspath / "knn.pkl")


def find_neighbors(features: dict, k: int = 5) -> list[NeighborCase]:
    """feature 벡터와 가장 가까운 k 개 사례를 반환."""
    # TODO: 실제 _knn.kneighbors(...) 결과로 교체
    return [
        NeighborCase(similarity=0.0, monthly_wage=0.0, job_category="stub")
        for _ in range(k)
    ]
