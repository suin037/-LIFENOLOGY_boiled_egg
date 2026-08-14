// 시뮬 입력용 — 선택지 목록 + 자유서술 자동분류 (자체 완결, 백엔드 choice 규칙 미러)
export const SLOT_OPTIONS = [
  { key: "유지", label: "현상 유지", desc: "지금 그대로라면", emoji: "🌙" },
  { key: "이직", label: "이직", desc: "다른 회사·직무로 옮긴다", emoji: "🚀" },
  { key: "창업", label: "창업", desc: "내 사업을 시작한다", emoji: "🌱" },
  { key: "진학", label: "진학", desc: "대학원·유학으로 진학한다", emoji: "🎓" },
];

// 삶 전체 분류 정본. 한 선택지는 여러 영역에 동시에 속할 수 있다.
// color = 그 영역의 행성 색. 보관함 카드·나의 우주가 같은 색으로 묶이도록 여기서 한 번만 정의한다.
export const LIFE_DOMAINS = [
  { key: "career", label: "직업", emoji: "💼", color: "#4A90E2", keywords: ["회사", "직장", "직업", "이직", "퇴사", "휴직", "취업", "프리랜서", "근무", "직무"] },
  { key: "education", label: "교육", emoji: "🎓", color: "#57C8E8", keywords: ["대학", "대학원", "진학", "유학", "공부", "교육", "학위", "석사", "박사", "자격증", "전공"] },
  { key: "business", label: "사업", emoji: "🌱", color: "#35B98A", keywords: ["창업", "사업", "자영", "개업", "장사", "가게", "카페", "법인", "스타트업", "대표"] },
  { key: "finance", label: "재무", emoji: "💰", color: "#E0954A", keywords: ["돈", "소득", "월급", "연봉", "저축", "투자", "대출", "빚", "비용", "재무", "생활비", "수입", "프리랜서"] },
  { key: "health", label: "건강", emoji: "🫶", color: "#F2789C", keywords: ["건강", "운동", "치료", "병원", "수면", "스트레스", "우울", "불안", "번아웃", "회복", "마음"] },
  { key: "housing", label: "주거", emoji: "🏠", color: "#C77FD6", keywords: ["이사", "이주", "독립", "집", "주거", "전세", "월세", "서울", "제주", "지방", "지역"] },
  { key: "relationship", label: "관계", emoji: "🤝", color: "#8B5CF6", keywords: ["결혼", "연애", "이별", "친구", "가족", "부모", "관계", "사람", "동료", "외로움", "남친", "여친", "남자친구", "여자친구", "애인", "연인", "헤어", "사귀", "데이트", "썸", "배우자", "남편", "아내"] },
  { key: "lifestyle", label: "생활방식", emoji: "🌿", color: "#8FBF3F", keywords: ["워라밸", "여가", "생활", "루틴", "시간", "여행", "취미", "재택", "자유", "삶", "프리랜서"] },
  { key: "long_term_values", label: "장기 가치", emoji: "🧭", color: "#F5C86B", keywords: ["가치", "의미", "목표", "성장", "안정", "꿈", "미래", "자율", "보람", "장기"] },
];

export function detectLifeDomains(text) {
  const normalized = (text || "").trim().toLowerCase();
  if (!normalized) return [];
  return LIFE_DOMAINS
    .filter((domain) => domain.keywords.some((keyword) => normalized.includes(keyword)))
    .map((domain) => domain.key);
}

export function domainLabel(key) {
  return LIFE_DOMAINS.find((domain) => domain.key === key)?.label || key;
}

export function domainColor(key) {
  return LIFE_DOMAINS.find((domain) => domain.key === key)?.color || "#6E7C93";
}

export const labelOf = (c) => (c === "유지" ? "현상 유지" : c);

// 우선순위: '이직' 행동어가 있으면 목적지(스타트업 등)보다 이직 우선.
// 예) "스타트업으로 이직할지" → 창업(X) → 이직(O)
const KW = {
  이직: ["이직", "옮기", "옮길", "전직", "갈아타", "이직할", "회사 옮", "다른 회사로"],
  진학: ["진학", "대학원", "유학", "석사", "박사", "학위", "로스쿨", "편입", "공부하러"],
  창업: ["창업", "사업", "자영", "개업", "장사", "내 사업", "법인", "대표", "차릴", "차리", "스타트업 차"],
  유지: ["유지", "그대로", "현직", "잔류", "남을", "남기", "계속 다니", "계속 있", "안 옮", "지금 회사"],
};
export function classifyChoice(text) {
  if (!text || !text.trim()) return null;
  if (KW.이직.some((k) => text.includes(k))) return "이직";
  if (KW.진학.some((k) => text.includes(k))) return "진학";
  if (KW.창업.some((k) => text.includes(k))) return "창업";
  if (KW.유지.some((k) => text.includes(k))) return "유지";
  // 근거 키워드가 없으면 오분류하지 않고 사용자가 직접 고르게 한다.
  return null;
}

// ── 삶의 영역(LIFE_DOMAINS) → 나의 우주 행성(PLANETS) 키 ──────────────
// 두 키 체계가 다르다. 시뮬레이션 분류는 9개(career·education·business…),
// 행성은 5개(career·life·relation·health·growth). 시나리오를 올바른 행성에
// 꽂으려면 이 변환이 필요하다. (일기 태깅 domain_tag.py 는 이미 행성 키로 나온다.)
const DOMAIN_TO_PLANET = {
  career: "career",
  business: "career",          // 창업도 일의 영역
  finance: "career",           // 행성 '진로'가 진로·일·돈을 포괄
  education: "growth",
  long_term_values: "growth",
  health: "health",
  relationship: "relation",
  housing: "life",
  lifestyle: "life",
};

/** 감지된 영역 배열 → 행성 키 하나. 없으면 null(호출부가 기본값 결정). */
export function toPlanetKey(domains = []) {
  for (const d of domains) {
    if (DOMAIN_TO_PLANET[d]) return DOMAIN_TO_PLANET[d];
  }
  return null;
}
