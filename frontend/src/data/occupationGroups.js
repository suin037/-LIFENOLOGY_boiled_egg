// KLIPS/KSCO 직종 대분류. 입력·API 결과 표시가 같은 코드를 같은 이름으로 읽게 한다.
export const OCCUPATION_GROUPS = [
  [1, "관리자"],
  [2, "전문가·관련 종사자"],
  [3, "사무 종사자"],
  [4, "서비스 종사자"],
  [5, "판매 종사자"],
  [6, "농림어업 숙련 종사자"],
  [7, "기능원·관련 기능 종사자"],
  [8, "장치·기계 조작·조립 종사자"],
  [9, "단순노무 종사자"],
];

export function occupationGroupLabel(code) {
  if (code == null || code === "") return "";
  return OCCUPATION_GROUPS.find(([value]) => value === Number(code))?.[1] || "";
}
