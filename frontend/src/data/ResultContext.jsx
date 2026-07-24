import { createContext, useContext, useMemo, useState } from "react";
import { MOCK_RESULT } from "./result.js";
import { runSimulate } from "../api.js";

// 결과 데이터 + 온보딩 프로필을 한 곳에 모으는 컨텍스트.
// runSimulation() 이 백엔드 /simulate 를 호출해 결과를 채운다(실패 시 목업 폴백).
const ResultContext = createContext(null);

const DEFAULT_PROFILE = {
  age: 29,
  sex: "2",
  major: "사회", // 전공 계열
  occupation: "사회계열",
  income: 280, // 만원/월 → 백엔드 monthly_wage
  edu_level: 7, // 대졸
  values: ["성장 가능성"],
};

export function ResultProvider({ children }) {
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [choices, setChoices] = useState({ a: "이직", b: "창업" });
  const [diary, setDiary] = useState("");
  const [result, setResult] = useState(MOCK_RESULT);
  const [onboarded, setOnboarded] = useState(false);

  // 백엔드 /simulate 호출 → 화면 형태로 매핑해 저장. 실패 시 목업 유지.
  async function runSimulation(opts = {}) {
    const choiceA = opts.choiceA || choices.a;
    const choiceB = opts.choiceB || choices.b;
    try {
      const mapped = await runSimulate({
        profile,
        choiceA,
        choiceB,
        diary: opts.diary ?? diary,
      });
      setResult(mapped);
      return mapped;
    } catch (e) {
      console.warn("simulate 실패 — 목업으로 폴백:", e);
      setResult(MOCK_RESULT);
      return MOCK_RESULT;
    }
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
