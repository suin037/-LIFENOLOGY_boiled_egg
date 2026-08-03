// ─────────────────────────────────────────────────────────────
// '나의 우주' 로컬 저장소 — 체크인(별)·XP·행성·핀 슬롯. 나의 우주 화면(민주) 소관.
// savedUniverses.js / prefs.js 와 같은 패턴: localStorage + 순수함수, 외부 의존 없음.
//
// 확정된 규칙
//  · 별 1개 = 하루 1개. 같은 날 다시 기록하면 그날 별을 덮어쓴다(upsert).
//  · 별자리 1개 = 별 7개(1주). 주간 리포트 주기와 맞춘다.
//  · XP 는 저장하지 않고 활동 기록에서 매번 파생한다(중복 적립·불일치 방지).
// ─────────────────────────────────────────────────────────────

import { listUniverses } from "./savedUniverses.js";

const KEY = "pm.myuniverse.v1";

// 별자리 하나를 이루는 별 수. 12(황도12궁)는 완성까지 12일이라 신규 사용자가
// 첫 별자리를 영영 못 본다. 7일이면 1주 리듬 + 주간 리포트와 주기가 맞는다.
export const STARS_PER_CONSTELLATION = 7;

const DEFAULTS = {
  checkins: [], // [{ date, mood, valence, energy, skill, keyword, note, hasDiary }]
  pinnedSlots: { A: null, B: null, C: null }, // savedUniverses 의 id 포인터 (데이터 복사 X)
  planet: "career",
  simRuns: 0, // 시뮬레이션 실행 횟수 (다른 저장소에 카운터가 없어 여기서 센다)
  demo: false, // 예시 기록으로 채워진 상태인가 (화면에 배지로 항상 표시)
};

// ── 저장/로드 ────────────────────────────────────────────────
export function loadUniverse() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "{}");
    return {
      ...DEFAULTS,
      ...raw,
      checkins: Array.isArray(raw.checkins) ? raw.checkins : [],
      pinnedSlots: { ...DEFAULTS.pinnedSlots, ...(raw.pinnedSlots || {}) },
    };
  } catch {
    return { ...DEFAULTS, checkins: [], pinnedSlots: { ...DEFAULTS.pinnedSlots } };
  }
}

function persist(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* localStorage 불가 환경(사파리 프라이빗 등) — 메모리로만 동작 */
  }
  return state;
}

function patch(fn) {
  const s = loadUniverse();
  return persist(fn(s) || s);
}

// ── 날짜 유틸 ────────────────────────────────────────────────
// toISOString() 은 UTC 라 한국 시간 자정 근처에서 하루가 밀린다. 로컬 기준으로 만든다.
export function todayKey(d = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function dayDiff(a, b) {
  return Math.round((new Date(b + "T00:00:00") - new Date(a + "T00:00:00")) / 86400000);
}

function addDays(dateKey, n) {
  const d = new Date(dateKey + "T00:00:00");
  d.setDate(d.getDate() + n);
  return todayKey(d);
}

/** 그 날짜가 속한 주의 월요일. 별자리는 달력 주(월~일) 단위다. */
export function weekStartKey(dateKey) {
  const d = new Date(dateKey + "T00:00:00");
  const dow = (d.getDay() + 6) % 7; // 월=0 … 일=6
  d.setDate(d.getDate() - dow);
  return todayKey(d);
}

// mood(1~5) → valence(-1~1). 일기 모듈이 valence 를 직접 주면 그 값을 우선한다.
export function moodToValence(mood) {
  if (mood == null) return null;
  return +(((Number(mood) - 3) / 2).toFixed(3));
}

// ── 쓰기 ─────────────────────────────────────────────────────
/**
 * 하루치 체크인 기록(=별 1개). 같은 날짜면 덮어쓴다.
 * @param {{date?:string, mood?:number, valence?:number, energy?:number,
 *          skill?:string, keyword?:string, note?:string, diaryId?:string}} entry
 */
export function addCheckin(entry = {}) {
  const date = entry.date || todayKey();
  const valence =
    entry.valence != null ? Number(entry.valence) : moodToValence(entry.mood);
  const star = {
    date,
    mood: entry.mood ?? null,
    valence: valence ?? null,
    energy: entry.energy ?? null, // 소현 체크인 3문항: 에너지 레벨
    skill: entry.skill ?? null, //                  오늘 쓴 역량
    keyword: entry.keyword ?? null, //              감정 키워드
    note: entry.note ?? "", // 한 줄 기록
    diaryId: entry.diaryId ?? null,
    hasDiary: Boolean(entry.note?.trim() || entry.diaryId),
  };
  return patch((s) => {
    const rest = s.checkins.filter((c) => c.date !== date);
    s.checkins = [...rest, star].sort((a, b) => a.date.localeCompare(b.date));
    return s;
  });
}

export function setPlanet(key) {
  return patch((s) => {
    s.planet = key;
    return s;
  });
}

export function pinSlot(slotId, universeId) {
  return patch((s) => {
    s.pinnedSlots = { ...s.pinnedSlots, [slotId]: universeId };
    return s;
  });
}

export function unpinSlot(slotId) {
  return pinSlot(slotId, null);
}

// 시뮬레이션을 한 번 돌렸을 때 호출 (ResultContext.runSimulation 성공 시).
export function noteSimulationRun() {
  return patch((s) => {
    s.simRuns = (s.simRuns || 0) + 1;
    return s;
  });
}

export function resetUniverse() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* 무시 */
  }
}

// ── 파생 계산 ────────────────────────────────────────────────
export function totalStars(s = loadUniverse()) {
  return s.checkins.length;
}

export function diaryDays(s = loadUniverse()) {
  return s.checkins.filter((c) => c.hasDiary).length;
}

export function hasCheckedInToday(s = loadUniverse()) {
  const t = todayKey();
  return s.checkins.some((c) => c.date === t);
}

/** 연속 기록일. 오늘 안 했으면 어제까지의 연속을 인정한다(자정에 0으로 깨지지 않게). */
export function streakDays(s = loadUniverse()) {
  if (!s.checkins.length) return 0;
  const dates = [...new Set(s.checkins.map((c) => c.date))].sort().reverse();
  const gapFromToday = dayDiff(dates[0], todayKey());
  if (gapFromToday > 1) return 0;
  let streak = 1;
  for (let i = 1; i < dates.length; i++) {
    if (dayDiff(dates[i], dates[i - 1]) === 1) streak++;
    else break;
  }
  return streak;
}

/**
 * 별자리 = 달력 한 주(월~일). 슬롯은 항상 7칸이라 레이아웃이 흔들리지 않고,
 * 기록이 없는 날은 건너뛰지 않고 빈 자리로 남는다 —
 * 별자리는 "기록한 날들"이 아니라 "지나간 날들"의 모양이어야 한다.
 * 주간 리포트와 주기가 같아 그대로 재사용할 수 있다.
 */
export function constellationGroups(s = loadUniverse()) {
  const cs = s.checkins;
  if (!cs.length) return [];

  const today = todayKey();
  const firstWeek = weekStartKey(cs[0].date);
  const lastWeek = weekStartKey(cs[cs.length - 1].date > today ? cs[cs.length - 1].date : today);
  const byDate = Object.fromEntries(cs.map((c) => [c.date, c]));

  const groups = [];
  for (let ws = firstWeek; ws <= lastWeek; ws = addDays(ws, 7)) {
    const stars = Array.from({ length: STARS_PER_CONSTELLATION }, (_, i) => {
      const key = addDays(ws, i);
      return byDate[key] || { date: key, valence: null, empty: true, future: key > today };
    });
    const weekEnd = addDays(ws, STARS_PER_CONSTELLATION - 1);
    const elapsed = Math.min(STARS_PER_CONSTELLATION, dayDiff(ws, today) + 1);
    groups.push({
      index: groups.length,
      weekStart: ws,
      weekEnd,
      stars,
      complete: weekEnd < today,
      remaining: Math.max(0, STARS_PER_CONSTELLATION - elapsed),
      filled: stars.filter((x) => !x.empty).length,
    });
  }
  return groups;
}

/** 지금 만들고 있는(=이번 주) 별자리. 기록이 없으면 null. */
export function currentConstellation(s = loadUniverse()) {
  const g = constellationGroups(s);
  return g.length ? g[g.length - 1] : null;
}

export function completedCount(s = loadUniverse()) {
  return constellationGroups(s).filter((g) => g.complete && g.filled > 0).length;
}

// ── XP / 레벨 ────────────────────────────────────────────────
// 참여 지표다. 실측 데이터와 무관하며 값은 팀 재량으로 정한 것.
export const XP_RULES = {
  checkin: 10, // 하루 체크인
  diary: 15, // 그날 일기까지 작성
  simulation: 50, // 시뮬레이션 1회 실행
  universeSaved: 30, // 우주 보관함 저장
  reflection: 40, // 저장한 우주에 회고 작성
};

/** 레벨 n → n+1 에 필요한 XP. */
export function xpMaxFor(level) {
  return 500 + (level - 1) * 400;
}

export function levelFrom(xp) {
  let level = 1;
  let rest = Math.max(0, xp);
  let need = xpMaxFor(level);
  while (rest >= need && level < 99) {
    rest -= need;
    level += 1;
    need = xpMaxFor(level);
  }
  return { level, xpInLevel: rest, xpMax: need };
}

const TITLES = [
  [1, "첫 별 관측자"],
  [3, "성운 여행자"],
  [6, "별자리 수집가"],
  [10, "궤도 항해사"],
  [15, "은하 탐사대"],
  [20, "우주 탐험가"],
];

export function titleFor(level) {
  let t = TITLES[0][1];
  for (const [min, name] of TITLES) if (level >= min) t = name;
  return t;
}

/** 활동 기록 → 총 XP (저장하지 않고 매번 계산). */
export function totalXp(s = loadUniverse(), universes = safeUniverses()) {
  const reflections = universes.filter((u) => (u.reflection || "").trim()).length;
  return (
    totalStars(s) * XP_RULES.checkin +
    diaryDays(s) * XP_RULES.diary +
    (s.simRuns || 0) * XP_RULES.simulation +
    universes.length * XP_RULES.universeSaved +
    reflections * XP_RULES.reflection
  );
}

function safeUniverses() {
  try {
    return listUniverses();
  } catch {
    return [];
  }
}

// ── 화면용 요약 (MyUniverse · HomeHub 가 같이 쓰는 단일 소스) ──
export function universeSummary() {
  const s = loadUniverse();
  const universes = safeUniverses();
  const xp = totalXp(s, universes);
  const { level, xpInLevel, xpMax } = levelFrom(xp);
  const cur = currentConstellation(s);

  return {
    state: s,
    level,
    title: titleFor(level),
    xp,
    xpInLevel,
    xpMax,
    xpPct: Math.min(100, Math.round((xpInLevel / xpMax) * 100)),
    stars: totalStars(s),
    streak: streakDays(s),
    checkedInToday: hasCheckedInToday(s),
    current: cur,
    currentFilled: cur ? cur.filled : 0,
    completed: completedCount(s),
    stats: {
      simulations: s.simRuns || 0,
      stars: totalStars(s),
      universes: universes.length,
    },
  };
}

// ── 예시 기록 (둘러보기 모드) ────────────────────────────────
// 홈의 체크인 UI(소현 파트)가 붙기 전까지, 그리고 처음 들어온 사람이 별자리가
// 무엇인지 보려면 기록이 필요하다. 개발 모드에서만 열면 배포본/발표용 URL 에서
// 빈 화면이 뜨므로 **프로덕션에서도 명시적 버튼으로** 쓸 수 있게 둔다.
//
// 대신 조용히 넣지 않는다 — `demo: true` 플래그를 세우고 화면에 "예시 데이터"
// 배지를 항상 띄운다. 남의 기록을 내 기록인 척 보여주지 않는 것이 이 프로젝트 원칙.
const DEMO_WEEKS = [
  // 2주 전 — 도전형(평균↑ 진폭↑)
  [0.7, 0.2, 0.9, -0.3, 0.8, 0.1, 0.6],
  // 지난주 — 인내형(평균↓ 진폭↓), 목요일은 미기록
  [-0.3, -0.4, -0.2, null, -0.5, -0.35, -0.3],
  // 이번 주 — 오늘까지만 채운다
  [0.4, 0.5, 0.3, 0.6, 0.45, 0.5, 0.4],
];

const DEMO_NOTES = [
  "면접 준비를 시작했다.",
  "팀 회의가 길었다. 그래도 정리는 됐다.",
  "오랜만에 푹 잤다.",
  "결정을 미루고 있는 게 스스로 보인다.",
];

/** 예시 기록 3주치를 넣는다. 달력 주(월~일)에 맞춰 넣어 요일과 무관하게 같은 모양이 나온다. */
export function seedDemoCheckins() {
  const today = todayKey();
  const thisMonday = weekStartKey(today);
  const start = addDays(thisMonday, -14);

  let noteAt = 0;
  DEMO_WEEKS.forEach((week, w) => {
    week.forEach((v, d) => {
      const date = addDays(start, w * 7 + d);
      if (v == null || date > today) return; // 미기록 날 / 아직 오지 않은 날
      addCheckin({
        date,
        valence: v,
        mood: Math.round(v * 2 + 3),
        note: (w * 7 + d) % 4 === 1 ? DEMO_NOTES[noteAt++ % DEMO_NOTES.length] : "",
      });
    });
  });

  return patch((s) => {
    s.demo = true;
    return s;
  });
}

export function isDemo(s = loadUniverse()) {
  return Boolean(s.demo);
}

/**
 * 배포본에서도 예시 기록을 열 수 있는 진입점.
 *  · `?demo=1` 로 들어오면 자동으로 채운다(발표·심사용 링크).
 * 이미 기록이 있으면 건드리지 않는다.
 */
export function initDemoFromUrl() {
  try {
    if (!new URLSearchParams(window.location.search).has("demo")) return false;
    if (loadUniverse().checkins.length) return false;
    seedDemoCheckins();
    return true;
  } catch {
    return false;
  }
}
