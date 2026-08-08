// ─────────────────────────────────────────────────────────────
// 일기 신호 — 최근 2~4주 일기·체크인에서 '이직 고민'과 관련한 상태를 뽑는다.
//
// 정직선(중요): 이 신호는 예측 숫자(KLIPS 생존분석·인과효과)를 바꾸지 않는다.
//   · 무엇을 비교할지 제안하고(반복되는 고민 감지),
//   · 통계 결과를 "내 기준"으로 해석하는 재료로만 쓴다.
// 키워드 기반이라 정밀 측정이 아니라 "기록에서 드러난" 수준임을 화면에서도 그대로 밝힌다.
// ─────────────────────────────────────────────────────────────
import { loadUniverse, todayKey } from "./myUniverse.js";
import { CARD_BY_ID } from "./valueCards.js";

// 신호별 사전. 표현이 겹칠 수 있어 '드러난 정도'로만 읽는다(정밀 분류 아님).
const LEX = {
  jobChange: {
    label: "이직 고민",
    words: ["이직", "퇴사", "그만두", "그만둘", "옮기", "이력서", "면접", "경력직", "다른 회사", "회사를 떠"],
    axis: "성장",
  },
  jobDissatisfaction: {
    label: "직무 불만",
    words: ["상사", "야근", "회의", "눈치", "압박", "실적", "불만", "지친", "지쳐", "버티", "꼰대", "갈굼", "혼났", "업무가 많", "일이 많"],
    axis: "성장",
  },
  growthStagnation: {
    label: "성장 정체",
    words: ["정체", "지루", "반복", "똑같", "그대로", "도태", "배울 게 없", "성장이 없", "권태", "매너리즘"],
    axis: "성장",
  },
  stabilityPreference: {
    label: "안정 선호",
    words: ["안정", "안전", "불안", "무섭", "무서워", "두렵", "리스크", "위험", "포기", "놓기", "겁", "확실"],
    axis: "안정",
  },
  burnout: {
    label: "번아웃·소진",
    words: ["번아웃", "소진", "방전", "무기력", "탈진", "의욕이 없", "쉬고 싶", "지쳤"],
    axis: "안정",
  },
};

function textOf(c) {
  const parts = [c.text, c.note];
  if (Array.isArray(c.answers)) for (const qa of c.answers) parts.push(qa?.a);
  else if (c.answers && typeof c.answers === "object") parts.push(...Object.values(c.answers));
  return parts.filter(Boolean).join(" ");
}

function daysBetween(dateKey, ref) {
  return Math.round((new Date(ref + "T00:00:00") - new Date(dateKey + "T00:00:00")) / 86400000);
}

const avg = (arr) => (arr.length ? arr.reduce((s, x) => s + x, 0) / arr.length : null);

/**
 * 최근 windowDays 일의 일기에서 신호를 계산한다.
 * @returns {{ok:boolean, windowDays:number, n:number, days:number,
 *   signals:{key,label,days,intensity}[], jobChangeDays:number,
 *   moodTrend:number|null, revealed:{axis,label}|null }}
 */
export function computeDiarySignals({ windowDays = 28 } = {}, s = loadUniverse()) {
  const today = todayKey();
  const recent = s.checkins.filter((c) => {
    if (c.empty) return false;
    const d = daysBetween(c.date, today);
    return d >= 0 && d <= windowDays;
  });
  if (!recent.length) return { ok: false, windowDays, n: 0, days: 0, signals: [], jobChangeDays: 0, moodTrend: null, revealed: null };

  // 신호별로 "며칠에 걸쳐 나타났나"를 센다(하루에 여러 번은 1로).
  const hitDays = {};
  for (const key of Object.keys(LEX)) hitDays[key] = new Set();
  for (const c of recent) {
    const t = textOf(c);
    if (!t) continue;
    for (const [key, def] of Object.entries(LEX)) {
      if (def.words.some((w) => t.includes(w))) hitDays[key].add(c.date);
    }
  }

  const signals = Object.entries(LEX).map(([key, def]) => {
    const days = hitDays[key].size;
    return { key, label: def.label, axis: def.axis, days, intensity: days / recent.length };
  });

  // 기분 추세: 창 전반부 vs 후반부 평균 valence (번아웃/에너지 하강의 대리 지표).
  const moods = recent
    .filter((c) => c.valence != null)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((c) => c.valence);
  let moodTrend = null;
  if (moods.length >= 4) {
    const mid = Math.floor(moods.length / 2);
    moodTrend = +(avg(moods.slice(mid)) - avg(moods.slice(0, mid))).toFixed(2);
  }

  // 기록에서 드러난 무게중심 = 신호를 가치 축(성장/안정)으로 합산해 우세한 축.
  // 단일 신호가 아니라 축 단위로 봐야 "선택한 가치 vs 드러난 가치" 비교가 성립한다.
  const axisDays = {};
  for (const s of signals) axisDays[s.axis] = (axisDays[s.axis] || 0) + s.days;
  const topAxis = Object.entries(axisDays)
    .filter(([, d]) => d > 0)
    .sort((a, b) => b[1] - a[1])[0];
  const revealed = topAxis ? { axis: topAxis[0], days: topAxis[1] } : null;

  return {
    ok: true,
    windowDays,
    n: recent.length,
    days: new Set(recent.map((c) => c.date)).size,
    signals: signals.sort((a, b) => b.days - a.days),
    axisDays,
    jobChangeDays: hitDays.jobChange.size,
    moodTrend,
    revealed,
  };
}

// 온보딩에서 고른 가치의 대표 축(상위 1개)과, 기록에서 드러난 축을 비교한다.
// 라벨링용 — 가중치 계산이 아니다(backend 담당).
export function valueGap(profile, sig) {
  const topId = (profile?.value_ranking || [])[0];
  const selected = topId ? CARD_BY_ID[topId] : null;
  const selectedAxis = selected?.axis || null;
  const revealedAxis = sig?.revealed?.axis || null;
  return {
    selectedAxis,
    selectedLabel: selected?.label || null,
    revealedAxis,
    revealedLabel: revealedAxis, // 축 이름(성장/안정 …)을 그대로 라벨로
    aligned: selectedAxis && revealedAxis ? selectedAxis === revealedAxis : null,
  };
}

// 반복 고민 넛지에 쓸 판단 — 최근 windowDays 안에 이직 고민이 threshold일 이상 나타났나.
export function jobChangeRumination({ windowDays = 14, threshold = 3 } = {}, s = loadUniverse()) {
  const sig = computeDiarySignals({ windowDays }, s);
  return { ...sig, prompt: sig.jobChangeDays >= threshold, count: sig.jobChangeDays, windowDays };
}
