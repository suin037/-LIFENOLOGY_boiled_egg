// Action Bridge — 사용자가 선택한 미래를 실행 가능한 작은 실험으로 연결한다.
// 행동 자체는 검토 가능한 큐레이션 콘텐츠이며, LLM은 향후 표현 개인화에만 사용한다.

const GOAL_KEY = "pm.activeGoal.v1";

const COMMON_BASIS = {
  implementation: {
    basis: "실행 의도: 언제·어디서·무엇을 할지 정하면 행동으로 옮기기 쉬워집니다.",
    source: "Gollwitzer (1999), Implementation intentions",
  },
  possibleSelf: {
    basis: "가능자기: 원하는 미래 모습을 구체화하면 현재 행동의 방향을 잡는 데 도움이 됩니다.",
    source: "Markus & Nurius (1986), Possible selves",
  },
  smallExperiment: {
    basis: "작은 정보수집 실험으로 큰 결정을 내리기 전 불확실성을 줄이는 방식입니다.",
    source: "행동 실험·점진적 실행 원칙",
  },
};

const DOMAIN_ACTIONS = {
  career: [
    ["관심 선택지의 실제 업무를 아는 사람 1명에게 질문하기", "업무환경에 대한 추측을 실제 정보로 바꿔요.", "smallExperiment"],
    ["현재 조건과 원하는 조건을 각각 3개 적어 비교하기", "막연한 변화 욕구를 비교 가능한 기준으로 만들어요.", "possibleSelf"],
  ],
  education: [
    ["관심 과정의 모집요강과 비용을 15분만 확인하기", "필요 조건과 현실적인 부담을 먼저 확인해요.", "implementation"],
    ["재학생이나 수료자에게 물어볼 질문 3개 적기", "홍보자료에서 알기 어려운 경험 정보를 모아요.", "smallExperiment"],
  ],
  business: [
    ["해결하려는 문제를 겪는 사람 1명과 이야기하기", "아이디어보다 실제 문제의 존재를 먼저 확인해요.", "smallExperiment"],
    ["한 달 필수생활비와 버틸 수 있는 기간 계산하기", "사업 선택의 경제적 안전 범위를 확인해요.", "implementation"],
  ],
  finance: [
    ["A/B 각각의 월 고정비와 예상수입을 한 줄로 적기", "경제적 차이를 감정이 아닌 조건으로 비교해요.", "implementation"],
  ],
  health: [
    ["이번 주 회복을 방해하는 요인 하나와 줄일 행동 하나 정하기", "큰 변화 대신 실행 가능한 회복 행동부터 시작해요.", "implementation"],
  ],
  housing: [
    ["후보 지역의 주거비·이동시간·필수시설을 한 번 비교하기", "생활환경 선택의 숨은 비용을 확인해요.", "smallExperiment"],
  ],
  relationship: [
    ["상대에게 확인하고 싶은 기대와 경계를 각각 한 문장 적기", "관계 결정을 추측이 아닌 대화 가능한 질문으로 바꿔요.", "implementation"],
  ],
  lifestyle: [
    ["선택 이후의 평일 하루를 시간순으로 적어보기", "원하는 생활방식이 실제 일상과 맞는지 살펴봐요.", "possibleSelf"],
  ],
  long_term_values: [
    ["이 선택으로 지키고 싶은 가치와 포기 가능한 것을 하나씩 적기", "선택이 장기적인 가치와 맞는지 확인해요.", "possibleSelf"],
  ],
};

export function actionsFor(choice, domains = []) {
  const keys = [...new Set(domains)].filter((key) => DOMAIN_ACTIONS[key]);
  const source = keys.length ? keys : fallbackDomains(choice);
  return source
    .flatMap((domain) => DOMAIN_ACTIONS[domain].map(([text, purpose, basisKey]) => ({
      id: `${domain}:${text}`,
      domain,
      text,
      purpose,
      ...COMMON_BASIS[basisKey],
    })))
    .slice(0, 3);
}

function fallbackDomains(choice) {
  const c = String(choice || "");
  if (/창업|사업|자영/i.test(c)) return ["business", "finance"];
  if (/진학|대학원|유학|석사|박사/.test(c)) return ["education", "finance"];
  if (/유지|현상|그대로/.test(c)) return ["career", "long_term_values"];
  return ["career", "finance"];
}

export function saveActiveGoal(goal) {
  const value = { ...goal, createdAt: new Date().toISOString(), completedActions: [] };
  try { localStorage.setItem(GOAL_KEY, JSON.stringify(value)); } catch { /* 저장 불가 환경 */ }
  return value;
}

export function loadActiveGoal() {
  try { return JSON.parse(localStorage.getItem(GOAL_KEY) || "null"); } catch { return null; }
}

export function clearActiveGoal() {
  try { localStorage.removeItem(GOAL_KEY); } catch { /* 저장 불가 환경 */ }
}

// 저장된 우주의 결정(A/B) → 향해 가는 실제 선택. 보류면 null.
export function chosenChoice(u) {
  if (u?.decision === "A") return u.choiceA;
  if (u?.decision === "B") return u.choiceB;
  return null;
}
