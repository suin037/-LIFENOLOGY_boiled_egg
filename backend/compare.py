"""A vs B 비교 출력 계층 (`/compare`).

핵심 서사 = **"너와 데이터가 비슷한 사람들이 이 길을 갔을 때"** 의 평행우주.
주인공 3지표는 **만족도 · 소득 · 후회**. 기존 예측(run_prediction)을 정규화해 재구성하며
**엔진(L1~L5)·`/predict` 계약은 그대로** 둔다.

3지표 매핑(전부 기존 레이어에서 도출 — 새 모델 없음):
  · 만족도  = 종합 만족도 궤적(1~5, YP 청년패널, L5). '만족도가 이렇게 변하더라'
  · 소득    = 소득 궤적 중앙값·분포(L5). 이직은 L3 인과효과 반영 경로 사용
  · 후회    = 이직 이탈확률(L4) / 창업 폐업확률(생멸) / 진학은 이탈데이터 없음

시점(1·3·5·10)은 데이터가 지지하는 곳만 채우고, 없으면 available=false 로 정직하게 비운다
(우리 데이터가 방대하지 않다는 걸 숨기지 않고, 지어내지 않는다).
"""

from schemas import (
    CompareRequest, CompareResponse, ScenarioView, IndicatorPoint,
    FacetTrajectory, FacetPoint, PredictRequest, PredictResponse,
)
from core import run_prediction, choice_kind
from utils.scoring import build_feature_vector
from models.lifelines_model import model_confidence
from models.econml_model import effect_confidence

SNAPSHOTS = [1, 3, 5, 10]
HEALTH_DIMS = {"정신건강", "신체건강", "직업환경"}

# 만족도 facet: 원변수 → (표시 이름, 묶음 차원)
FACET_META = {
    "satis_work":      ("직무 만족", "직무"),
    "satis_growth":    ("자기발전(성장) 만족", "성장"),
    "satis_income":    ("소득 만족", "소득"),
    "satis_stability": ("고용안정 만족", "안정"),
    "satis_future":    ("장래성 만족", "미래"),
}


def _point_at(traj: list, year: int):
    """궤적 리스트에서 특정 연차 시점을 찾는다(없으면 None)."""
    for p in traj:
        if p.year == year:
            return p
    return None


def _income_path(pr: PredictResponse, kind: str) -> list:
    """이 선택의 '선택 반영' 소득 궤적.

    이직은 평행우주 이직 경로(기준+L3 인과)를, 창업/진학은 관측 기준 궤적을 쓴다.
    """
    if kind == "이직" and pr.scenario_trajectories.get("이직"):
        return pr.scenario_trajectories["이직"]
    return pr.trajectory


# ---------------------------------------------------------------- 주인공: 만족도
def _satisfaction(pr: PredictResponse) -> list[IndicatorPoint]:
    wb = pr.wellbeing_trajectory
    src = "YP 청년패널 만족도 궤적(L5)"
    out = []
    for y in SNAPSHOTS:
        p = _point_at(wb, y)
        if p is None:
            note = ("청년패널(YP) 관측범위(약 4년) 밖" if wb
                    else "만족도 궤적 없음(청년 범위 밖이거나 표본 부족)")
            out.append(IndicatorPoint(year=y, available=False, note=note))
        else:
            out.append(IndicatorPoint(
                year=y, value=float(p.satis_p50), p25=float(p.satis_p25),
                p75=float(p.satis_p75), unit="점(1~5)", sample_n=p.sample_n, source=src))
    return out


def _satisfaction_summary(pr: PredictResponse) -> dict | None:
    """'만족도가 이렇게 변하더라' 한 줄 요약 (시작→최근 관측)."""
    wb = pr.wellbeing_trajectory
    if not wb:
        return None
    start, latest = wb[0], wb[-1]
    delta = round(float(latest.satis_p50) - float(start.satis_p50), 2)
    direction = "상승" if delta > 0.05 else ("하락" if delta < -0.05 else "유지")
    return {
        "start_year": start.year, "start": float(start.satis_p50),
        "latest_year": latest.year, "latest": float(latest.satis_p50),
        "delta": delta, "direction": direction,
        "span_years": latest.year - start.year,
        "sample_n": latest.sample_n, "scale": "1~5",
        "source": "YP 청년패널 만족도 궤적(L5)",
    }


def _satisfaction_facets(pr: PredictResponse) -> list[FacetTrajectory]:
    """만족도 5개 facet(직무·자기발전·소득·고용안정·장래성)별 궤적 + 변화 방향.

    '이 길 간 사람들은 소득 만족은 높은데 장래성 만족은 낮더라' 같은 결을 만든다.
    """
    out = []
    for key, (label, dim) in FACET_META.items():
        pts = pr.satisfaction_facets.get(key) or []
        if not pts:
            continue
        start, latest = float(pts[0]["mean"]), float(pts[-1]["mean"])
        delta = round(latest - start, 2)
        direction = "상승" if delta > 0.05 else ("하락" if delta < -0.05 else "유지")
        out.append(FacetTrajectory(
            key=key, label=label, dimension=dim,
            points=[FacetPoint(year=p["year"], value=float(p["mean"]), sample_n=p["sample_n"])
                    for p in pts],
            start=start, latest=latest, delta=delta, direction=direction,
            scale="1~5", source="YP 청년패널(L5)"))
    return out


def _regret_summary(pr: PredictResponse, kind: str) -> dict | None:
    """후회 리스크 한 줄 요약 — 관측 범위 내 '가장 나쁜(높은)' 누적확률."""
    if kind == "진학":
        return None
    rt = {y: v for y, v in pr.risk_timeline.items()}
    if not rt:
        return None
    worst_year = max(rt)
    label = "이탈확률" if kind == "이직" else "폐업확률"
    src = "lifelines 생존분석(L4)" if kind == "이직" else "기업생멸행정통계"
    return {"label": label, "worst_year": worst_year,
            "worst_value": round(float(rt[worst_year]) * 100, 1),
            "unit": "%", "source": src}


# ---------------------------------------------------------------- 주인공: 소득
def _income(income_path: list, kind: str) -> list[IndicatorPoint]:
    src = "KLIPS 종단 소득 궤적(L5)" + (" + 이직 인과(L3)" if kind == "이직" else "")
    out = []
    for y in SNAPSHOTS:
        p = _point_at(income_path, y)
        if p is None:
            out.append(IndicatorPoint(year=y, available=False,
                                      note="해당 연차까지 추적된 유사 표본 부족(관측범위 밖)"))
        else:
            out.append(IndicatorPoint(
                year=y, value=float(p.income_p50), p25=float(p.income_p25),
                p75=float(p.income_p75), unit="만원", sample_n=p.sample_n, source=src))
    return out


def _growth_potential(income_path: list) -> list[IndicatorPoint]:
    base = _point_at(income_path, 0)
    base_income = float(base.income_p50) if base and base.income_p50 else None
    src = "L5 소득 궤적 기울기(현재 대비)"
    out = []
    for y in SNAPSHOTS:
        p = _point_at(income_path, y)
        if p is None or not base_income:
            out.append(IndicatorPoint(year=y, available=False,
                                      note="기준(현재) 또는 해당 연차 소득 궤적 없음"))
        else:
            growth = round((float(p.income_p50) / base_income - 1) * 100, 1)
            out.append(IndicatorPoint(year=y, value=growth, unit="%(현재 대비 소득)",
                                      sample_n=p.sample_n, source=src))
    return out


# ---------------------------------------------------------------- 주인공: 후회
def _regret(pr: PredictResponse, kind: str) -> list[IndicatorPoint]:
    out = []
    if kind == "진학":
        for y in SNAPSHOTS:
            out.append(IndicatorPoint(
                year=y, available=False,
                note="진학은 개인단위 이탈 추적 데이터 없음 — choice_context 의 계열 취업률/진학률로 대체"))
        return out

    rt = pr.risk_timeline  # 이직=이탈확률 / 창업=폐업확률 (int 연차 키)
    if kind == "이직":
        unit, src = "%(이탈확률)", "lifelines 생존분석(L4)"
    else:
        unit, src = "%(폐업확률)", "기업생멸행정통계"
    for y in SNAPSHOTS:
        v = rt.get(y)
        if v is None:
            out.append(IndicatorPoint(year=y, available=False,
                                      note="모델 신뢰 관측범위 밖(과대추정 방지로 미제공)"))
        else:
            out.append(IndicatorPoint(year=y, value=round(float(v) * 100, 1),
                                      unit=unit, source=src))
    return out


# ---------------------------------------------------------------- 맥락 필터
def _choice_context(pr: PredictResponse, kind: str) -> list:
    """선택 유형에 맞는 맥락만 (이직은 없음, 창업=생존율, 진학=취업률/진학률)."""
    if kind == "창업":
        return [li for li in pr.life_indicators if li.dimension == "창업"]
    if kind == "진학":
        return [li for li in pr.life_indicators if li.dimension == "진학/취업"]
    return []


def _scenario_view(profile_dict: dict, choice: str, detail: str | None = None) -> ScenarioView:
    kind = choice_kind(choice)
    # UI의 choice는 "창업"처럼 정규화돼 있으므로 업종·규모는 자유입력 detail에서 읽는다.
    # detail이 엉뚱한 유형이면 정규화 선택을 유지해 잘못된 모델 라우팅을 막는다.
    model_choice = detail.strip() if detail and choice_kind(detail) == kind else choice
    req = PredictRequest(**profile_dict, choice=model_choice)
    # 비교는 A/B 2회 호출 → 서사는 생략(3번 RAG가 최종 화면에서 담당)
    pr = run_prediction(req, with_narrative=False)

    features = build_feature_vector(req)
    income_path = _income_path(pr, kind)

    confidence: dict = {}
    if kind in {"이직", "창업"}:
        treatment = "startup" if kind == "창업" else "move"
        mc = model_confidence(features, treatment=treatment)
        if mc:
            confidence["survival_c_index"] = mc
        ec = effect_confidence(features, treatment=treatment)
        if ec:
            confidence["causal_effect_ci"] = ec

    return ScenarioView(
        choice=choice,
        kind=kind,
        coverage=pr.coverage,
        satisfaction=_satisfaction(pr),
        satisfaction_summary=_satisfaction_summary(pr),
        satisfaction_facets=_satisfaction_facets(pr),
        income=_income(income_path, kind),
        regret=_regret(pr, kind),
        regret_summary=_regret_summary(pr, kind),
        growth_potential=_growth_potential(income_path),
        health_context=[li for li in pr.life_indicators if li.dimension in HEALTH_DIMS],
        choice_context=_choice_context(pr, kind),
        confidence=confidence,
        raw=pr,
    )


def build_comparison(req: CompareRequest) -> CompareResponse:
    profile_dict = req.profile.model_dump()
    a = _scenario_view(profile_dict, req.choice_a, getattr(req, "choice_a_detail", None))
    b = _scenario_view(profile_dict, req.choice_b, getattr(req, "choice_b_detail", None))

    notes = []
    if a.kind == b.kind:
        notes.append(f"두 선택지가 같은 유형({a.kind})으로 분류돼 비교 결과가 거의 동일할 수 있음")
    if "이직" not in (a.kind, b.kind):
        notes.append("두 선택 모두 개인단위 인과(L3) 미적용 — 소득 궤적은 '그 선택을 한 비슷한 사람들'의 "
                     "관측 경로이지 선택이 만든 순효과가 아님(후회·선택맥락 카드로 비교 권장)")

    # 만족도는 아직 선택(A/B)에 따라 갈리지 않는다(프로필 기준 궤적) — 정직하게 알림
    if a.satisfaction_summary or b.satisfaction_summary:
        notes.append("만족도 궤적은 현재 프로필 기준(선택 A/B로 아직 분기 안 됨) — "
                     "'비슷한 사람들의 전반적 만족도 변화' 배경으로 해석(선택별 분기는 데이터 확장 과제)")

    # 이직 인과효과 95% CI 가 0 을 포함하면 소득 격차를 단정하지 말라고 경고
    for sc in (a, b):
        ci = sc.confidence.get("causal_effect_ci")
        if ci and ci.get("ci95_low") is not None and ci["ci95_low"] < 0 < ci["ci95_high"]:
            notes.append(f"'{sc.choice}' 인과효과 95% CI가 0을 포함"
                         f"({ci['ci95_low']:+.1f}~{ci['ci95_high']:+.1f}만) — "
                         "소득 격차를 '확실한 효과'로 단정 말 것(점추정 대신 구간으로 표현)")

    return CompareResponse(
        profile=req.profile,
        snapshots=SNAPSHOTS,
        choice_a=req.choice_a,
        choice_b=req.choice_b,
        scenarios={"A": a, "B": b},
        note=" / ".join(notes),
    )
