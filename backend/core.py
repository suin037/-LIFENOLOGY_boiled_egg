"""예측 코어 — `/predict` 와 `/compare` 가 공유하는 단일 진실.

기존 main.predict() 의 본문을 그대로 옮긴 것. 엔드포인트는 이 함수를 호출만 한다.
(compare 는 이 함수를 A/B 두 번 호출해 비교 뷰로 재구성한다.)
"""

from schemas import PredictRequest, PredictResponse
from models.knn_model import find_neighbors
from models.econml_model import estimate_effect
from models.lifelines_model import estimate_survival, risk_timeline
from rulebase import query_life_indicators, startup_closure_timeline
from trajectory import (
    project_trajectory, project_wellbeing_trajectory, project_satisfaction_facets,
)
from utils.scoring import build_feature_vector
from utils.claude_api import generate_narrative


def choice_kind(choice: str) -> str:
    """자유입력 choice 를 이직/창업/진학 3분류로 정규화."""
    c = str(choice)
    if any(k in c for k in ("창업", "사업", "자영", "startup")):
        return "창업"
    if any(k in c for k in ("진학", "대학원", "유학", "학업", "석사", "박사")):
        return "진학"
    return "이직"


def run_prediction(req: PredictRequest, with_narrative: bool = True) -> PredictResponse:
    """현재의 나 + 진로 선택 1개 → 평행우주 추정(L1~L5).

    with_narrative=False 면 narrative(Claude API) 호출을 건너뛴다
    (compare 는 A/B 두 번 호출하므로 기본적으로 서사를 생략해 비용·지연을 줄인다).
    """
    features = build_feature_vector(req)
    kind = choice_kind(req.choice)

    # Layer 1: 룰베이스 생활지표 패널 — 선택지 무관 항상 제공
    life_indicators = query_life_indicators(features)

    # Layer 5: 종단 궤적 — 비슷한 사람들의 향후 N년 실제 경로 분포
    trajectory = project_trajectory(features)                       # 소득(KLIPS, 10년)
    wellbeing_trajectory = project_wellbeing_trajectory(features)   # 종합 만족도(YP, 청년·단기)
    satisfaction_facets = project_satisfaction_facets(features)     # facet별 만족도(YP)
    scenario_trajectories: dict = {}

    # 개인단위 레이어(L2/L3/L4)는 '이직'에만 인과 데이터가 있어 적용. 나머지는 None.
    neighbors: list = []
    expected_wage = changed_ratio = effect = survival = None
    timeline: dict = {}

    if kind == "이직":
        neighbors = find_neighbors(features)
        effect = estimate_effect(features, choice=req.choice)
        survival = estimate_survival(features)
        timeline = risk_timeline(features)
        expected_wage = sum(n.monthly_wage or 0 for n in neighbors) / max(len(neighbors), 1)
        changed_ratio = sum(1 for n in neighbors if n.job_changed) / max(len(neighbors), 1)
        coverage = "이직: 개인단위 매칭(L2)·인과(L3)·생존(L4) + 생활지표(L1)"

        # 평행우주: 기준 경로(유지) vs 이직(기준 + L3 인과효과, 지속 가정)
        if trajectory and effect is not None:
            move = [
                {**p,
                 "income_p25": round(p["income_p25"] + effect, 1),
                 "income_p50": round(p["income_p50"] + effect, 1),
                 "income_p75": round(p["income_p75"] + effect, 1)}
                for p in trajectory
            ]
            scenario_trajectories = {"유지": trajectory, "이직": move}
    elif kind == "창업":
        timeline = startup_closure_timeline(features)      # 폐업 누적확률
        coverage = ("창업: 생활지표(L1) + 창업 생존/폐업 통계. "
                    "개인단위 인과·매칭은 창업 추적 데이터 부재로 미제공")
    else:  # 진학
        coverage = ("진학: 생활지표(L1) + 계열별 취업률·진학률(KEDI). "
                    "개인단위 인과·매칭은 진학 추적 데이터 부재로 미제공")

    # narrative 는 3번 팀원 RAG/Claude API 담당. 키 미설정·호출 실패 시에도
    # 예측(L1~L4)은 정상 반환되도록 방어.
    narrative = ""
    if with_narrative:
        try:
            narrative = generate_narrative(
                req,
                expected_wage or 0,
                effect or 0,
                survival or 0,
                persona_block=req.persona_block,
            )
        except Exception:
            narrative = ""

    return PredictResponse(
        choice=req.choice,
        coverage=coverage,
        expected_wage=expected_wage,
        causal_effect=effect,
        survival_months=survival,
        neighbors=neighbors,
        neighbor_changed_ratio=changed_ratio,
        risk_timeline=timeline,
        life_indicators=life_indicators,
        trajectory=trajectory,
        wellbeing_trajectory=wellbeing_trajectory,
        satisfaction_facets=satisfaction_facets,
        scenario_trajectories=scenario_trajectories,
        narrative=narrative,
    )
