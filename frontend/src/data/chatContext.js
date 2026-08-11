// 챗봇 컨텍스트 — 최근 기록 압축본 + 힘든 기록 연속 수. 전부 PII 마스킹해서 보낸다.
//  · recent: 최근 n개 {date, emotion, text(마스킹·120자)}
//  · hardStreak: 최신부터 '힘든 기록(valence<0 또는 낮은 mood)'이 몇 번 연속인지 → 코스모 위로 트리거
import { loadUniverse } from "./myUniverse.js";
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

  return { recent, hardStreak };
}
