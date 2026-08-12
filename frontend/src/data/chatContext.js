// 챗봇 컨텍스트 — 최근 기록 압축본 + 힘든 기록 연속 수 + 열린 고리. 전부 PII 마스킹해서 보낸다.
//  · recent: 최근 n개 {date, emotion, text(마스킹·120자)}
//  · hardStreak: 최신부터 '힘든 기록(valence<0 또는 낮은 mood)'이 몇 번 연속인지 → 위로 트리거
//  · openEvents: 후속이 있을 사건인데 아직 결말이 안 적힌 것 → 노바가 "그거 어떻게 됐어?" 하고 되묻는 재료.
//    (대화를 매 턴 누적해 보내는 걸로는 어제 일기의 사건을 알 수 없다. 그래서 따로 추적한다.)
import { loadUniverse } from "./myUniverse.js";
import { computeDiarySignals } from "./diarySignals.js";
import { redactPII } from "./piiRedact.js";

export function buildChatContext(n = 5) {
  let checkins = [];
  try {
    checkins = loadUniverse().checkins || [];
  } catch {
    checkins = [];
  }
  // 최신순 정렬
  const sorted = [...checkins].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  const recent = sorted
    .slice(0, n)
    .map((c) => ({
      date: c.date || "",
      emotion: c.keyword || "",
      text: redactPII(String(c.text || c.note || "").slice(0, 120)),
    }))
    .filter((r) => r.text || r.emotion);

  // 힘든 기록 연속(최신부터)
  let hardStreak = 0;
  for (const c of sorted) {
    const v = c.valence;
    const hard = (v != null && v < -0.1) || c.mood === 1 || c.mood === 2;
    if (hard) hardStreak += 1;
    else break;
  }

  // 같은 고민이 반복되는가 — 최근 14일 안에 이직·진로 신호가 몇 번 나왔는지.
  let ruminationDays = 0;
  try {
    ruminationDays = computeDiarySignals({ windowDays: 14 }, loadUniverse()).jobChangeDays || 0;
  } catch {
    ruminationDays = 0;
  }

  return { recent, hardStreak, ruminationDays, openEvents: openEvents(sorted) };
}

// 후속이 생길 만한 사건들 — 이 단어가 나온 뒤 '같은 단어가 다시 안 나왔으면' 아직 열린 고리다.
const EVENT_WORDS = [
  "면접", "시험", "발표", "결과", "지원", "이력서", "포트폴리오", "병원", "검사", "진료",
  "이사", "여행", "소개팅", "데이트", "약속", "회의", "보고", "제출", "마감", "상담",
  "수술", "계약", "미팅", "공연", "대회", "자격증", "합격", "면담",
];

// 되물음 장부 — 어떤 사건을 몇 번 물었는지·닫혔는지. 같은 걸 계속 캐묻지 않기 위한 것.
const ASK_KEY = "pm.chatAsked.v1";

function loadAsked() {
  try {
    return JSON.parse(localStorage.getItem(ASK_KEY) || "{}");
  } catch {
    return {};
  }
}
function saveAsked(x) {
  try {
    localStorage.setItem(ASK_KEY, JSON.stringify(x));
  } catch { /* 무시 */ }
}

/** 이 사건들을 방금 되물었다고 기록 — 2번까지만 묻고 그 뒤엔 접는다(캐묻지 않기). */
export function markEventsAsked(events = []) {
  const x = loadAsked();
  const today = new Date().toISOString().slice(0, 10);
  for (const e of events) {
    const k = e.keyword;
    if (!k) continue;
    const prev = x[k] || { count: 0, closed: false };
    x[k] = { ...prev, count: (prev.count || 0) + 1, lastAsked: today };
  }
  saveAsked(x);
}

/** 되물음에 사용자가 답했으면 그 고리는 닫는다(해결됐든 아니든 '얘기된' 것으로 본다). */
export function closeEvents(events = []) {
  const x = loadAsked();
  for (const e of events) {
    if (!e.keyword) continue;
    x[e.keyword] = { ...(x[e.keyword] || {}), closed: true };
  }
  saveAsked(x);
}

/** 최근 21일 기록에서 '아직 결말이 안 적힌 사건'을 최대 2개.
 *  닫히는 조건 — ①더 최근 기록에 그 사건이 다시 언급됨 ②되물었고 사용자가 답함 ③2번 물어봄. */
export function openEvents(sortedDesc, days = 21, limit = 2) {
  const asked = loadAsked();
  const today = new Date().toISOString().slice(0, 10);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutKey = cutoff.toISOString().slice(0, 10);
  const rows = (sortedDesc || []).filter((c) => (c.date || "") >= cutKey);

  const found = [];
  const seen = new Set();
  // 최신 → 과거 순회. 최신 쪽에서 이미 언급된 단어는 '결말이 적힌' 것으로 보고 건너뛴다.
  const mentionedLater = new Set();
  for (const c of rows) {
    const text = `${c.text || ""} ${c.note || ""}`;
    const hits = EVENT_WORDS.filter((w) => text.includes(w));
    for (const w of hits) {
      if (mentionedLater.has(w)) continue; // ① 더 최근 기록에 다시 나옴 → 닫힌 고리
      if (seen.has(w)) continue;
      const a = asked[w];
      if (a?.closed) continue;             // ② 되물었고 사용자가 답함
      if ((a?.count || 0) >= 2) continue;  // ③ 두 번 물었으면 접는다(캐묻지 않기)
      if (a?.lastAsked === today) continue; // 하루에 같은 걸 두 번 묻지 않는다
      seen.add(w);
      found.push({ date: c.date || "", keyword: w, text: redactPII(String(text).trim().slice(0, 100)) });
    }
    hits.forEach((w) => mentionedLater.add(w));
  }
  // 오늘 기록은 아직 되물을 시점이 아니다 — 하루는 지난 것만.
  const y = new Date();
  y.setDate(y.getDate() - 1);
  const yKey = y.toISOString().slice(0, 10);
  return found.filter((e) => e.date <= yKey).slice(0, limit);
}

/** 위로(LLM 마무리 인사)를 발동할까 — 힘든 날이 이어지거나 같은 고민이 쌓였을 때만.
 *  평소엔 고정 인사로 끝낸다(매번 부르면 비용도 들고 위로가 상투적으로 느껴진다). */
export function needsComfort(ctx = buildChatContext()) {
  const hard = ctx?.hardStreak || 0;
  const rum = ctx?.ruminationDays || 0;
  return hard >= 3 || rum >= 3;
}
