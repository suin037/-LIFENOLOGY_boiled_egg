// ─────────────────────────────────────────────────────────────
// /simulate 응답 → 결과 화면이 읽는 형태({a, b})로 변환.
//
// 화면 컴포넌트들은 prediction.js(getPrediction) 의 필드 이름을 그대로 읽는다.
// 백엔드 compare 응답의 scenarios[A|B].raw 가 사실상 같은 계약(/predict 형태)이라
// 대부분 그대로 통과시키고, 아래 3가지만 손본다.
//
//  1) 선택별 근거 수준 보존 — 이직에만 L2/L3/L4 개인단위 모델을 적용한다.
//     유지·창업·진학·기타 선택에는 공통 생활지표와 관찰 기준선만 전달한다.
//  2) 생활지표 dimension 이름을 프론트 LIFE_DIMENSIONS 키에 맞춘다(아이콘·색 매칭용).
//  3) 백엔드가 주지 않는 값은 null 로 둔다. 절대 추정치를 만들어 채우지 않는다.
//     (descriptive_effect·down_ratio 가 그렇다 — 없으면 해당 UI 가 알아서 숨는다.)
// ─────────────────────────────────────────────────────────────

import { ACTION_CARDS } from "./prediction.js";

// 백엔드 생활지표의 dimension 표기 → 프론트 LIFE_DIMENSIONS 키
const DIMENSION_ALIAS = {
  "삶의질(청년)": "삶의질",
  "진학/취업": "진학·취업",
};

function normalizeLifeIndicators(list) {
  return (list || []).map((it) => ({
    dimension: DIMENSION_ALIAS[it.dimension] || it.dimension,
    indicator: it.indicator,
    value: it.value,
    unit: it.unit,
    group: it.group ?? null,
    source: it.source ?? null,
    n: it.n ?? null,
  }));
}

// 선택지별 소득 궤적. 엔진이 갈래별로 나눠 주는 건 '유지'와 '이직' 둘뿐이고,
// 창업·진학은 추적 데이터가 없어 기준선(비슷한 사람들의 실제 경로) 하나만 있다.
// 그 경우 isBaseline=true 로 표시해 화면이 "갈래별 궤적"인 척하지 않게 한다.
function pickTrajectory(raw, choice) {
  const byScenario = raw.scenario_trajectories || {};
  const picked = byScenario[choice];
  if (Array.isArray(picked) && picked.length) return { rows: picked, isBaseline: false };
  return { rows: raw.trajectory || [], isBaseline: true };
}

const maxYear = (rows, fallback) =>
  Array.isArray(rows) && rows.length ? Math.max(...rows.map((p) => p.year ?? 0)) : fallback;

function buildSide(scenario, choice, detail, profile, evidence, domainCov, domainStats, validatedPrediction, indicatorEvidence) {
  const raw = scenario?.raw || {};
  const { rows: trajectory, isBaseline } = pickTrajectory(raw, choice);
  const wellbeing = raw.wellbeing_trajectory || [];

  // 이직은 개인단위 모델, 창업은 artifact가 배포된 경우 개인단위 자영 이탈모델을 쓴다.
  // artifact가 없더라도 창업 risk_timeline에는 업종·규모별 기업생멸 통계가 들어온다.
  const hasIndividual = choice === "이직" || (choice === "창업" && raw.survival_months != null);
  const hasRisk = choice === "창업" || hasIndividual;

  return {
    choice,
    detail,
    meta: {
      age: profile?.age ?? null,
      occupation: profile?.major || profile?.occupation || "—",
      observe_years_income: maxYear(trajectory, 0),
      observe_years_wellbeing: maxYear(wellbeing, 0),
      source: "KLIPS·GOMS·YP · KNHANES·KWCS · KOSIS·KEDI (L1~L5)",
    },
    coverage: raw.coverage || scenario?.coverage || "",
    life_indicators: normalizeLifeIndicators(raw.life_indicators),
    trajectory,
    // true = 이 갈래 전용 궤적이 아니라 '비슷한 사람들'의 기준선(창업·진학은 추적 데이터 없음)
    trajectory_is_baseline: isBaseline,
    wellbeing_trajectory: wellbeing,
    satisfaction_facets: raw.satisfaction_facets || {},
    action_cards: ACTION_CARDS,
    narrative: "",

    expected_wage: hasIndividual ? raw.expected_wage ?? null : null,
    causal_effect: hasIndividual ? raw.causal_effect ?? null : null,
    // 인과 점추정의 95% 신뢰구간(있으면). 0을 포함하는지까지 화면이 판단할 수 있도록
    // ate·ci·method·source 를 통째로 넘긴다. 점추정만 보여주면 과신을 부른다.
    causal_ci: hasIndividual ? scenario?.confidence?.causal_effect_ci ?? null : null,
    confidence: hasIndividual ? scenario?.confidence || {} : {},
    // 백엔드는 '겉보기 효과'를 따로 주지 않는다. 없는 값을 만들지 않는다.
    descriptive_effect: null,
    survival_months: hasIndividual ? raw.survival_months ?? null : null,
    neighbors: hasIndividual ? raw.neighbors || [] : [],
    neighbor_changed_ratio: hasIndividual ? raw.neighbor_changed_ratio ?? null : null,
    down_ratio: null,
    risk_timeline: hasRisk ? raw.risk_timeline || {} : {},
    risk_label: hasRisk ? scenario?.regret_summary?.label ?? null : null,

    // 근거 수준(항목4) — 이 갈래가 어떤 강도의 근거인지 + 수치그래프 표시 정당성.
    evidence_level: evidence?.level || null,      // model | group_stat | rag | insufficient
    evidence_label: evidence?.label || null,      // "모델예측" 등
    // 정량 그래프 가드: false 면 이 영역엔 수치 데이터가 없어 그래프 대신 설명으로.
    quantitative_ok: domainCov ? domainCov.quantitative_ok !== false : true,
    graph_guard_note: domainCov?.guard_note || null,
    // 영역별 실측 집단통계 지표(항목3) — { domainKey: {label, evidence, indicators[]} }
    domain_stats: domainStats || {},
    // 새 후보 모델: 검증 집단효과와 실험적 개인 추정치가 분리된 원응답.
    validated_prediction: validatedPrediction || null,
    parallel_trajectory: validatedPrediction?.parallel_trajectory || null,
    observed_outcomes: validatedPrediction?.observed_outcomes || null,
    // 각 지표의 숫자와 그 숫자를 뒷받침하는 근거 수준을 분리한다.
    indicator_evidence: indicatorEvidence || null,
  };
}

/**
 * /simulate 원응답 → { a, b } (결과 화면 형태).
 * 수치를 하나라도 만들어내지 못하면 null 을 돌려준다 — 호출측이 목업으로 되돌리도록.
 *
 * @param {object} sim              runSimulateRaw() 응답
 * @param {{choiceA:string, choiceB:string, detailA?:string, detailB?:string}} ctx
 *        choiceA/B 는 사용자가 화면에서 고른 4분류(유지·이직·창업·진학) 라벨.
 */
export function mapSimulateToPair(sim, { choiceA, choiceB, detailA = "", detailB = "" }) {
  const cmp = sim?.compare;
  const A = cmp?.scenarios?.A;
  const B = cmp?.scenarios?.B;
  if (!A || !B) return null;

  const profile = cmp.profile || {};
  // 근거수준·영역지표·가드는 이제 /compare 응답(cmp)에 실려온다. (구 /simulate 최상위도 폴백 지원)
  const ev = cmp.evidence_levels || sim.evidence_levels || {};
  const dc = cmp.domain_coverage || sim.domain_coverage || {};
  const ds = cmp.domain_stats || sim.domain_stats || {};
  const vp = cmp.validated_predictions || sim.validated_predictions || {};
  const ie = cmp.indicator_evidence || sim.indicator_evidence || {};
  const a = buildSide(A, choiceA, detailA, profile, ev.A, dc.A, ds.A, vp.A, ie.A);
  const b = buildSide(B, choiceB, detailB, profile, ev.B, dc.B, ds.B, vp.B, ie.B);

  // 실데이터가 하나라도 있으면 실수치 모드. 연차별 궤적이 비어도(관측범위 밖/표본부족)
  // 이웃·인과·기대임금·지표 같은 실측이 있으면 목업으로 되돌리지 않는다.
  const hasReal = (s) =>
    (s.trajectory && s.trajectory.length) ||
    (s.neighbors && s.neighbors.length) ||
    s.causal_effect != null || s.expected_wage != null || s.survival_months != null ||
    s.parallel_trajectory?.status === "available" ||
    (s.life_indicators && s.life_indicators.length);
  if (!hasReal(a) && !hasReal(b)) return null;
  return { a, b };
}
