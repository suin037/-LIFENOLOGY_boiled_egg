import { createContext, useContext, useEffect, useMemo, useState } from "react";

// ─────────────────────────────────────────────────────────────
// 일기(오늘 기록) — 매일 한 줄 + 기분(1~5). localStorage로 영속.
// 자체 완결형: 감정감지(detectEmotions)까지 이 파일에 포함(외부 의존 X).
// 저장 시 최근 시뮬 기준으로 자동 태깅("이직 시뮬 #3 이후 47일째").
// ⚠️ 정직성: 이건 '당신의 주관적 기록'이지 실측 데이터가 아니다.
// ─────────────────────────────────────────────────────────────
const DiaryContext = createContext(null);
const KEY = "pm_diary_v1";

export const MOODS = [
  { v: 1, emoji: "😞", label: "힘듦" },
  { v: 2, emoji: "😕", label: "지침" },
  { v: 3, emoji: "😐", label: "그저그럼" },
  { v: 4, emoji: "🙂", label: "괜찮음" },
  { v: 5, emoji: "😄", label: "좋음" },
];
export const moodEmoji = (v) => MOODS.find((m) => m.v === v)?.emoji || "•";

// 자유서술 → 감정 신호어 감지 → 심리 이론카드 매칭
const EMOTION_MAP = [
  { kw: ["막막", "방향", "무기력", "공허", "모르겠"], keyword: "막막함", card: "미래자기 · 가능자기" },
  { kw: ["불안", "두려", "걱정", "압박", "겁", "초조"], keyword: "불안", card: "인지적 평가 · 위협→도전" },
  { kw: ["후회", "아쉬", "그때", "미련"], keyword: "후회", card: "반사실적 사고" },
  { kw: ["지치", "번아웃", "소진", "힘들", "버겁"], keyword: "소진", card: "문제중심 대처" },
  { kw: ["설레", "기대", "신남", "두근"], keyword: "기대", card: "긍정정서 · 확장" },
];
export function detectEmotions(text) {
  if (!text) return [];
  const out = [];
  for (const e of EMOTION_MAP) {
    if (e.kw.some((k) => text.includes(k))) out.push({ keyword: e.keyword, card: e.card });
  }
  return out;
}

function iso(d) {
  return d.toISOString().slice(0, 10);
}
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

// 최근 시뮬 기록 (자동 태깅 + 아카이브 기준). 데모 시드.
export const SIM_LOG = [
  { id: 3, label: "이직 시뮬 #3", date: iso(daysAgo(47)), title: "27세 · 연구·공학기술", branch: "이직 vs 현상 유지", headline: "이직 순수효과 +7.9만원, 26%는 감소" },
  { id: 2, label: "진학 시뮬 #2", date: iso(daysAgo(120)), title: "26세 · 경영·사무", branch: "대학원 vs 현상 유지", headline: "같은 계열 취업률 70% · 진학률 4%" },
  { id: 1, label: "창업 시뮬 #1", date: iso(daysAgo(180)), title: "29세 · 보건·의료", branch: "창업 vs 현상 유지", headline: "창업 1년 생존율 64.6%, 5년 33%" },
];

function seedEntries() {
  const rows = [
    { d: 13, mood: 2, text: "새 팀 적응이 아직 버겁다. 잘한 선택인지 막막함." },
    { d: 11, mood: 2, text: "야근. 그래도 배우는 건 있는 듯." },
    { d: 9, mood: 3, text: "동료랑 점심. 조금 나아짐." },
    { d: 7, mood: 3, text: "프로젝트 방향이 잡혔다." },
    { d: 5, mood: 4, text: "작은 성과. 인정받는 기분." },
    { d: 3, mood: 3, text: "주말 앞두고 피곤하지만 괜찮음." },
    { d: 1, mood: 4, text: "이직 결정, 지금은 후회 없다." },
  ];
  return rows.map((r, i) => ({ id: `seed-${i}`, date: iso(daysAgo(r.d)), mood: r.mood, text: r.text }));
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return seedEntries();
}

export function DiaryProvider({ children }) {
  const [entries, setEntries] = useState(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(entries));
    } catch (_) {}
  }, [entries]);

  function saveToday(mood, text) {
    const today = iso(new Date());
    setEntries((prev) => {
      const rest = prev.filter((e) => e.date !== today);
      return [...rest, { id: `e-${today}`, date: today, mood, text }].sort((a, b) =>
        a.date < b.date ? -1 : 1,
      );
    });
  }

  const todayEntry = entries.find((e) => e.date === iso(new Date())) || null;
  const lastSim = SIM_LOG[0];

  function entriesSince(dateStr) {
    return entries.filter((e) => e.date >= dateStr).sort((a, b) => (a.date < b.date ? -1 : 1));
  }
  function daysSince(dateStr) {
    const ms = new Date(iso(new Date())) - new Date(dateStr);
    return Math.max(0, Math.round(ms / 86400000));
  }

  const value = useMemo(
    () => ({ entries, saveToday, todayEntry, lastSim, entriesSince, daysSince }),
    [entries],
  );
  return <DiaryContext.Provider value={value}>{children}</DiaryContext.Provider>;
}

export function useDiary() {
  const ctx = useContext(DiaryContext);
  if (!ctx) throw new Error("useDiary must be used within <DiaryProvider>");
  return ctx;
}
