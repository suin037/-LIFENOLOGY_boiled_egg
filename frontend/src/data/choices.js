// 시뮬 입력용 — 선택지 목록 + 자유서술 자동분류 (자체 완결, 백엔드 choice 규칙 미러)
export const SLOT_OPTIONS = [
  { key: "유지", label: "현상 유지", desc: "지금 그대로라면", emoji: "🌙" },
  { key: "이직", label: "이직", desc: "다른 회사·직무로 옮긴다", emoji: "🚀" },
  { key: "창업", label: "창업", desc: "내 사업을 시작한다", emoji: "🌱" },
  { key: "진학", label: "진학", desc: "대학원·유학으로 진학한다", emoji: "🎓" },
];

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
  return "이직";
}
