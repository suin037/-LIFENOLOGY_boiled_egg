import { createContext, useContext, useMemo, useRef, useState } from "react";
import { getPredictionPair } from "./prediction.js";
import { DEFAULT_AVATAR } from "./avatarOptions.js";
import { generateSceneImages, runCompareRaw, runSimulateRaw } from "../api.js";
import { mapSimulateToPair } from "./simulateAdapter.js";
import { avatarToPngBlob } from "./avatarImage.js";
import { avatarGenerationSpec } from "./avatarOptions.js";
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
  income: null, // 온보딩에서 직접 입력 → 백엔드 monthly_wage
  edu_level: 7, // 대졸
  occupation_group: null, // KSCO 직종 대분류 1~9 — 이직 시뮬레이션에서 수집
  employment_status: null, // KLIPS 종사상지위 1~5
  tenure_years: null, // 현재 일자리 근속연수
  firm_size: null, // KLIPS 기업규모 코드 1~11
  values: [], // qmode UI 표시용 가치 강제순위 — 온보딩에서 사용자가 직접 선택
  value_ranking: [], // 가치 카드 id 중요한 순 → 개인화 입력(백엔드가 가중치로 변환)
  mbti: "", // 심리 성향 input
  psych_answers: {}, // { D2:"…", D1:"…", D4:"…" } 서술형 답변 → disposition_block 로 전송
  avatarConfig: DEFAULT_AVATAR, // 아바타 빌더 선택(피부·머리·안경·배경)
};

export function ResultProvider({ children }) {
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [choices, setChoices] = useState({ a: "이직", b: "유지" });
  const [scenarioTexts, setScenarioTexts] = useState({ a: "", b: "" });
  const [scenarioDomains, setScenarioDomains] = useState({ a: [], b: [] });
  const [scenarioContexts, setScenarioContexts] = useState({ a: {}, b: {} });
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
    const scenarioDomain = loadUniverse().planet;
    noteSimulationRun();
    // 그 날 그 영역(현재 행성)에서 시나리오를 만들었음을 기록 → 지구본에 ◆ 로 표시.
    try {
      recordScenario({
        domain: scenarioDomain,
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
      choiceAContext: opts.choiceAContext ?? scenarioContexts.a,
      choiceBContext: opts.choiceBContext ?? scenarioContexts.b,
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
        imageLoading: true,
      };
      setResult(preview);
      try {
        const summarize = (side) => {
          if (!side) return "";
          const signals = [
            side.choice,
            side.expected_wage != null ? `예상 소득 ${Math.round(side.expected_wage).toLocaleString()}만원` : "",
            side.causal_effect != null ? `추정 변화 ${Number(side.causal_effect).toFixed(1)}%` : "",
            side.risk_label || side.coverage || "",
          ].filter(Boolean);
          return signals.join(" · ");
        };
        recordScenario({
          domain: scenarioDomain,
          title: choiceB ? `${choiceA} vs ${choiceB}` : `${choiceA} 시나리오`,
          br: [summarize(preview.a), summarize(preview.b)].filter(Boolean),
        });
      } catch {
        /* 우주 패널 요약 저장 실패는 결과 화면을 막지 않는다. */
      }
    } catch (error) {
      const fallback = { ...pair, dataMode: "demo", narrativeError: error.message };
      setResult(fallback);
      return fallback;
    }

    // 이미지와 Claude 서사를 동시에 시작한다. 이미지는 사용자가 쓴 A/B 문장을
    // 먼저 활용하고, 수동 재생성 때는 완성된 서사를 사용한다.
    const fastVisualPromise = (async () => {
      const avatarBlob = await avatarToPngBlob(profile.avatarConfig);
      return generateSceneImages({
        avatarBlob,
        avatarSpec: avatarGenerationSpec(profile.avatarConfig),
        choiceA,
        choiceB,
        narrative: {
          a: requestArgs.choiceADetail || choiceA,
          b: requestArgs.choiceBDetail || choiceB,
          visual_a: {},
          visual_b: {},
        },
      });
    })().then(
      (visual) => ({ visual, error: null }),
      (error) => ({ visual: null, error }),
    );

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
          const { visual, error: imageError } = await fastVisualPromise;
          if (imageError) throw imageError;
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
        avatarSpec: avatarGenerationSpec(profile.avatarConfig),
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
      scenarioContexts, setScenarioContexts,
      diary, setDiary,
      result, setResult,
      runSimulation, retryVisuals, onboarded, setOnboarded,
    }),
    [profile, choices, scenarioTexts, scenarioDomains, scenarioContexts, diary, result, onboarded],
  );

  return <ResultContext.Provider value={value}>{children}</ResultContext.Provider>;
}

export function useResult() {
  const ctx = useContext(ResultContext);
  if (!ctx) throw new Error("useResult must be used within <ResultProvider>");
  return ctx;
}
