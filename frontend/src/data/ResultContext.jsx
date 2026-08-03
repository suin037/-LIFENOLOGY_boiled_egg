import { createContext, useContext, useMemo, useState } from "react";
import { getPredictionPair } from "./prediction.js";
import { MOCK_RESULT } from "./result.js";
import { DEFAULT_AVATAR } from "./avatarOptions.js";
import { noteSimulationRun, initDemoFromUrl } from "./myUniverse.js";

// `?demo=1` 로 들어온 경우 첫 렌더 전에 예시 기록을 채운다. (민주 '나의 우주' 훅)
// (첫 화면이 홈이든 나의 우주든 같은 저장소를 읽으므로 여기서 한 번만 처리)
initDemoFromUrl();

// 결과 데이터 + 온보딩 프로필을 한 곳에 모으는 컨텍스트.
// ※ [임시 병합 2026-08-03] 프론트에 result 형태 규약이 2가지로 섞여 있어(홈/HomeHub=option_a,
//   결과 8탭 대시보드=a,b) 어느 하나만 쓰면 반대쪽이 크래시함. 임시로 두 형태를 모두 담은
//   객체를 만들어 로컬 프리뷰가 안 깨지게 함. 백엔드 실연결·형태 통일은 소현 협의 후 정리 예정.
const ResultContext = createContext(null);

// 소현 신형(getPredictionPair→{a,b}) + 옛 형태(MOCK_RESULT→{meta,option_a,option_b}) 합본
const makePair = (opts) => ({ ...MOCK_RESULT, ...getPredictionPair(opts) });

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
    makePair({ profile: DEFAULT_PROFILE, choiceA: "이직", choiceB: "유지" }),
  );
  const [onboarded, setOnboarded] = useState(false);

  // 선택(choices)+심정(diary) → 결과(두 형태 합본) 생성. (지금은 목업)
  async function runSimulation(opts = {}) {
    const choiceA = opts.choiceA || choices.a;
    const choiceB = opts.choiceB || choices.b;
    noteSimulationRun(); // '나의 우주' 시뮬레이션 횟수·XP 집계용 (민주, 실행 1회)
    const pair = makePair({ profile, choiceA, choiceB, detail: opts.diary ?? diary });
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
