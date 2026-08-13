import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { getPredictionPair } from "./prediction.js";
import { DEFAULT_AVATAR } from "./avatarOptions.js";
import { generateSceneImages, runCompareRaw, runSimulateRaw } from "../api.js";
import { mapSimulateToPair } from "./simulateAdapter.js";
import { avatarToPngBlob } from "./avatarImage.js";
import { initDemoFromUrl, noteSimulationRun, recordScenario, loadUniverse } from "./myUniverse.js";
import { toPlanetKey } from "./choices.js";

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

// 프로필 영속 — 온보딩 입력·가치관 검사 결과가 새로고침에 날아가지 않도록 저장한다.
// (검사는 28문항 10분짜리라 다시 하라고 할 수 없다.)
const PROFILE_KEY = "pm.profile.v1";

function loadProfile() {
  try {
    const saved = JSON.parse(localStorage.getItem(PROFILE_KEY) || "null");
    return saved ? { ...DEFAULT_PROFILE, ...saved } : DEFAULT_PROFILE;
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function ResultProvider({ children }) {
  const [profile, setProfile] = useState(loadProfile);
  useEffect(() => {
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    } catch { /* 저장 실패는 무시 — 기능은 계속 동작 */ }
  }, [profile]);
  const [choices, setChoices] = useState({ a: "이직", b: "유지" });
  const [scenarioTexts, setScenarioTexts] = useState({ a: "", b: "" });
  const [scenarioDomains, setScenarioDomains] = useState({ a: [], b: [] });
  const [diary, setDiary] = useState("");
  const [result, setResult] = useState(() =>
    ({ ...getPredictionPair({ profile: DEFAULT_PROFILE, choiceA: "이직", choiceB: "유지" }), dataMode: "demo" }),
  );
  const [onboarded, setOnboarded] = useState(false);
  // 관계 선택지일 때 담아두는 대화·연락 내역(붙여넣기·화면 캡처). 공고와 같은 흐름:
  // 입력에서 담고, 시뮬레이션 후 결과에서 분석을 본다.
  const [talks, setTalks] = useState([]);              // [{id, tag, transcript, images, label}]
  const [relResults, setRelResults] = useState([]);
  const [relBusy, setRelBusy] = useState(false);

  async function analyzeTalks(list = talks) {
    if (!list.length) { setRelResults([]); return; }
    setRelBusy(true);
    try {
      const { analyzeRelationship } = await import("./relationshipApi.js");
      const results = [];
      // 대화는 이미지 포함이라 무거워서 하나씩 — 동시에 던지면 타임아웃이 잦다.
      for (const t of list) {
        // eslint-disable-next-line no-await-in-loop
        const data = await analyzeRelationship(t).catch(() => ({ error: "network", label: t.label }));
        results.push({ ...data, label: t.label, tag: t.tag });
        setRelResults([...results]);
      }
    } finally {
      setRelBusy(false);
    }
  }

  // 공고는 입력 화면에서 '담기만' 하고(원문), 분석은 시뮬레이션을 돌린 뒤 결과 화면에서 보여준다.
  const [postings, setPostings] = useState([]);        // [{id, text, label}]
  const [jobAnalyses, setJobAnalyses] = useState([]);  // 분석 결과(순서 = postings)
  const [jobBusy, setJobBusy] = useState(false);

  /** 담아둔 공고들을 한꺼번에 분석한다 — 시뮬레이션 시작과 함께 백그라운드로 돌린다. */
  async function analyzePostings(list = postings, choice = null) {
    if (!list.length) { setJobAnalyses([]); return; }
    setJobBusy(true);
    try {
      const { analyzeJobPosting } = await import("./jobAnalysis.js");
      const results = await Promise.all(
        list.map((p) =>
          analyzeJobPosting({ posting: p.text, choice, profile })
            .then((data) => (data.ok ? { ...data, posting: p.text } : { ok: false, label: p.label, reason: data.reason }))
            .catch(() => ({ ok: false, label: p.label, reason: "network" })),
        ),
      );
      setJobAnalyses(results);
    } finally {
      setJobBusy(false);
    }
  }
  const simulationRunRef = useRef(0);

  // 선택(choices)+심정(diary) → 결과 쌍 {a,b} 생성. (지금은 목업)
  async function runSimulation(opts = {}) {
    const runId = ++simulationRunRef.current;
    const choiceA = opts.choiceA || choices.a;
    const choiceB = opts.choiceB || choices.b;
    const currentDiary = opts.diary ?? diary;
    // 시나리오가 꽂힐 행성 — 선택지에서 감지한 영역으로 정한다.
    // 예전엔 loadUniverse().planet(마지막에 고른 행성)을 썼는데, 새 우주 화면은 그 값을
    // 저장하지 않아 항상 기본값 'career'가 되고 모든 시나리오가 진로 행성에만 쌓였다.
    const domainsForScenario = [
      ...(opts.choiceADomains ?? scenarioDomains.a ?? []),
      ...(opts.choiceBDomains ?? scenarioDomains.b ?? []),
    ];
    const scenarioDomain = toPlanetKey(domainsForScenario) || loadUniverse().planet || "career";
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
    // 이 시뮬레이션이 어느 행성 얘기였는지 결과에 남긴다 — 보관함에 저장한 뒤
    // 회고까지 붙으면 '그 영역의 N년 뒤'를 쓸 때 재료로 다시 꺼내 쓴다.
    const pair = { ...getPredictionPair({ profile, choiceA, choiceB, detail: currentDiary }),
                   dataMode: "demo", planetDomain: scenarioDomain };
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
      postings, setPostings,
      jobAnalyses, setJobAnalyses, jobBusy, analyzePostings,
      talks, setTalks, relResults, relBusy, analyzeTalks,
    }),
    [profile, choices, scenarioTexts, scenarioDomains, diary, result, onboarded,
     postings, jobAnalyses, jobBusy, talks, relResults, relBusy],
  );

  return <ResultContext.Provider value={value}>{children}</ResultContext.Provider>;
}

export function useResult() {
  const ctx = useContext(ResultContext);
  if (!ctx) throw new Error("useResult must be used within <ResultProvider>");
  return ctx;
}
