// 내 성향모델 로컬 API 연결 (diary_module/qmode/api.py, uvicorn :8000).
// 프론트 일기/체크인 → 진짜 DispositionModel + report.py → 결과.
const BASE = "http://localhost:8000";

export async function analyzeDisposition({ ranked_cards, mbti, entries }) {
  const res = await fetch(`${BASE}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ranked_cards, mbti, entries }),
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

// 온보딩+일기 저장 + persona_block 계산해 DB에 보관 (uid="me")
export async function saveMe({ ranked_cards, mbti, profile, entries }) {
  const res = await fetch(`${BASE}/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uid: "me", ranked_cards, mbti, profile, entries }),
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

// 저장된 persona_block을 예측 수치와 함께 이직 서사로 생성
export async function getScenario({ uid = "me", choice, expected_wage, causal_effect, survival_months, age, major }) {
  const res = await fetch(`${BASE}/scenario`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uid, choice, expected_wage, causal_effect, survival_months, age, major }),
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}
