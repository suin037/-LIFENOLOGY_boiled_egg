import { createContext, useContext, useMemo, useRef, useState } from "react";
import { getPredictionPair } from "./prediction.js";
import { DEFAULT_AVATAR } from "./avatarOptions.js";
import { generateSceneImages, runCompareRaw, runSimulateRaw } from "../api.js";
import { mapSimulateToPair } from "./simulateAdapter.js";
import { avatarToPngBlob } from "./avatarImage.js";
import { initDemoFromUrl, noteSimulationRun, recordScenario, loadUniverse } from "./myUniverse.js";

// 결과 데이터 + 온보딩 프로필을 한 곳에 모으는 컨텍스트.
// runSimulation() 이 선택(choices)+심정(diary)으로 결과 쌍{a,b}을 만든다.
// ※ 지금은 목업(getPredictionPair). 백엔드 실연결은 api.js(runSimulate)를
//   내 결과 형태로 확장해 여기서 호출하면 됨(파일은 보존해둠).
const ResultContext = createContext(null);

// 발표/체험 링크의 ?demo=1 요청이 있을 때만 나의 우주 예시 기록을 준비한다.
initDemoFromUrl();

const DEFAULT_PROFILE = {
  name: "",
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
  const simulationRunRef = useRef(0);

  // 선택(choices)+심정(diary) → 결과 쌍 {a,b} 생성. (지금은 목업)
  async function runSimulation(opts = {}) {
    const runId = ++simulationRunRef.current;
    const choiceA = opts.choiceA || choices.a;
    const choiceB = opts.choiceB || choices.b;
    const currentDiary = opts.diary ?? diary;
    noteSimulationRun();
    // 그 날 그 영역(현재 행성)에서 시나리오를 만들었음을 기록 → 지구본에 ◆ 로 표시.
    try {
      recordScenario({
        domain: loadUniverse().planet,
        title: choiceB ? `${choiceA} vs ${choiceB}` : `${choiceA} 시나리오`,
      });
    } catch {
      /* 시나리오 기록 실패 무시 */
    }
    const pair = { ...getPredictionPair({ profile, choiceA, choiceB, detail: currentDiary }), dataMode: "demo" };
    setResult(pair);
    const requestArgs = {
      profile,
      choiceA,
      choiceB,
      choiceADetail: opts.choiceADetail ?? scenarioTexts.a,
      choiceBDetail: opts.choiceBDetail ?? scenarioTexts.b,
      choiceADomains: opts.choiceADomains ?? scenarioDomains.a,
      choiceBDomains: opts.choiceBDomains ?? scenarioDomains.b,
      diary: currentDiary,
    };
    let preview;
    try {
      const comparison = await runCompareRaw(requestArgs);
      const real = mapSimulateToPair({ compare: comparison }, {
        choiceA,
        choiceB,
        detailA: opts.choiceADetail ?? scenarioTexts.a,
        detailB: opts.choiceBDetail ?? scenarioTexts.b,
      });
      preview = {
        ...pair,
        ...(real || {}),
        dataMode: real ? "model" : "demo",
        domains: {
          a: opts.choiceADomains ?? scenarioDomains.a,
          b: opts.choiceBDomains ?? scenarioDomains.b,
        },
        narrativeLoading: true,
        imageLoading: false,
      };
      setResult(preview);
    } catch (error) {
      const fallback = { ...pair, dataMode: "demo", narrativeError: error.message };
      setResult(fallback);
      return fallback;
    }

    // 결과 화면은 수치가 준비되는 즉시 열고, 느린 Claude·이미지는 뒤에서 채운다.
    void (async () => {
      try {
        const simulation = await runSimulateRaw(requestArgs);
        if (simulationRunRef.current !== runId) return;
        const narrative = simulation.narrative || {};
        const hasStory = (story) => typeof story === "string" ? Boolean(story.trim()) : Boolean(story?.summary?.trim());
        if (!hasStory(narrative.a) || !hasStory(narrative.b) || narrative._skipped) {
          throw new Error("Claude 응답을 A/B 서사 형식으로 읽지 못했습니다.");
        }
        const storyResult = {
          ...preview,
          narrative,
          evidence: simulation.evidence,
          narrativeLoading: false,
          imageLoading: true,
        };
        setResult(storyResult);

        try {
          const avatarBlob = await avatarToPngBlob(profile.avatarConfig);
          const visual = await generateSceneImages({ avatarBlob, choiceA, choiceB, narrative });
          if (simulationRunRef.current !== runId) return;
          setResult({ ...storyResult, visuals: visual.images, visualModel: visual.model, imageLoading: false });
        } catch (imageError) {
          if (simulationRunRef.current !== runId) return;
          setResult({ ...storyResult, imageLoading: false, visualError: imageError.message });
        }
      } catch (error) {
        if (simulationRunRef.current !== runId) return;
        setResult({ ...preview, narrativeLoading: false, imageLoading: false, narrativeError: error.message });
      }
    })();
    return preview;
  }

  async function retryVisuals() {
    const narrative = result.narrative;
    if (!narrative?.a || !narrative?.b) {
      throw new Error("이미지에 사용할 서사가 아직 준비되지 않았어요.");
    }
    setResult((current) => ({ ...current, imageLoading: true, visualError: null }));
    try {
      const avatarBlob = await avatarToPngBlob(profile.avatarConfig);
      const visual = await generateSceneImages({
        avatarBlob,
        choiceA: result.a.choice,
        choiceB: result.b.choice,
        narrative,
      });
      setResult((current) => ({
        ...current,
        visuals: visual.images,
        visualModel: visual.model,
        imageLoading: false,
        visualError: null,
      }));
    } catch (error) {
      setResult((current) => ({ ...current, imageLoading: false, visualError: error.message }));
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
      runSimulation, retryVisuals, onboarded, setOnboarded,
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
