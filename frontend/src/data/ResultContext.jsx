import { createContext, useContext, useMemo, useState } from "react";
import { getPredictionPair } from "./prediction.js";
import { DEFAULT_AVATAR } from "./avatarOptions.js";
import { generateSceneImages, runSimulateRaw } from "../api.js";
import { avatarToPngBlob } from "./avatarImage.js";

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
  values: ["배움·성취", "건강·안정"], // qmode UI 표시용 가치 강제순위
  value_ranking: ["growth", "stability"], // 가치 카드 id 중요한 순 → 개인화 입력(백엔드가 가중치로 변환)
  mbti: "", // 심리 성향 input
  psych_answers: {}, // { D2:"…", D1:"…", D4:"…" } 서술형 답변 → disposition_block 로 전송
  avatarConfig: DEFAULT_AVATAR, // 아바타 빌더 선택(피부·머리·안경·배경)
};

export function ResultProvider({ children }) {
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [choices, setChoices] = useState({ a: "이직", b: "유지" });
  const [scenarioTexts, setScenarioTexts] = useState({ a: "", b: "" });
  const [scenarioDomains, setScenarioDomains] = useState({ a: [], b: [] });
  const [diary, setDiary] = useState("");
  const [result, setResult] = useState(() =>
    ({ ...getPredictionPair({ profile: DEFAULT_PROFILE, choiceA: "이직", choiceB: "유지" }), dataMode: "demo" }),
  );
  const [onboarded, setOnboarded] = useState(false);

  // 선택(choices)+심정(diary) → 결과 쌍 {a,b} 생성. (지금은 목업)
  async function runSimulation(opts = {}) {
    const choiceA = opts.choiceA || choices.a;
    const choiceB = opts.choiceB || choices.b;
    const currentDiary = opts.diary ?? diary;
    const pair = { ...getPredictionPair({ profile, choiceA, choiceB, detail: currentDiary }), dataMode: "demo" };
    setResult(pair);
    let simulation;
    let narrative;
    try {
      simulation = await runSimulateRaw({
        profile,
        choiceA,
        choiceB,
        choiceADetail: opts.choiceADetail ?? scenarioTexts.a,
        choiceBDetail: opts.choiceBDetail ?? scenarioTexts.b,
        choiceADomains: opts.choiceADomains ?? scenarioDomains.a,
        choiceBDomains: opts.choiceBDomains ?? scenarioDomains.b,
        diary: currentDiary,
      });
      narrative = simulation.narrative || {};
      const hasStory = (story) => typeof story === "string" ? Boolean(story.trim()) : Boolean(story?.summary?.trim());
      if (!hasStory(narrative.a) || !hasStory(narrative.b) || narrative._skipped) {
        throw new Error("Claude 응답을 A/B 서사 형식으로 읽지 못했습니다. 백엔드를 재시작한 뒤 다시 시도해주세요.");
      }
    } catch (error) {
      const fallback = { ...pair, narrativeError: error.message };
      setResult(fallback);
      return fallback;
    }

    const storyResult = {
        ...pair,
        dataMode: simulation.fallback ? "demo" : "model",
        domains: { a: scenarioDomains.a, b: scenarioDomains.b },
        narrative,
        evidence: simulation.evidence,
    };
    // Claude 글은 이미지 생성과 무관하게 먼저 보존한다.
    setResult(storyResult);
    try {
      const avatarBlob = await avatarToPngBlob(profile.avatarConfig);
      const visual = await generateSceneImages({ avatarBlob, choiceA, choiceB, narrative });
      const enriched = { ...storyResult, visuals: visual.images, visualModel: visual.model };
      setResult(enriched);
      return enriched;
    } catch (error) {
      const fallback = { ...storyResult, visualError: error.message };
      setResult(fallback);
      return fallback;
    }
  }

  const value = useMemo(
    () => ({
      profile, setProfile,
      choices, setChoices,
      scenarioTexts, setScenarioTexts,
      scenarioDomains, setScenarioDomains,
      diary, setDiary,
      result, setResult,
      runSimulation, onboarded, setOnboarded,
    }),
    [profile, choices, scenarioTexts, scenarioDomains, diary, result, onboarded],
  );

  return <ResultContext.Provider value={value}>{children}</ResultContext.Provider>;
}

export function useResult() {
  const ctx = useContext(ResultContext);
  if (!ctx) throw new Error("useResult must be used within <ResultProvider>");
  return ctx;
}
