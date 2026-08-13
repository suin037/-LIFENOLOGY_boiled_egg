"""예측 코어 — `/predict` 와 `/compare` 가 공유하는 단일 진실.

기존 main.predict() 의 본문을 그대로 옮긴 것. 엔드포인트는 이 함수를 호출만 한다.
(compare 는 이 함수를 A/B 두 번 호출해 비교 뷰로 재구성한다.)
"""

from schemas import PredictRequest, PredictResponse
from choice_classifier import classify, extract_startup_context
from models.knn_model import find_neighbors
from models.econml_model import estimate_effect
from models.lifelines_model import estimate_survival, risk_timeline
from rulebase import (
    query_choice_indicators, query_life_indicators, startup_closure_timeline,
    startup_context_meta,
)
from trajectory import (
    project_trajectory, project_wellbeing_trajectory, project_satisfaction_facets,
)
from utils.scoring import build_feature_vector
from utils.claude_api import generate_narrative


def choice_kind(choice: str) -> str:
    """자유입력을 근거가 있는 유형으로만 정규화한다."""
    return classify(choice).kind


def run_prediction(req: PredictRequest, with_narrative: bool = True) -> PredictResponse:
    """현재의 나 + 진로 선택 1개 → 평행우주 추정(L1~L5).

    with_narrative=False 면 narrative(Claude API) 호출을 건너뛴다
    (compare 는 A/B 두 번 호출하므로 기본적으로 서사를 생략해 비용·지연을 줄인다).
    """
    features = build_feature_vector(req)
    kind = choice_kind(req.choice)

    if kind == "창업":
        features["ksic_section"] = extract_startup_context(req.choice).ksic_section

    # Layer 1: 룰베이스 생활지표 패널 — 선택지 무관 항상 제공
    life_indicators = query_life_indicators(features) + query_choice_indicators(features)

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
        available_layers = ["생활지표(L1)"]
        try:
            neighbors = find_neighbors(features)
            available_layers.append("개인단위 매칭(L2)")
        except (FileNotFoundError, RuntimeError):
            neighbors = []
        try:
            effect = estimate_effect(features, treatment="move")
            available_layers.append("인과(L3)")
        except (FileNotFoundError, RuntimeError):
            effect = None
        try:
            survival = estimate_survival(features)
            timeline = risk_timeline(features)
            available_layers.append("생존(L4)")
        except (FileNotFoundError, RuntimeError):
            survival = None
            timeline = {}
        expected_wage = sum(n.monthly_wage or 0 for n in neighbors) / max(len(neighbors), 1)
        if not neighbors:
            expected_wage = None
            changed_ratio = None
        else:
            changed_ratio = sum(1 for n in neighbors if n.job_changed) / len(neighbors)
        coverage = "이직: " + "·".join(available_layers)
        if survival is None:
            coverage += " (생존 L4는 KLIPS artifact 부재로 미제공)"

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
        context = startup_context_meta(features)
        available_layers = ["업종·규모별 기업생존통계(L1)"]
        try:
            effect = estimate_effect(features, treatment="startup")
            available_layers.append("창업 소득 관측효과(L3·주의 필요)")
        except (FileNotFoundError, RuntimeError):
            effect = None
        try:
            survival = estimate_survival(features, treatment="startup")
            timeline = risk_timeline(features, years=(1, 2, 3, 4, 5), treatment="startup")
            available_layers.append("자영상태 이탈모델(L4)")
        except (FileNotFoundError, RuntimeError):
            survival = None
            timeline = startup_closure_timeline(features)
        coverage = "창업: " + "·".join(available_layers)
        if context:
            coverage += f". 적용 기준: {context['label']}"
        if survival is None:
            coverage += ". 개인단위 artifact 미배포로 업종별 기업생멸통계를 사용"
        if effect is not None:
            coverage += ". 소득은 임금과 사업소득의 개념이 달라 참고값으로만 해석"
    elif kind == "진학":
        coverage = ("진학: 생활지표(L1) + 계열별 취업률·진학률(KEDI). "
                    "개인단위 인과·매칭은 진학 추적 데이터 부재로 미제공")
    elif kind == "유지":
        coverage = "현상 유지: 생활지표(L1) + 관측 기준 궤적. 이직 인과효과는 적용하지 않음"
    else:
        coverage = "기타 선택: 생활지표(L1)만 제공. 해당 선택의 전용 예측모델은 없음"

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
