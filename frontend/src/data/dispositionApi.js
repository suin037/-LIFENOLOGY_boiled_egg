// 내 성향모델 로컬 API 연결 (diary_module/qmode/api.py, uvicorn :8000).
// 체크인(별) → 진짜 DispositionModel + report.py → 주간 리포트 서사 + 내일 할 거리.
//
// 주간 리포트는 '완성된 주'에만 만든다. 한 번 만들면 DB(week_reports)에 저장되고,
// 지난 주는 재생성 없이 저장본(getSavedReport)을 즉시 불러온다.
const BASE = import.meta.env.VITE_QMODE_BASE || "http://localhost:8000";
export const REPORT_UID = "me";

// 저장된 주간 리포트 조회 → { found, report, actions, ... }
export async function getSavedReport(uid, weekKey) {
  const res = await fetch(
    `${BASE}/report/${encodeURIComponent(uid)}/${encodeURIComponent(weekKey)}`,
  );
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

// 저장된 주간 리포트 전체 삭제(데모 재시드/비우기 시 옛 리포트 제거). 서버 없어도 조용히 무시.
export async function clearSavedReports(uid) {
  try {
    await fetch(`${BASE}/reports/${encodeURIComponent(uid)}`, { method: "DELETE" });
  } catch {
    /* 서버 미가동 — 무시 */
  }
}

// 일기 텍스트 → 인생 영역(행성) 자동 분류. { primary, domains:[key...] } 또는 실패 시 null.
export async function tagDomain(text) {
  try {
    const res = await fetch(`${BASE}/tag`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// 마스코트 대화 한 턴 → 답변 텍스트. 실패 시 간단 폴백.
export async function chatTurn(messages, persona = "lumi") {
  try {
    const res = await fetch(`${BASE}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, persona }),
    });
    if (!res.ok) throw new Error();
    return (await res.json()).reply;
  } catch {
    return "그랬구나. 조금 더 얘기해줄래?";
  }
}

// 대화 전체 → 1인칭 일기 { text, mood, emotion, domains }. 체크인 저장용.
export async function composeDiary(messages) {
  try {
    const res = await fetch(`${BASE}/diary/compose`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });
    if (!res.ok) throw new Error();
    return await res.json();
  } catch {
    const text = messages.filter((m) => m.role !== "bot").map((m) => m.text).join(" ");
    return { text, mood: 3, emotion: "", domains: ["life"] };
  }
}

// 분석·서사 생성. uid+week_key 주면 결과가 DB에 저장된다.
export async function analyzeDisposition({ ranked_cards, mbti, entries, uid, week_key }) {
  const res = await fetch(`${BASE}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ranked_cards, mbti, entries, uid, week_key }),
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}
