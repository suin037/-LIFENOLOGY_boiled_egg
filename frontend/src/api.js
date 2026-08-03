// ─────────────────────────────────────────────────────────────
// 백엔드 /simulate 연동 + 응답 → 화면(MOCK_RESULT) 형태 어댑터.
// 엔진(L1~L5) 수치 + RAG 근거 + Claude 서사를 프론트 컴포넌트가 읽는 형태로 매핑한다.
// ─────────────────────────────────────────────────────────────

import { buildDisposition } from "./data/psychQuestions.js";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const availPts = (arr) => (arr || []).filter((p) => p && p.available);
const lastAvail = (arr) => {
  const a = availPts(arr);
  return a.length ? a[a.length - 1].value : null;
};

// 표준정규 CDF (소득이 기준선 아래일 확률 추정용)
function erf(x) {
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t +
      0.254829592) *
      t *
      Math.exp(-x * x);
  return x >= 0 ? y : -y;
}
const normCdf = (z) => 0.5 * (1 + erf(z / Math.SQRT2));

// income p25/p75(만원)로 정규분포 근사 → 기준소득 미만 비율(%)
function shareBelow(median, p25, p75, baseline) {
  if (median == null || p25 == null || p75 == null || !baseline) return null;
  const sigma = Math.max((p75 - p25) / 1.349, 1e-6);
  return Math.round(normCdf((baseline - median) / sigma) * 100);
}

function toOption(scen, label, baseline, ind) {
  const inc = availPts(scen.income);
  const first = inc.length ? inc[0].value : null;
  const last = inc.length ? inc[inc.length - 1].value : null;
  const lastPt = inc.length ? inc[inc.length - 1] : {};
  const change = first && last ? +(((last - first) / first) * 100).toFixed(1) : 0;

  const satis = scen.satisfaction_summary?.latest ?? 3.5; // 1~5
  const growth = lastAvail(scen.growth_potential) ?? 0; // %
  const regret = scen.regret_summary?.worst_value ?? 0; // %
  const base = baseline || first || 300;

  const down = shareBelow(last, lastPt.p25, lastPt.p75, base) ?? Math.max(0, Math.round(30 - change));
  const n = inc.length ? Math.max(...inc.map((p) => p.sample_n || 0)) : scen.satisfaction_summary?.sample_n || 0;

  // 레이더 3지표(0~100). 백엔드 indicators(0~1) 정본 사용, 없으면 파생 폴백.
  const scores = ind
    ? {
        경제: clamp(Math.round((ind["경제적안정도"] ?? 0.5) * 100), 8, 100),
        성장: clamp(Math.round((ind["성장가능성"] ?? 0.5) * 100), 8, 100),
        삶의질: clamp(Math.round((ind["삶의질"] ?? 0.5) * 100), 8, 100),
      }
    : {
        경제: clamp(Math.round(35 + change * 1.4 + (last ? (last - 300) / 8 : 0)), 8, 100),
        성장: clamp(Math.round(45 + growth * 1.5), 8, 100),
        삶의질: clamp(Math.round(satis * 20 - regret * 0.25), 8, 100),
      };
  return { label, n: n || 30, income_change_med: change, income_down_pct: down, scores };
}

// 이직(A) 인과: 겉보기(관측) vs 순수효과(EconML). 만원 → % 변환.
function toCausal(scenA, baseline, optA) {
  const raw = scenA.raw || {};
  const conf = scenA.confidence?.causal_effect || {};
  const base = baseline || 320;
  const ateWon = conf.linear_ate ?? conf.ate ?? raw.causal_effect ?? null; // 만원
  const effect = ateWon != null ? +((ateWon / base) * 100).toFixed(1) : 6.0;
  const descriptive = Math.max(optA.income_change_med, effect); // 관측(편향 포함) ≥ 순수효과
  let ci;
  const ciWon = conf.linear_ci || conf.ate_ci;
  if (Array.isArray(ciWon) && ciWon.length === 2) {
    ci = [+((ciWon[0] / base) * 100).toFixed(1), +((ciWon[1] / base) * 100).toFixed(1)];
  } else {
    ci = [+(effect * 0.7).toFixed(1), +(effect * 1.3).toFixed(1)];
  }
  return { descriptive, effect, ci };
}

// 이직(A) 이탈/후회 리스크 → survival 곡선(0~1)
function toSurvival(scenA) {
  const pts = availPts(scenA.regret).map((p) => ({ year: p.year, risk: (p.value || 0) / 100 }));
  return { points: pts.length ? pts : [{ year: 1, risk: 0 }] };
}

export function mapSimulateToResult(sim) {
  const cmp = sim.compare;
  const prof = cmp.profile || {};
  const A = cmp.scenarios.A;
  const B = cmp.scenarios.B;
  const baseline = prof.monthly_wage || (availPts(A.income)[0]?.value) || 300;

  const optA = toOption(A, cmp.choice_a, baseline, sim.indicators?.A);
  const optB = toOption(B, cmp.choice_b, baseline, sim.indicators?.B);

  const incYears = availPts(A.income).map((p) => p.year);
  const nSample = Math.max(optA.n, optB.n);

  const nar = sim.narrative || {};

  return {
    meta: {
      age: prof.age,
      occupation: prof.major || "—",
      n_sample: nSample,
      observe_years: incYears.length ? Math.max(...incYears) : 5,
      source: "GOMS · YP2021 · KLIPS (L1~L5)",
    },
    option_a: optA,
    option_b: optB,
    causal: toCausal(A, baseline, optA),
    survival: toSurvival(A),
    scenario: {
      a: nar.a || "",
      b: nar.b || "",
      comparison: nar.comparison || "",
    },
    // 부가: 일기·근거(화면 확장용)
    _diary: sim.diary,
    _evidence: sim.evidence,
    _support: sim.support_note,
    _api_used: sim.api_used,
  };
}

function buildSimulateBody({ profile, choiceA, choiceB, choiceADetail, choiceBDetail, choiceADomains, choiceBDomains, diary }) {
  const body = {
    profile: {
      age: profile.age,
      sex: profile.sex || "1",
      major: profile.major || profile.occupation || "공학",
      monthly_wage: profile.income ?? profile.monthly_wage ?? null,
      edu_level: profile.edu_level ?? 7,
      // 성향 개인화 입력: 온보딩/설정 가치 순위(카드 id). 있을 때만 실어 보낸다.
      // 백엔드가 qmode.value_ranking.axis_weights 로 가중치 변환 → 강조·초점·서사 개인화.
      ...(profile.value_ranking?.length ? { value_ranking: profile.value_ranking } : {}),
    },
    choice_a: choiceA,
    choice_b: choiceB,
  };
  if (choiceADetail?.trim()) body.choice_a_detail = choiceADetail.trim();
  if (choiceBDetail?.trim()) body.choice_b_detail = choiceBDetail.trim();
  // 새 삶의 영역 계약용 필드. 현재 백엔드는 extra 필드를 무시하므로 기존 API와 호환된다.
  if (choiceADomains?.length) body.choice_a_domains = choiceADomains;
  if (choiceBDomains?.length) body.choice_b_domains = choiceBDomains;
  if (diary) body.diary = diary;

  // 심리 성향 서술(MBTI + 서술형 답변) → disposition_block + 답변 수(확신도).
  // 백엔드가 서사 프롬프트에 주입 → 개인화 심화.
  const disp = buildDisposition(profile);
  if (disp.block) {
    body.disposition_block = disp.block;
    body.diary_n_answers = disp.n;
  }

  return body;
}

export async function runSimulateRaw(args) {
  const body = buildSimulateBody(args);

  const res = await fetch(`${API_BASE}/simulate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`simulate ${res.status}`);
  return res.json();
}

export async function runSimulate(args) {
  return mapSimulateToResult(await runSimulateRaw(args));
}

export async function generateSceneImages({ avatarBlob, choiceA, choiceB, narrative }) {
  const storyText = (story) => {
    if (typeof story === "string") return story;
    const detail = story?.detail || {};
    return [story?.summary, detail.present, detail.transition, detail.future, story?.gain, story?.cost]
      .filter(Boolean)
      .join(" ");
  };
  const form = new FormData();
  form.append("avatar", avatarBlob, "avatar.png");
  form.append("choice_a", choiceA);
  form.append("choice_b", choiceB);
  form.append("narrative_a", storyText(narrative.a));
  form.append("narrative_b", storyText(narrative.b));
  form.append("visual_a", JSON.stringify(narrative.visual_a || {}));
  form.append("visual_b", JSON.stringify(narrative.visual_b || {}));

  const res = await fetch(`${API_BASE}/visualize`, { method: "POST", body: form });
  if (!res.ok) {
    let detail = `visualize ${res.status}`;
    try { detail = (await res.json()).detail || detail; } catch { /* no-op */ }
    throw new Error(detail);
  }
  return res.json();
}
