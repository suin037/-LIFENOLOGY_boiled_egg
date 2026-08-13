// 보관함 저장소 — 시뮬 결과 스냅샷을 localStorage 에 보관. 보관함 화면(수인) 소관.
const KEY = "pm.universes.v1";

export function listUniverses() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

function persist(arr) {
  try {
    localStorage.setItem(KEY, JSON.stringify(arr));
  } catch {
    /* 무시 */
  }
}

export function saveUniverse(u) {
  const arr = listUniverses();
  arr.unshift(u);
  persist(arr.slice(0, 50)); // 최근 50개까지
  return u;
}

export function updateUniverse(id, patch) {
  persist(listUniverses().map((u) => (u.id === id ? { ...u, ...patch } : u)));
}

export function removeUniverse(id) {
  persist(listUniverses().filter((u) => u.id !== id));
}

// ResultContext 의 result + profile + choices → 저장용 스냅샷 객체
export function universeFromResult(result, profile, choices) {
  const A = choices?.a || result?.option_a?.label || "A";
  const B = choices?.b || result?.option_b?.label || "B";
  let headline = result?.scenario?.comparison || "";
  if (!headline && result?.causal) {
    headline = `이직 순효과 ${result.causal.effect}% (관측 ${result.causal.descriptive}%)`;
  }
  return {
    id: "u_" + Math.random().toString(36).slice(2, 9),
    savedAt: new Date().toISOString().slice(0, 10),
    title: `${A} vs ${B}`,
    choiceA: A,
    choiceB: B,
    domain: result?.planetDomain || null, // 어느 행성(삶의 영역) 얘기였는지 — '그 영역의 N년 뒤' 재료
    profileSnapshot: {
      age: profile?.age,
      income: profile?.income,
      value_ranking: profile?.value_ranking || [],
    },
    headline: (headline || "").slice(0, 90),
    reflection: "",
    decision: "none", // "A" | "B" | "none"(보류) — 향해 갈 미래 선택
    doneActions: [], // 완료한 '오늘 할 일'(텍스트)
    result, // 전체 결과 스냅샷 — '다시 보기'로 그대로 복원
  };
}
