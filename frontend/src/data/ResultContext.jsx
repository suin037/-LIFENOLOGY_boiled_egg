import { createContext, useContext, useMemo, useState } from "react";
import { MOCK_RESULT } from "./result.js";

// 결과 데이터 + 온보딩 프로필을 한 곳에 모으는 컨텍스트.
// 백엔드 연동 시: runSimulation() 안에서 fetch('/simulate') 결과로 setResult 하면 된다.
const ResultContext = createContext(null);

const DEFAULT_PROFILE = {
  age: 27,
  occupation: "연구·공학기술",
  income: 280, // 만원/월
  values: ["성장 가능성"],
};

export function ResultProvider({ children }) {
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [result, setResult] = useState(MOCK_RESULT);
  // 첫 진입 판별. 지침상 React state만 사용 → 새로고침 시 리셋(데모용).
  // 나중에 유지가 필요하면 이 한 곳만 localStorage/백엔드로 교체.
  const [onboarded, setOnboarded] = useState(false);

  // 지금은 목업을 그대로 반환. 자리만 백엔드 형태로 맞춰둠.
  async function runSimulation() {
    // const res = await fetch("/simulate", { method: "POST", body: JSON.stringify(profile) });
    // setResult(await res.json());
    setResult(MOCK_RESULT);
    return MOCK_RESULT;
  }

  const value = useMemo(
    () => ({ profile, setProfile, result, setResult, runSimulation, onboarded, setOnboarded }),
    [profile, result, onboarded],
  );

  return <ResultContext.Provider value={value}>{children}</ResultContext.Provider>;
}

export function useResult() {
  const ctx = useContext(ResultContext);
  if (!ctx) throw new Error("useResult must be used within <ResultProvider>");
  return ctx;
}
