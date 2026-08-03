import { createContext, useContext, useMemo, useState } from "react";
import { getPredictionPair } from "./prediction.js";

// 프로필 + A/B 시뮬 입력 + 결과 쌍을 한 곳에 모으는 컨텍스트.
// 백엔드 연동 시: runSimulation()에서 getPredictionPair 대신 각 choice로 fetch('/predict') 두 번.
const ResultContext = createContext(null);

const DEFAULT_PROFILE = {
  age: 27,
  occupation: "연구·공학기술",
  sex: "2", // "1"=남 "2"=여 (API 계약)
  major: "공학",
  edu_level: 7, // 7=대졸
  income: 280, // 만원/월
  values: [], // 가치 강제순위(라벨 배열, 앞이 1순위) — qmode value_ranking 과 매칭
  mbti: "", // 성격유형 4글자(선택) — 스타일 초기 prior, 일기가 갱신(qmode mbti.py)
};

export function ResultProvider({ children }) {
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  // 하이브리드 입력: 자유서술(textA/textB) → 자동분류(choiceA/choiceB, 수정 가능)
  const [choiceA, setChoiceA] = useState("이직");
  const [choiceB, setChoiceB] = useState("유지");
  const [textA, setTextA] = useState("");
  const [textB, setTextB] = useState("");
  const [detail, setDetail] = useState(""); // 지금 심정 (감정 감지 → 서사)
  const [result, setResult] = useState(() =>
    getPredictionPair({ profile: DEFAULT_PROFILE, choiceA: "이직", choiceB: "유지" }),
  );
  const [onboarded, setOnboarded] = useState(false);

  async function runSimulation() {
    // 백엔드: choiceA/choiceB 각각 POST /predict → { a, b }
    const pair = getPredictionPair({ profile, choiceA, choiceB, detail });
    setResult(pair);
    return pair;
  }

  const value = useMemo(
    () => ({
      profile, setProfile,
      choiceA, setChoiceA,
      choiceB, setChoiceB,
      textA, setTextA,
      textB, setTextB,
      detail, setDetail,
      result, setResult, runSimulation,
      onboarded, setOnboarded,
    }),
    [profile, choiceA, choiceB, textA, textB, detail, result, onboarded],
  );

  return <ResultContext.Provider value={value}>{children}</ResultContext.Provider>;
}

export function useResult() {
  const ctx = useContext(ResultContext);
  if (!ctx) throw new Error("useResult must be used within <ResultProvider>");
  return ctx;
}
