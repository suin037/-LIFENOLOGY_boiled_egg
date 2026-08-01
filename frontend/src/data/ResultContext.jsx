import { createContext, useContext, useMemo, useState } from "react";
import { getPredictionPair } from "./prediction.js";
import { DEFAULT_AVATAR } from "./avatarOptions.js";

// 결과 데이터 + 온보딩 프로필을 한 곳에 모으는 컨텍스트.
// runSimulation() 이 선택(choices)+심정(diary)으로 결과 쌍{a,b}을 만든다.
// ※ 지금은 목업(getPredictionPair). 백엔드 실연결은 api.js(runSimulate)를
//   내 결과 형태로 확장해 여기서 호출하면 됨(파일은 보존해둠).
const ResultContext = createContext(null);

const DEFAULT_PROFILE = {
  age: 29,
  sex: "2",
  major: "사회", // 전공 계열
  occupation: "사회계열",
  income: 280, // 만원/월 → 백엔드 monthly_wage
  edu_level: 7, // 대졸
  values: ["성장 가능성"], // (표시용 레거시) — 성향 입력은 value_ranking 로 이관
  value_ranking: ["growth", "stability"], // 가치 카드 id 중요한 순 → 개인화 입력(백엔드가 가중치로 변환)
  mbti: "모름", // 심리 성향 input
  psych_answers: {}, // { D2:"…", D1:"…", D4:"…" } 서술형 답변 → disposition_block 로 전송
  avatarConfig: DEFAULT_AVATAR, // 아바타 빌더 선택(피부·머리·안경·배경)
};

export function ResultProvider({ children }) {
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [choices, setChoices] = useState({ a: "이직", b: "유지" });
  const [diary, setDiary] = useState("");
  const [result, setResult] = useState(() =>
    getPredictionPair({ profile: DEFAULT_PROFILE, choiceA: "이직", choiceB: "유지" }),
  );
  const [onboarded, setOnboarded] = useState(false);

  // 선택(choices)+심정(diary) → 결과 쌍 {a,b} 생성. (지금은 목업)
  async function runSimulation(opts = {}) {
    const choiceA = opts.choiceA || choices.a;
    const choiceB = opts.choiceB || choices.b;
    const pair = getPredictionPair({ profile, choiceA, choiceB, detail: opts.diary ?? diary });
    setResult(pair);
    return pair;
  }

  const value = useMemo(
    () => ({
      profile, setProfile,
      choices, setChoices,
      diary, setDiary,
      result, setResult,
      runSimulation, onboarded, setOnboarded,
    }),
    [profile, choices, diary, result, onboarded],
  );

  return <ResultContext.Provider value={value}>{children}</ResultContext.Provider>;
}

export function useResult() {
  const ctx = useContext(ResultContext);
  if (!ctx) throw new Error("useResult must be used within <ResultProvider>");
  return ctx;
}
