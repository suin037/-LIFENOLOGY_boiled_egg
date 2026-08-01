// Action Bridge — 선택한 미래(choice kind)별 '오늘 할 일' 규칙 기반 초안.
// 콘텐츠는 팀(지윤·민주) 검토 대상. 나중에 심리 RAG/LLM 로 개인화 고도화.

export const ACTION_KINDS = {
  이직: [
    "이력서 한 줄이라도 업데이트하기",
    "관심 채용공고 3개 저장하고 비교하기",
    "링크드인·포트폴리오 한 부분 손보기",
    "지금 직무에서 남기고 싶은 성과 1개 기록",
    "이직하려는 이유를 한 문장으로 정리",
  ],
  창업: [
    "해결하려는 문제를 한 문장으로 적기",
    "잠재 고객·사용자 1명과 이야기해보기",
    "비슷한 서비스 3개 찾아보기",
    "가장 작은 실험(MVP) 아이디어 1개 적기",
    "한 달 생활비·버틸 기간 점검하기",
  ],
  진학: [
    "관심 학교·프로그램 모집요강 확인",
    "필요한 서류·시험 목록 정리하기",
    "관심 분야 논문·강의 1개 보기",
    "교수·재학생에게 물어볼 질문 3개 적기",
    "진학 후 이루고 싶은 목표 한 문장",
  ],
  유지: [
    "지금 자리에서 이루고 싶은 것 1개 적기",
    "성장할 기회·업무 1개 찾아보기",
    "번아웃 신호 점검하고 쉬는 시간 확보",
    "6개월 뒤 원하는 모습 한 줄 적기",
    "관계·건강 중 소홀한 것 1개 챙기기",
  ],
};

export function kindOf(choice) {
  const c = String(choice || "");
  if (/창업|사업|자영|startup/i.test(c)) return "창업";
  if (/진학|대학원|유학|석사|박사|학업/.test(c)) return "진학";
  if (/유지|현상|그대로/.test(c)) return "유지";
  return "이직";
}

export function actionsFor(choice) {
  return ACTION_KINDS[kindOf(choice)] || ACTION_KINDS.이직;
}

// 저장된 우주의 결정(A/B) → 향해 가는 실제 선택. 보류(none)면 null.
export function chosenChoice(u) {
  if (u?.decision === "A") return u.choiceA;
  if (u?.decision === "B") return u.choiceB;
  return null;
}
