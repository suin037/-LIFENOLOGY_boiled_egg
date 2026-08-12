// 챗봇 컨텍스트 — 최근 기록 압축본 + 힘든 기록 연속 수. 전부 PII 마스킹해서 보낸다.
//  · recent: 최근 n개 {date, emotion, text(마스킹·120자)}
//  · hardStreak: 최신부터 '힘든 기록(valence<0 또는 낮은 mood)'이 몇 번 연속인지 → 코스모 위로 트리거
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

  return { recent, hardStreak, ruminationDays };
}

/** 위로(LLM 마무리 인사)를 발동할까 — 힘든 날이 이어지거나 같은 고민이 쌓였을 때만.
 *  평소엔 고정 인사로 끝낸다(매번 부르면 비용도 들고 위로가 상투적으로 느껴진다). */
export function needsComfort(ctx = buildChatContext()) {
  const hard = ctx?.hardStreak || 0;
  const rum = ctx?.ruminationDays || 0;
  return hard >= 3 || rum >= 3;
}
