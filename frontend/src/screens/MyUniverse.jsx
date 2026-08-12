import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Caption } from "../components/ui.jsx";
import Constellation from "../components/Constellation.jsx";
import UniverseMap, { PLANET_TRAIT } from "../components/UniverseMap.jsx";
import PlanetGlobe from "../components/PlanetGlobe.jsx";
import { useResult } from "../data/ResultContext.jsx";
import { PLANETS } from "../data/result.js";
import { listUniverses } from "../data/savedUniverses.js";
import { chosenChoice } from "../data/actionBridge.js";
import { domainAnalysis, domainReport, analyzeStars } from "../data/diarySignals.js";
import { seedDemoYear } from "../data/demoYear.js";
import { seedDemoEunwoo } from "../data/demoEunwoo.js";
import {
  universeSummary,
  constellationGroups,
  adaptiveGroups,
  scenariosByPlanet,
  setPlanet as persistPlanet,
  seedDemoCheckins,
  resetUniverse,
  isDemo,
  todayKey,
  STARS_PER_CONSTELLATION,
} from "../data/myUniverse.js";
import {
  classifyConstellation,
  badgeLabel,
  HONESTY_NOTE,
} from "../data/constellationRules.js";
import { qidByText } from "../data/questions.js";
import { DEMO_REPORTS } from "../data/demoReports.js";
import {
  analyzeDisposition,
  getSavedReport,
  clearSavedReports,
  REPORT_UID,
} from "../data/dispositionApi.js";
import { nextReward, unlockedRewards } from "../data/unlocks.js";
import { planetSkin } from "../data/petShop.js";

// 저장 카드 배경 그라디언트(순번용) — 데이터가 아니라 표시용 색.
const SLOT_GRADIENTS = [
  ["#3a2a6d", "#6d4aa0"],
  ["#12324d", "#1f6fa0"],
  ["#4d1230", "#a01f5a"],
];

// 나의 우주 = 개인화 대시보드. 레벨/XP · 별자리 · 행성 · 평행우주 저장 · 통계.
// 수치는 전부 localStorage 의 실제 활동 기록(pm.myuniverse.v1)에서 파생된다.
export default function MyUniverse() {
  const navigate = useNavigate();
  const { profile, setResult } = useResult();

  const [tick, setTick] = useState(0); // 저장 후 다시 읽기용
  const refresh = () => setTick((t) => t + 1);

  const u = useMemo(() => universeSummary(), [tick]);
  const savedUnivs = useMemo(() => listUniverses(), [tick]); // 실제 저장한 평행우주
  // 저장/태깅으로 데이터가 바뀌면(같은 탭) 즉시 다시 읽는다 — 별이 바로 뜨게.
  useEffect(() => {
    const h = () => refresh();
    window.addEventListener("pm:universe", h);
    return () => window.removeEventListener("pm:universe", h);
  }, []);
  const ownedRewards = unlockedRewards(u.highestLevel);
  const upcomingReward = nextReward(u.highestLevel);
  const [picked, setPicked] = useState(null); // 탭한 별
  const [weekBack, setWeekBack] = useState(0); // 0 = 이번 주, 1 = 지난주 …
  const [showReport, setShowReport] = useState(false); // 주간 리포트 펼침
  const [constellationSheetOpen, setConstellationSheetOpen] = useState(false);
  const [focusMonth, setFocusMonth] = useState(null); // 우주 지도에서 줌인한 달(YYYY-MM)
  const [clusterOpen, setClusterOpen] = useState(null); // 행성 줌에서 누른 성단(별자리 묶음)
  const [clusterPicked, setClusterPicked] = useState(null); // 성단 시트에서 고른 별
  const [reportSheet, setReportSheet] = useState(false); // 행성 리포트 시트
  const [reportCache, setReportCache] = useState({}); // weekKey → { report, actions }
  const [reportBusy, setReportBusy] = useState(false);
  const [reportErr, setReportErr] = useState(null);

  const planet = u.state.planet;
  const isAll = planet === "all"; // '전체' = 궤도 개요(은하 카드가 시간축을 맡는다)
  const selectedPlanet = PLANETS.find((p) => p.key === planet) || PLANETS[0];
  // 영역별(또는 전체) 분석 — 전체면 모든 일기 기반, 도메인이면 그 영역만.
  const domainAnal = useMemo(() => domainAnalysis(isAll ? "all" : planet, u.state), [isAll, planet, u.state]);
  // 행성별 성단(적응형 별자리 묶음) — 우주 지도 줌인 때 행성 둘레에 뿌려진다.
  const clustersByPlanet = useMemo(
    () => Object.fromEntries(PLANETS.map((p) => [p.key, adaptiveGroups(p.key, u.state)])),
    [u.state],
  );
  // 궤도 개요 재료 — 영역별 분석 1회 계산해 칩 뱃지·행성 크기·요약에 공유.
  const orbitRows = useMemo(
    () => PLANETS.map((p) => ({ ...p, a: domainAnalysis(p.key, u.state) })),
    [u.state],
  );
  const orbitMaxN = Math.max(1, ...orbitRows.map((r) => r.a.n || 0));
  // 영역별 시뮬레이션 수 — 행성 ◆ 뱃지 재료.
  const scenarioCounts = useMemo(
    () => Object.fromEntries(PLANETS.map((p) => [p.key, scenariosByPlanet(p.key, u.state).length])),
    [u.state],
  );

  // 월별 묶음 — 우주 지도의 '12달의 별' 재료(최근 12개월).
  const monthGroups = useMemo(() => {
    const by = {};
    for (const c of u.state.checkins || []) {
      if (!c.date) continue;
      const mk = c.date.slice(0, 7);
      (by[mk] ||= []).push(c);
    }
    return Object.entries(by)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([monthKey, entries]) => {
        const moods = entries
          .map((c) => (c.mood != null ? c.mood : c.valence != null ? c.valence * 2 + 3 : null))
          .filter((v) => v != null);
        return {
          monthKey,
          entries,
          n: entries.length,
          avgMood: moods.length ? moods.reduce((x, y) => x + y, 0) / moods.length : null,
        };
      });
  }, [u.state]);

  const groups = useMemo(() => constellationGroups(u.state), [u.state]);
  const idx = Math.max(0, groups.length - 1 - weekBack);
  const group = groups[idx] || null;

  // 달 → 그 달에 걸친 달력 주 그룹들(주간 별자리 재료). 지도 줌 때 펼쳐질 모양.
  const weeksByMonth = useMemo(() => {
    const map = {};
    for (const m of monthGroups) {
      map[m.monthKey] = groups.filter((g) =>
        g.stars.some((s) => !s.empty && s.date.slice(0, 7) === m.monthKey),
      );
    }
    return map;
  }, [monthGroups, groups]);

  // 지도에서 주간 별자리 열기 — 기존 주간 시트 재사용.
  function openWeekFromMap(w) {
    setWeekBack(Math.max(0, groups.length - 1 - w.index));
    setPicked(null);
    setShowReport(false);
    setConstellationSheetOpen(true);
  }

  // 3D 지구본의 별자리 클릭 — 지구본에 보이는 '그 필터된 묶음' 그대로 성단 시트로.
  // (달력 원본 주를 열면 다른 도메인 별까지 섞여 모양이 달라진다 — 데이터 일치가 핵심.)
  function openClusterFromGlobe(selectedGroup) {
    if (!selectedGroup) return;
    setClusterPicked(null);
    setClusterOpen(selectedGroup);
  }

  // 행성 클릭 → 카메라 비행(0.85s) 후 3D 지구본으로 전환.
  const [globeReady, setGlobeReady] = useState(false);
  useEffect(() => {
    if (isAll) {
      setGlobeReady(false);
      return undefined;
    }
    const t = setTimeout(() => setGlobeReady(true), 120); // 클릭 거의 즉시 3D로 — 밑의 카메라가 잔상만 이어준다
    return () => clearTimeout(t);
  }, [isAll, planet]);

  // 확장형(데스크톱)에서는 시트 팝업 대신 지도가 왼쪽으로 줄고 오른쪽 패널에 상세가 뜬다.
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const h = (e) => setIsDesktop(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);
  // 행성 전환 공통 처리 — 낡은 상세 정리(리포트 패널은 새 행성으로 갱신 유지).
  function switchPlanet(key) {
    setFocusMonth(null);
    setClusterOpen(null);
    setClusterPicked(null);
    setConstellationSheetOpen(false);
    setPicked(null);
    setShowReport(false);
    if (planet === key) {
      setReportSheet(false);
      choosePlanet("all");
    } else {
      choosePlanet(key);
    }
  }
  // 행성 뷰에서 옆으로 넘기기 — 일기 띠처럼 이전/다음 행성 순회.
  const planetIdx = Math.max(0, PLANETS.findIndex((p) => p.key === planet));
  function stepPlanet(dir) {
    const i = (planetIdx + dir + PLANETS.length) % PLANETS.length;
    switchPlanet(PLANETS[i].key);
  }

  const weekDetailOpen = constellationSheetOpen && !!group;
  const detailOpen = !!clusterOpen || (reportSheet && !isAll) || weekDetailOpen;
  function closeDetail() {
    setClusterOpen(null);
    setClusterPicked(null);
    setReportSheet(false);
    setConstellationSheetOpen(false);
    setPicked(null);
    setShowReport(false);
  }

  // 상세 본문 — 모바일 시트와 데스크톱 사이드 패널이 같은 내용을 공유한다.
  function renderClusterDetail() {
    if (!clusterOpen) return null;
    const a = analyzeStars(clusterOpen.stars);
    const c = classifyConstellation(clusterOpen, profile?.value_ranking);
    return (
      <>
        <div className="rounded-[24px] border border-white/10 bg-[#091321] p-3">
          <Constellation
            size={isDesktop ? 240 : 292}
            stars={clusterOpen.stars}
            todayDate={todayKey()}
            selectedDate={clusterPicked?.date}
            onSelect={(s) => (s.empty ? null : setClusterPicked((cc) => (cc?.date === s.date ? null : s)))}
          />
          <p className="mt-1 text-center text-[11px] text-mut">별을 누르면 그날의 기록을 볼 수 있어요.</p>
        </div>
        {a.ok && (
          <p className="mt-2 rounded-xl border border-line bg-[#0E1424] px-3 py-2.5 text-[11.5px] leading-relaxed text-sub">
            <span className="mr-1 rounded-md border border-line px-1.5 py-0.5 text-[10px]">{badgeLabel(c)}</span>
            기록 {a.n}개 · 기분 평균 {a.moodAvg}.
            {a.trend != null && (a.trend > 0.1 ? " 뒤로 갈수록 나아졌어요." : a.trend < -0.1 ? " 뒤로 갈수록 가라앉았어요." : " 큰 기복은 없었어요.")}
            {a.topEmotions.length > 0 && ` 자주 남긴 감정: ${a.topEmotions.join("·")}.`}
          </p>
        )}
        {clusterPicked && <StarDetail star={clusterPicked} />}
      </>
    );
  }

  function renderWeekDetail() {
    if (!group) return null;
    return (
      <>
        {groups.length > 1 && (
          <div className="mb-2 flex items-center justify-between rounded-full border border-white/10 bg-black/10 px-2 py-1.5">
            <PagerBtn disabled={idx <= 0} onClick={() => { setWeekBack((v) => v + 1); setPicked(null); setShowReport(false); }}>‹</PagerBtn>
            <span className="text-[11px] text-sub">{group.weekStart} · {group.filled}/{STARS_PER_CONSTELLATION}일 기록</span>
            <PagerBtn disabled={weekBack <= 0} onClick={() => { setWeekBack((v) => Math.max(0, v - 1)); setPicked(null); setShowReport(false); }}>›</PagerBtn>
          </div>
        )}
        <div className="rounded-[24px] border border-white/10 bg-[#091321] p-3">
          <Constellation size={isDesktop ? 240 : 292} stars={group.stars} todayDate={todayKey()} selectedDate={picked?.date} onSelect={(star) => star.future ? null : setPicked((current) => current?.date === star.date ? null : star)} />
          <p className="mt-1 text-center text-[11px] text-mut">별을 누르면 그날의 일기와 체크인 상태를 볼 수 있어요.</p>
        </div>

        {picked && <StarDetail star={picked} />}

        <div className="mt-3 grid grid-cols-2 gap-2">
          <MiniStat label="기록한 날" value={`${group.filled}일`} center />
          <MiniStat label="연속 기록" value={`${u.streak}일`} center />
        </div>

        {group.complete ? (
          <>
            <button type="button" onClick={() => { const next = !showReport; setShowReport(next); if (next) loadWeekReport(); }} className="tap mt-3 w-full rounded-2xl border border-cyan/60 bg-[#122440] py-3 text-[12px] font-bold text-cyan">
              {showReport ? "주간 리포트 접기" : "주간 리포트 한 번에 보기"}
            </button>
            {showReport && (
              <div className="mt-2 space-y-2">
                <WeeklyReport group={group} constellation={constellation} />
                <NarrativeBlock data={reportCache[group.weekStart]} busy={reportBusy} err={reportErr} onRetry={loadWeekReport} />
              </div>
            )}
          </>
        ) : (
          <div className="mt-3 rounded-2xl border border-dashed border-white/10 px-3 py-3 text-center text-[11px] text-mut">이번 주가 끝나면 주간 리포트가 만들어져요. {group.remaining ? `${group.remaining}일 남았어요.` : ""}</div>
        )}
      </>
    );
  }

  const constellation = useMemo(
    () => (group ? classifyConstellation(group, profile?.value_ranking) : null),
    [group, profile?.value_ranking],
  );

  function choosePlanet(key) {
    persistPlanet(key);
    refresh();
  }

  // 데모 시드/비우기 — 컨트롤은 헤더 한 곳에만 둔다(중복 방지).
  function resetViews() {
    clearSavedReports(REPORT_UID);
    setReportCache({});
    setWeekBack(0);
    setPicked(null);
    setShowReport(false);
    setConstellationSheetOpen(false);
  }
  function runDemo(kind) {
    resetViews();
    resetUniverse();
    if (kind === "1y") seedDemoYear();
    else if (kind === "eunwoo") seedDemoEunwoo(); // minjub 1년치 페르소나(워라밸 이직러)
    else seedDemoCheckins();
    refresh();
  }
  function clearDemo() {
    resetViews();
    resetUniverse();
    refresh();
  }


  // 완성된 주의 리포트를 가져온다.
  //  1) DB 저장본 먼저 조회(즉시) → 있으면 그대로 사용
  //  2) 없으면 그 주 기록으로 1회 생성·저장(느림, LLM) → 이후엔 저장본이 남음
  async function loadWeekReport() {
    if (!group || !group.complete) return;
    const wk = group.weekStart;
    if (reportCache[wk]) return; // 이미 불러옴

    // 데모(예시 6주) → 미리 생성해 둔 고정 리포트 사용. API 호출 안 함.
    if (isDemo(u.state)) {
      const demo = DEMO_REPORTS[group.index];
      if (demo) {
        setReportCache((c) => ({ ...c, [wk]: { report: demo.report, actions: demo.actions || [] } }));
        return;
      }
    }

    setReportBusy(true);
    setReportErr(null);
    try {
      let data = await getSavedReport(REPORT_UID, wk);
      if (!data.found) {
        const stars = group.stars.filter((s) => !s.empty && s.valence != null);
        const entries = stars.map((s) => ({
          date: s.date,
          mood: s.mood,
          text: s.text || s.note || "",
          answers: answersToMap(s.answers),
        }));
        data = await analyzeDisposition({
          ranked_cards: profile?.value_ranking || [],
          mbti: profile?.mbti || null,
          entries,
          uid: REPORT_UID,
          week_key: wk,
        });
      }
      setReportCache((c) => ({
        ...c,
        [wk]: { report: data.report, actions: data.actions || [] },
      }));
    } catch (e) {
      setReportErr(String(e?.message || e));
    } finally {
      setReportBusy(false);
    }
  }

  return (
    <div
      className="universe-scene relative min-h-full overflow-hidden rounded-[28px] border border-white/10 px-4 pb-8 shadow-[0_20px_55px_rgba(0,0,0,.3)] lg:min-h-[680px] lg:px-8 [&>.bg-card]:my-0 [&>.bg-card]:rounded-none [&>.bg-card]:border-t [&>.bg-card]:border-white/[.07] [&>.bg-card]:bg-transparent [&>.bg-card]:px-0 [&>.bg-card]:py-6"
      style={{
        backgroundColor: "#0A1322",
        backgroundImage: "radial-gradient(circle at 18% 12%, rgba(94,143,255,.2), transparent 25%), radial-gradient(circle at 82% 38%, rgba(143,92,246,.14), transparent 28%), radial-gradient(circle, rgba(255,255,255,.42) 0 1px, transparent 1.3px), linear-gradient(180deg,#0D1728 0%,#091321 58%,#0C1626 100%)",
        backgroundSize: "auto, auto, 73px 73px, auto",
      }}
    >
      <div className="mb-3 mt-2 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-[24px] font-bold leading-[1.2]">나의 우주</h1>
          <p className="mt-1 text-[13px] text-sub">
            하루에 별 하나. {STARS_PER_CONSTELLATION}개가 모이면 별자리가 됩니다.
          </p>
        </div>
        {(u.stars === 0 || isDemo(u.state)) && (
          <div className="mt-0.5 flex shrink-0 flex-wrap justify-end gap-1.5">
            <DemoBtn onClick={() => runDemo("6w")}>{isDemo(u.state) ? "6주" : "6주 데모"}</DemoBtn>
            <DemoBtn onClick={() => runDemo("1y")}>{isDemo(u.state) ? "1년" : "1년 데모"}</DemoBtn>
            <DemoBtn onClick={() => runDemo("eunwoo")}>{isDemo(u.state) ? "은우" : "은우 데모"}</DemoBtn>
            {isDemo(u.state) && <DemoBtn onClick={clearDemo}>비우기</DemoBtn>}
          </div>
        )}
      </div>

      {/* 예시 기록이 들어있는 동안은 항상 밝힌다 — 남의 기록을 내 기록처럼 보여주지 않는다. */}
      {isDemo(u.state) && (
        <div className="mb-3 flex items-center gap-1.5 rounded-xl border border-cyan/20 bg-cyan/[.07] px-3 py-2 text-[10px] text-cyan">
          <span aria-hidden="true">✦</span>
          예시 기록을 보고 있어요 — 실제 내 기록이 아닙니다.
        </div>
      )}

      {/* 🌌 우주 지도 — 은하(12달의 별)와 행성(영역)을 한 화면에. 달=월간 펼침, 행성=영역 줌인. */}
      {u.stars > 0 ? (
        <Card>
          <div className="flex items-center justify-between">
            <div className="text-base font-semibold">🌌 나의 우주</div>
            <span className="text-[10px] text-mut">가운데 12달의 별 · 둘레 5개 행성</span>
          </div>
          {/* 지도는 항상 깔려 있고, 행성 도착 시 3D 지구본이 그 위로 크로스페이드로 얹힌다.
              확장(PC): /my 는 와이드(1120px) — 지도 왼쪽(폭 캡) + 정보 오른쪽 2컬럼. */}
          <div className="lg:flex lg:items-start lg:gap-7">
          <div
            className="relative mx-auto w-full max-w-[540px] lg:mx-0 lg:shrink-0"
            style={isDesktop ? { width: detailOpen ? 360 : 470, transition: "width .5s cubic-bezier(.25,.9,.3,1)" } : undefined}
          >
          <UniverseMap
            monthGroups={monthGroups}
            weeksByMonth={weeksByMonth}
            planets={orbitRows}
            maxPlanetN={orbitMaxN}
            clustersByPlanet={clustersByPlanet}
            scenarioCounts={scenarioCounts}
            focus={isAll ? null : planet}
            focusMonth={focusMonth}
            skin={planetSkin()}
            onMonthPick={(mk) => {
              if (!isAll) choosePlanet("all");
              closeDetail(); // 열려 있던 상세(성단·주간·리포트)는 새 포커스로 정리
              setFocusMonth((prev) => (prev === mk ? null : mk));
            }}
            onPlanetPick={switchPlanet}
            onClusterOpen={(g) => {
              setClusterPicked(null);
              setClusterOpen(g);
            }}
            onWeekOpen={openWeekFromMap}
          />
          {/* 지구본은 행성 클릭 즉시 '투명하게' 마운트(캔버스 초기화를 비행 중에 미리) —
              550ms에 투명도만 올려 순수 크로스페이드. 마운트 히치로 인한 멈칫거림 제거. */}
          {!isAll && (
            <div
              className="absolute inset-0 overflow-hidden"
              style={{
                background: "#0A1322",
                opacity: globeReady ? 1 : 0,
                pointerEvents: globeReady ? "auto" : "none",
                transition: "opacity .4s ease",
              }}
            >
              <PlanetGlobe
                fill
                planet={selectedPlanet}
                skin={planetSkin()}
                trait={PLANET_TRAIT[planet] || {}}
                groups={clustersByPlanet[planet] || []}
                scenarios={scenariosByPlanet(planet).map((s) => ({
                  date: s.date,
                  title: s.title,
                  dateLabel: s.date,
                  br: s.br,
                }))}
                onOpen={() => navigate("/input")}
                onConstellationOpen={openClusterFromGlobe}
                onPlanetTap={() => {
                  closeDetail();
                  choosePlanet("all");
                }}
              />
              {/* 행성 넘기기 — 일기 띠처럼 옆으로 순회 */}
              <button
                onClick={() => stepPlanet(-1)}
                className="tap absolute left-1.5 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/[.08] text-[18px] text-sub"
                aria-label="이전 행성"
              >
                ‹
              </button>
              <button
                onClick={() => stepPlanet(1)}
                className="tap absolute right-1.5 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/[.08] text-[18px] text-sub"
                aria-label="다음 행성"
              >
                ›
              </button>
              <div className="absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
                {PLANETS.map((p) => (
                  <span key={p.key} className={`h-1.5 w-1.5 rounded-full ${p.key === planet ? "bg-cyan" : "bg-white/20"}`} />
                ))}
              </div>
            </div>
          )}
          </div>

          <div className="min-w-0 lg:flex-1 lg:pt-1">
          {focusMonth ? (
            (() => {
              const mg = monthGroups.find((m) => m.monthKey === focusMonth);
              const a = mg ? analyzeStars(mg.entries) : null;
              return (
                <>
                  <div className="mt-2 flex items-center justify-between rounded-xl border border-line bg-[#0E1424] px-3 py-2.5">
                    <span className="text-[12px] font-bold text-cyan">
                      🌙 {parseInt(focusMonth.slice(5), 10)}월 · 기록 {mg?.n || 0}일
                      {mg?.avgMood != null && ` · 평균 ${mg.avgMood.toFixed(1)}`}
                    </span>
                    <button onClick={() => { closeDetail(); setFocusMonth(null); }} className="tap text-[11px] text-mut">
                      ← 우주로
                    </button>
                  </div>
                  <p className="mt-1.5 text-[10px] leading-relaxed text-mut">
                    뭉쳐 있던 별들이 이 달의 주간 별자리 모양으로 펼쳐졌어요 — 별자리를 누르면 그 주
                    기록이 열려요.
                    {a?.ok && a.topEmotions.length > 0 && ` 자주 남긴 감정: ${a.topEmotions.join("·")}.`}
                  </p>
                </>
              );
            })()
          ) : isAll ? (
            <>
              <p className="mt-1 text-[10px] leading-relaxed text-mut">
                달 성단을 누르면 그 달의 별자리들이 펼쳐지고, 행성을 누르면 그 행성으로 날아가요. 별
                색=기분 · 성단 크기=기록량.
              </p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <MiniStat label="수집한 별" value={`${u.stars}개`} center />
                <MiniStat label="연속 기록" value={`${u.streak}일`} center />
                <MiniStat label="완성 별자리" value={`${u.completed}개`} center />
              </div>
              <OrbitSummary rows={orbitRows} />
            </>
          ) : (
            <>
              <div className="mt-2 flex items-center justify-between rounded-xl border border-line bg-[#0E1424] px-3 py-2.5">
                <span className="text-[12px] font-bold text-cyan">
                  🪐 {selectedPlanet.label} 행성 · 기록 {domainAnal.n || 0}개
                </span>
                <span className="flex items-center gap-2.5">
                  <button onClick={() => setReportSheet(true)} className="tap text-[11px] font-semibold text-cyan">
                    📖 리포트
                  </button>
                  <button onClick={() => { closeDetail(); choosePlanet("all"); }} className="tap text-[11px] text-mut">
                    ← 우주로
                  </button>
                </span>
              </div>
              <p className="mt-1.5 text-[10px] leading-relaxed text-mut">
                행성 둘레의 성단이 이 영역의 별자리예요 — 성단을 누르면 그 시기의 기록이 열려요.
              </p>
            </>
          )}

          {/* 데스크톱 사이드 패널 — 시트 대신 지도 옆에서 상세가 열린다. */}
          {isDesktop && detailOpen && (
            <div
              className="mt-3 rounded-2xl border border-white/10 bg-[#0D1727] p-4"
              style={{ animation: "pm-fade .45s ease .1s both" }}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[12px] font-bold text-cyan">
                  {clusterOpen
                    ? `${selectedPlanet.label} 행성 · ${clusterOpen.label || (clusterOpen.weekStart ? `${clusterOpen.weekStart} 주` : "성단")}`
                    : weekDetailOpen
                      ? `주간 별자리 · ${weekBack === 0 ? "이번 주" : `${weekBack}주 전`}`
                      : `🪐 ${selectedPlanet.label} 행성 리포트`}
                </span>
                <button
                  onClick={closeDetail}
                  className="tap flex h-8 w-8 items-center justify-center rounded-full bg-white/[.07] text-[18px] text-sub"
                  aria-label="상세 닫기"
                >
                  ×
                </button>
              </div>
              {clusterOpen
                ? renderClusterDetail()
                : weekDetailOpen
                  ? renderWeekDetail()
                  : <PlanetDomainReport analysis={domainAnal} planet={selectedPlanet} />}
            </div>
          )}

          <div className="mt-4 flex items-center justify-between border-t border-white/[.07] pt-3">
            <span className="text-[10px] text-mut">시뮬레이션 {u.stats.simulations}회 · 탐험 기록 전체는 보관함에</span>
            <button onClick={() => navigate("/archive")} className="tap text-[11px] font-semibold text-cyan">
              전체 기록 →
            </button>
          </div>
          </div>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="mb-1 text-base font-semibold">🌌 나의 우주</div>
          <p className="py-4 text-center text-[12px] leading-relaxed text-mut">
            일기를 쓰면 그 달의 별이 자라나고, 영역 행성이 하나씩 깨어나요.
            <br />
            1년이면 나만의 우주가 완성됩니다 ✦
          </p>
          <button
            onClick={() => navigate("/home")}
            className="tap w-full rounded-2xl border border-cyan bg-[#12203a] py-2.5 text-[13px] font-semibold text-cyan"
          >
            첫 별 남기러 가기
          </button>
        </Card>
      )}

      {/* 레벨 / XP */}
      <Card className="universe-level !my-3 flex items-center gap-3 !rounded-[20px] !border !border-white/10 !bg-[#101A2A]/75 !p-3.5 shadow-[0_18px_50px_rgba(0,0,0,.24)] backdrop-blur-xl">
        <div className="h-11 w-11 shrink-0 rounded-full bg-gradient-to-br from-cyan to-[#8B5CF6]" />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-bold">
              {u.title} · Lv. {u.level}
            </span>
            <span className="text-[11px] text-mut">
              {u.xpInLevel.toLocaleString()} / {u.xpMax.toLocaleString()} XP
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#1E2740]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan to-[#8B5CF6] transition-all"
              style={{ width: `${u.xpPct}%` }}
            />
          </div>
        </div>
      </Card>

      {/* <Card>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[13px] font-bold text-ink">탐험 보상</div>
            <p className="mt-0.5 text-[10px] text-mut">활동 레벨로 꾸미기 아이템을 열 수 있어요.</p>
          </div>
          <span className="rounded-full bg-cyan/10 px-2.5 py-1 text-[10px] font-semibold text-cyan">
            {ownedRewards.length}개 보유
          </span>
        </div>

        {upcomingReward ? (
          <div className="mt-3 flex items-center gap-3 rounded-xl bg-[#0B1423] px-3 py-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-card2 text-[13px] text-mut">
              Lv.{upcomingReward.level}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] text-mut">다음 보상</div>
              <div className="truncate text-[12px] font-semibold text-ink">{upcomingReward.name}</div>
            </div>
          </div>
        ) : (
          <p className="mt-3 rounded-xl bg-[#0B1423] px-3 py-2.5 text-[11px] text-sub">
            현재 준비된 탐험 보상을 모두 열었어요.
          </p>
        )}

        {ownedRewards.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {ownedRewards.map((reward) => (
              <span key={reward.id} className="rounded-full border border-cyan/25 bg-cyan/10 px-2.5 py-1 text-[10px] text-cyan">
                {reward.name}
              </span>
            ))}
          </div>
        )}
      </Card> */}

      {/* 별자리 만들기 — 이제 '행성 우주 > 전체' 탭으로 흡수(중복 방지 위해 숨김) */}
      <Card className="hidden">
        <div className="mb-1 flex items-center gap-1.5 text-base font-semibold">✦ 별자리 만들기</div>

        {u.stars === 0 ? (
          <EmptyConstellation
            onSeed={() => {
              clearSavedReports(REPORT_UID); // 재시드 전 옛 리포트 제거(stale 방지)
              seedDemoCheckins();
              setReportCache({});
              setWeekBack(0);
              refresh();
            }}
          />
        ) : (
          <>
            <div className="flex items-center justify-between gap-2">
              <span className="inline-block rounded-lg border border-line px-2.5 py-1 text-[11px] text-sub">
                {badgeLabel(constellation)}
              </span>
              {groups.length > 1 && (
                <div className="flex items-center gap-1 text-[11px] text-mut">
                  <PagerBtn
                    disabled={idx <= 0}
                    onClick={() => {
                      setWeekBack((w) => w + 1);
                      setPicked(null);
                    }}
                  >
                    ‹
                  </PagerBtn>
                  <span className="min-w-[52px] text-center">
                    {weekBack === 0 ? "이번 주" : `${weekBack}주 전`}
                  </span>
                  <PagerBtn
                    disabled={weekBack <= 0}
                    onClick={() => {
                      setWeekBack((w) => Math.max(0, w - 1));
                      setPicked(null);
                    }}
                  >
                    ›
                  </PagerBtn>
                </div>
              )}
            </div>

            <div className="mt-3">
              <Constellation
                stars={group.stars}
                todayDate={todayKey()}
                selectedDate={picked?.date}
                onSelect={(s) =>
                  s.future ? null : setPicked((p) => (p?.date === s.date ? null : s))
                }
              />
            </div>

            <p className="mt-1 text-[12px] leading-relaxed text-sub">{constellation.caption}</p>

            {picked && <StarDetail star={picked} />}

            {group.complete ? (
              <>
                <button
                  onClick={() => {
                    const next = !showReport;
                    setShowReport(next);
                    if (next) loadWeekReport();
                  }}
                  className="tap mt-3 w-full rounded-2xl border border-cyan bg-[#12203a] py-2.5 text-[12px] font-bold text-cyan"
                >
                  {showReport
                    ? "리포트 접기 ▴"
                    : `📖 ${weekBack === 1 ? "지난 주" : `${weekBack}주 전`} 리포트 보기 ▾`}
                </button>

                {showReport && (
                  <div className="mt-2 space-y-2">
                    <WeeklyReport group={group} constellation={constellation} />
                    <NarrativeBlock
                      data={reportCache[group.weekStart]}
                      busy={reportBusy}
                      err={reportErr}
                      onRetry={loadWeekReport}
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="mt-3 rounded-2xl border border-dashed border-line bg-[#0E1424] px-3.5 py-3 text-center text-[12px] leading-relaxed text-mut">
                📖 이번 주 별자리가 자라는 중 — 주가 끝나면 리포트와 조언이 만들어져요
                {group.remaining ? ` (${group.remaining}일 남음)` : ""}.
              </div>
            )}

            <div className="mt-3 grid grid-cols-2 gap-2.5">
              <MiniStat
                label={weekBack === 0 ? "이번 주 별" : "그 주의 별"}
                value={`${group.filled} / ${STARS_PER_CONSTELLATION}개`}
              />
              <MiniStat label="연속 기록" value={`${u.streak}일`} />
            </div>

            {weekBack === 0 && !u.checkedInToday && (
              <button
                onClick={() => navigate("/home")}
                className="tap mt-2.5 w-full rounded-2xl border border-cyan bg-[#12203a] py-2.5 text-[13px] font-semibold text-cyan"
              >
                오늘 별이 아직 비어 있어요 — 기록하러 가기
              </button>
            )}

            {u.completed > 0 && (
              <Caption>완성한 별자리 {u.completed}개는 은하수 아카이브에 모여 있어요.</Caption>
            )}
          </>
        )}
      </Card>

      {/* 성단 시트(모바일) — 데스크톱은 지도 옆 사이드 패널로 대신 뜬다. */}
      {!isDesktop && clusterOpen && (
        <div className="fixed inset-0 z-[70] flex animate-backdrop-in items-end justify-center bg-[#02050C]/70 backdrop-blur-[4px]" onClick={() => setClusterOpen(null)}>
          <div className="mb-[68px] flex max-h-[calc(100dvh-88px)] w-full max-w-phone animate-sheet-up flex-col overflow-hidden rounded-t-[34px] border border-white/10 bg-[#0D1727] shadow-[0_-24px_70px_rgba(0,0,0,.55)]" onClick={(e) => e.stopPropagation()}>
            <div className="shrink-0 px-5 pb-3 pt-3">
              <div className="mx-auto mb-3 h-1 w-11 rounded-full bg-white/25" />
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-bold text-cyan">{selectedPlanet.label} 행성 · 성단</div>
                  <h2 className="mt-1 text-[20px] font-bold">
                    {clusterOpen.label || (clusterOpen.weekStart ? `${clusterOpen.weekStart} 주` : `별자리 ${(clusterOpen.index ?? 0) + 1}`)}
                  </h2>
                </div>
                <button type="button" onClick={() => setClusterOpen(null)} className="tap flex h-10 w-10 items-center justify-center rounded-full bg-white/[.07] text-[22px] text-sub" aria-label="성단 상세 닫기">×</button>
              </div>
            </div>
            <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-10">
              {renderClusterDetail()}
            </div>
          </div>
        </div>
      )}

      {/* 행성 리포트 시트(모바일) — 데스크톱은 사이드 패널. */}
      {!isDesktop && reportSheet && !isAll && (
        <div className="fixed inset-0 z-[70] flex animate-backdrop-in items-end justify-center bg-[#02050C]/70 backdrop-blur-[4px]" onClick={() => setReportSheet(false)}>
          <div className="mb-[68px] flex max-h-[calc(100dvh-88px)] w-full max-w-phone animate-sheet-up flex-col overflow-hidden rounded-t-[34px] border border-white/10 bg-[#0D1727] shadow-[0_-24px_70px_rgba(0,0,0,.55)]" onClick={(e) => e.stopPropagation()}>
            <div className="shrink-0 px-5 pb-3 pt-3">
              <div className="mx-auto mb-3 h-1 w-11 rounded-full bg-white/25" />
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-bold text-cyan">나의 우주 · 행성 리포트</div>
                  <h2 className="mt-1 text-[20px] font-bold">🪐 {selectedPlanet.label} 행성</h2>
                </div>
                <button type="button" onClick={() => setReportSheet(false)} className="tap flex h-10 w-10 items-center justify-center rounded-full bg-white/[.07] text-[22px] text-sub" aria-label="행성 리포트 닫기">×</button>
              </div>
            </div>
            <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-10">
              <PlanetDomainReport analysis={domainAnal} planet={selectedPlanet} />
            </div>
          </div>
        </div>
      )}

      {/* 주간 별자리 시트(모바일) — 데스크톱은 사이드 패널. */}
      {!isDesktop && constellationSheetOpen && group && (
        <div className="fixed inset-0 z-[70] flex animate-backdrop-in items-end justify-center bg-[#02050C]/70 backdrop-blur-[4px]" onClick={() => setConstellationSheetOpen(false)}>
          <div className="mb-[68px] flex max-h-[calc(100dvh-88px)] w-full max-w-phone animate-sheet-up flex-col overflow-hidden rounded-t-[34px] border border-white/10 bg-[#0D1727] shadow-[0_-24px_70px_rgba(0,0,0,.55)]" onClick={(event) => event.stopPropagation()}>
            <div className="shrink-0 px-5 pb-3 pt-3">
              <div className="mx-auto mb-3 h-1 w-11 rounded-full bg-white/25" />
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-bold text-cyan">나의 우주 · 주간 별자리</div>
                  <h2 className="mt-1 text-[20px] font-bold">{weekBack === 0 ? "이번 주 기록" : `${weekBack}주 전 기록`}</h2>
                </div>
                <button type="button" onClick={() => setConstellationSheetOpen(false)} className="tap flex h-10 w-10 items-center justify-center rounded-full bg-white/[.07] text-[22px] text-sub" aria-label="별자리 상세 닫기">×</button>
              </div>
            </div>

            <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-10">
              {renderWeekDetail()}
            </div>
          </div>
        </div>
      )}

      {/* 내 평행우주 — 보관함(savedUniverses)의 실제 저장분과 연결. 최근 3개. */}
      <Card>
        <div className="mb-1 flex items-center justify-between">
          <div className="text-base font-semibold">💾 내 평행우주</div>
          {savedUnivs.length > 0 && (
            <button onClick={() => navigate("/archive")} className="tap text-[11px] text-mut">
              전체 {savedUnivs.length}개 ›
            </button>
          )}
        </div>
        <p className="mb-3 text-[11px] text-mut">시뮬레이션을 저장하면 여기 모여요 · 눌러서 다시 보기</p>

        {savedUnivs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line bg-[#0E1424] px-3 py-5 text-center">
            <p className="text-[12px] text-sub">아직 저장한 평행우주가 없어요</p>
            <Caption className="mx-auto max-w-[260px] text-center">
              시뮬레이션을 돌린 뒤 결과를 보관함에 저장하면, 언제든 다시 탐험할 수 있어요.
            </Caption>
          </div>
        ) : (
          <div className="flex gap-2.5">
            {savedUnivs.slice(0, 3).map((su, i) => {
              const grad = SLOT_GRADIENTS[i % SLOT_GRADIENTS.length];
              const chosen = chosenChoice(su);
              return (
                <button
                  key={su.id}
                  onClick={() => {
                    if (su.result) setResult(su.result);
                    navigate("/result");
                  }}
                  className="tap relative min-w-0 flex-1 overflow-hidden rounded-xl p-3 text-left"
                  style={{ background: `linear-gradient(135deg, ${grad[0]}, ${grad[1]})`, outline: "1px solid #28324D" }}
                >
                  {chosen && (
                    <span className="absolute right-1.5 top-1.5 rounded-md bg-black/35 px-1.5 py-0.5 text-[9px] font-bold text-white">
                      → {chosen}
                    </span>
                  )}
                  <div className="truncate text-[12px] font-bold text-white">{su.title}</div>
                  <div className="mt-0.5 text-[9px] text-white/70">{su.savedAt}</div>
                  {su.headline && <div className="mt-1 line-clamp-2 text-[9px] leading-snug text-white/80">{su.headline}</div>}
                </button>
              );
            })}
          </div>
        )}

        <button
          onClick={() => navigate("/archive")}
          className="tap mt-3 w-full rounded-[26px] bg-gradient-to-r from-[#5B6CE0] to-cyan py-3.5 text-sm font-bold text-[#04203a]"
        >
          🪐 보관함에서 관리하기
        </button>
      </Card>

      <p className="mb-2 mt-1 text-center text-[10px] leading-relaxed text-mut">
        레벨·별·XP는 앱 참여 지표이며, 실측 데이터 결과가 아닙니다.
        <br />
        {HONESTY_NOTE}
      </p>
    </div>
  );
}

// 궤도 요약 한 줄 — 균형·흐름. 미탐사 행성은 탐사 유도로 잇는다.
function OrbitSummary({ rows }) {
  const active = rows.filter((r) => r.a.ok);
  if (!active.length) {
    return (
      <p className="mt-2 rounded-xl border border-dashed border-line bg-[#0E1424] px-3 py-2.5 text-[11px] leading-relaxed text-mut">
        아직 탐사된 행성이 없어요. 일기를 쓰면 영역이 자동 분류돼 행성이 자라나요.
      </p>
    );
  }
  const top = [...active].sort((a, b) => b.a.n - a.a.n)[0];
  const rising = active.filter((r) => r.a.trend != null && r.a.trend > 0.1).map((r) => r.label);
  const falling = active.filter((r) => r.a.trend != null && r.a.trend < -0.1).map((r) => r.label);
  const empty = rows.filter((r) => !r.a.ok).map((r) => r.label);
  return (
    <p className="mt-2 rounded-xl border border-line bg-[#0E1424] px-3 py-2.5 text-[11px] leading-relaxed text-sub">
      가장 큰 행성: <b className="text-ink">{top.label}</b>({top.a.n}개).
      {rising.length > 0 && <> 회복세 <b style={{ color: "#5DCAA5" }}>{rising.join("·")}</b>.</>}
      {falling.length > 0 && <> 하강세 <b style={{ color: "#F0736F" }}>{falling.join("·")}</b>.</>}
      {empty.length > 0 && (
        <> <span className="text-mut">{empty.join("·")}</span>은(는) 아직 미탐사 — 행성을 눌러 탐험을 시작해요.</>
      )}
    </p>
  );
}

// 헤더 데모 버튼 — 기록이 없거나 데모일 때만 보인다.
function DemoBtn({ onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="tap rounded-full border border-white/15 bg-white/[.06] px-2.5 py-1.5 text-[10px] font-semibold text-sub transition-colors hover:border-cyan/50 hover:text-cyan"
    >
      {children}
    </button>
  );
}

// 영역(행성)별 리포트 — 그 영역 전체의 연속 흐름 + 요약 + 대표 기록. 로컬.
function PlanetDomainReport({ analysis, planet }) {
  const label = planet?.label || "이 영역";
  const report = domainReport(analysis, label);
  if (!analysis?.ok) {
    return (
      <div className="mt-2 rounded-xl border border-dashed border-line bg-[#0E1424] px-3 py-3 text-[11px] leading-relaxed text-mut">
        {report}
      </div>
    );
  }
  const s = analysis.series;
  const W = 260, H = 40, PAD = 4;
  const xs = (i) => (s.length === 1 ? W / 2 : PAD + (i * (W - 2 * PAD)) / (s.length - 1));
  const ys = (v) => H - PAD - ((v + 1) / 2) * (H - 2 * PAD); // v: -1..1 → 아래..위
  const pts = s.map((p, i) => `${xs(i).toFixed(1)},${ys(p.v).toFixed(1)}`).join(" ");
  const trendCol = analysis.trend == null ? "#67A3FF" : analysis.trend > 0.1 ? "#5DCAA5" : analysis.trend < -0.1 ? "#F0736F" : "#67A3FF";

  return (
    <div className="mt-2 rounded-xl border border-line bg-[#0E1424] px-3.5 py-3">
      <div className="flex items-baseline justify-between">
        <div className="text-[12.5px] font-bold text-ink">🪐 {label} 리포트</div>
        <div className="text-[10px] text-mut">기록 {analysis.n}개 · 평균 {analysis.moodAvg}</div>
      </div>

      {/* 리포트 본문(먼저) */}
      <p className="mt-1.5 text-[12px] leading-relaxed text-sub">{report}</p>

      {analysis.topEmotions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {analysis.topEmotions.map((e) => (
            <span key={e} className="rounded-full border border-line px-2 py-0.5 text-[10px] text-sub">{e}</span>
          ))}
        </div>
      )}

      {/* 대표 기록 — 그 영역에서 가장 좋았던/힘들었던 날의 실제 한 줄 */}
      <div className="mt-2.5 space-y-1.5">
        {analysis.best.text && (
          <div className="rounded-lg bg-[#12203a] px-2.5 py-1.5">
            <div className="text-[9.5px] text-[#5DCAA5]">🌟 가장 좋았던 날 · {analysis.best.date.slice(5)}</div>
            <div className="mt-0.5 text-[11px] leading-relaxed text-sub">“{analysis.best.text}”</div>
          </div>
        )}
        {analysis.worst.text && analysis.worst.date !== analysis.best.date && (
          <div className="rounded-lg bg-[#241a1a] px-2.5 py-1.5">
            <div className="text-[9.5px] text-[#F0A0A0]">🌧 힘들었던 날 · {analysis.worst.date.slice(5)}</div>
            <div className="mt-0.5 text-[11px] leading-relaxed text-sub">“{analysis.worst.text}”</div>
          </div>
        )}
      </div>

      {/* 연속 흐름 그래프(보조) */}
      <div className="mt-2.5 border-t border-line pt-2">
        <div className="mb-1 text-[9.5px] text-mut">기분 흐름 (기록 순서대로 이어짐)</div>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 44 }}>
          <line x1={PAD} y1={H / 2} x2={W - PAD} y2={H / 2} stroke="#28324D" strokeWidth="0.5" strokeDasharray="2 3" />
          {s.length > 1 && <polyline points={pts} fill="none" stroke={trendCol} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />}
          {s.map((p, i) => (
            <circle key={i} cx={xs(i)} cy={ys(p.v)} r="1.6" fill={trendCol} />
          ))}
        </svg>
      </div>

      <p className="mt-2 text-[9px] leading-relaxed text-mut">이 영역 기록의 요약이에요 — 성격진단·예측이 아닙니다.</p>
    </div>
  );
}

function PagerBtn({ children, disabled, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`tap h-6 w-6 rounded-lg border border-line ${
        disabled ? "opacity-25" : "text-sub"
      }`}
    >
      {children}
    </button>
  );
}

function EmptyConstellation({ onSeed }) {
  return (
    <div className="mt-2 rounded-xl border border-dashed border-line bg-[#0E1424] px-3 py-6 text-center">
      <div className="text-[22px] leading-none opacity-40">✦</div>
      <p className="mt-2 text-[13px] text-sub">아직 별이 하나도 없어요</p>
      <Caption className="mx-auto max-w-[260px] text-center">
        홈에서 오늘 하루를 기록하면 첫 별이 떠요. {STARS_PER_CONSTELLATION}일이 모이면 첫 별자리에
        이름이 붙습니다.
      </Caption>
      {onSeed && (
        <>
          <button
            onClick={onSeed}
            className="tap mt-3 rounded-xl border border-line px-3 py-1.5 text-[11px] text-sub"
          >
            ✦ 예시 기록으로 둘러보기
          </button>
          <Caption className="text-center">
            3주치 예시가 채워집니다. 내 기록과 섞이지 않고, 언제든 비울 수 있어요.
          </Caption>
        </>
      )}
    </div>
  );
}

function StarDetail({ star }) {
  const label =
    star.valence == null
      ? "기록이 없는 날이에요"
      : `기분 ${star.mood ?? "—"} · valence ${star.valence}`;
  const answers = Array.isArray(star.answers) ? star.answers : [];
  const hasDiary = star.text || star.note || answers.length > 0;
  return (
    <div className="mt-2 rounded-xl border border-line bg-[#0E1424] px-3 py-2.5">
      <div className="text-[11px] text-mut">{star.date}</div>
      <div className="mt-0.5 text-[12px] text-sub">{label}</div>
      {star.text ? (
        <p className="mt-1.5 text-[12px] leading-relaxed text-ink">{star.text}</p>
      ) : star.note ? (
        <p className="mt-1 text-[12px] text-ink">“{star.note}”</p>
      ) : null}
      {/* 분화한 별 — 같은 날의 이전 기록들 */}
      {Array.isArray(star.priorTexts) && star.priorTexts.length > 0 && (
        <div className="mt-2 space-y-1 border-t border-line pt-2">
          <div className="text-[10px] text-mut">✧ 이 별은 분화했어요 — 같은 날의 다른 기록</div>
          {star.priorTexts.map((t, i) => (
            <p key={i} className="text-[11px] leading-relaxed text-sub">“{t}”</p>
          ))}
        </div>
      )}
      {answers.length > 0 && (
        <div className="mt-2 space-y-1.5 border-t border-line pt-2">
          {answers.map((qa, i) => (
            <div key={i}>
              <div className="text-[10px] text-mut">{qa.q}</div>
              <div className="text-[12px] leading-relaxed text-sub">{qa.a}</div>
            </div>
          ))}
        </div>
      )}
      {!hasDiary && star.valence != null ? (
        <p className="mt-1 text-[11px] text-mut">이 날은 기분만 남기고 일기는 쓰지 않았어요.</p>
      ) : null}
    </div>
  );
}

// 체크인 answers([{q,a}]) → 성향 API 형식 {qid: a}. qid 못 찾으면 순번 키.
function answersToMap(answers) {
  if (!Array.isArray(answers)) return {};
  const map = {};
  answers.forEach((qa, i) => {
    if (!qa?.a) return;
    map[qidByText(qa.q) || `Q${i + 1}`] = qa.a;
  });
  return map;
}

// 서사(돌아보기) + 내일 할 거리. 성향 수치는 내부 재료라 노출하지 않는다.
function NarrativeBlock({ data, busy, err, onRetry }) {
  if (busy)
    return (
      <div className="rounded-xl border border-line bg-[#0E1424] px-3.5 py-3 text-[12px] text-mut">
        리포트를 만들고 있어요… 이번 주 기록을 읽는 중
      </div>
    );
  if (err)
    return (
      <div className="rounded-xl border border-line bg-[#0E1424] px-3.5 py-3 text-[11px] leading-relaxed text-[#F0736F]">
        리포트 서버에 연결하지 못했어요 — 로컬 API(<code>uvicorn qmode.api:app --port 8000</code>)가
        켜져 있나요?{" "}
        <button onClick={onRetry} className="tap underline">
          다시 시도
        </button>
      </div>
    );
  if (!data)
    return (
      <div className="rounded-xl border border-line bg-[#0E1424] px-3.5 py-3">
        <button onClick={onRetry} className="tap text-[12px] text-[#C4B5FD]">
          돌아보기 & 조언 불러오기 →
        </button>
      </div>
    );

  const actions = Array.isArray(data.actions) ? data.actions : [];
  return (
    <div className="rounded-xl border border-[#8B5CF6]/40 bg-[#0E1424] px-3.5 py-3">
      <div className="text-[12px] font-bold text-[#C4B5FD]">🌙 돌아보기 & 조언</div>

      {data.report && (
        <div className="mt-1.5 whitespace-pre-line text-[12px] leading-relaxed text-sub">
          {data.report}
        </div>
      )}

      {actions.length > 0 && (
        <div className="mt-3 border-t border-line pt-2.5">
          <div className="mb-1.5 text-[11px] font-bold text-cyan">🌱 내일 해보면 좋은 것</div>
          <ul className="space-y-1.5">
            {actions.slice(0, 3).map((act, i) => (
              <li key={i} className="flex gap-1.5 text-[12px] leading-relaxed text-ink">
                <span className="text-cyan">·</span>
                <span>{act}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-3 border-t border-line pt-2 text-[10px] leading-relaxed text-mut">
        기록을 바탕으로 한 조언이며, 정답이 아니라 이번 주에 해볼 만한 하나의 방향입니다.
      </p>
    </div>
  );
}

function WeeklyReport({ group, constellation }) {
  const stars = (group?.stars || []).filter((s) => !s.empty && s.valence != null);
  if (!stars.length)
    return (
      <div className="mt-2 rounded-xl border border-line bg-[#0E1424] px-3.5 py-3 text-[12px] text-mut">
        이 주는 아직 기록이 없어 리포트를 만들 수 없어요.
      </div>
    );

  const mv = (s) => s.mood ?? Math.round(s.valence * 2 + 3);
  const avg = stars.reduce((a, s) => a + mv(s), 0) / stars.length;
  const best = stars.reduce((a, b) => (mv(b) >= mv(a) ? b : a));
  const worst = stars.reduce((a, b) => (mv(b) <= mv(a) ? b : a));
  const diaries = stars.filter((s) => s.text || (Array.isArray(s.answers) && s.answers.length));

  return (
    <div className="mt-2 rounded-xl border border-line bg-[#0E1424] px-3.5 py-3">
      <div className="flex items-baseline justify-between">
        <div className="text-[12px] font-bold text-cyan">🔮 {constellation?.name || "이번 주"}</div>
        <div className="text-[10px] text-mut">
          {group.filled} / {group.stars.length}일 기록
        </div>
      </div>
      {constellation?.caption && (
        <p className="mt-1 text-[12px] leading-relaxed text-sub">{constellation.caption}</p>
      )}

      <div className="mt-2.5 grid grid-cols-3 gap-2 border-t border-line pt-2.5">
        <ReportStat label="기분 평균" value={avg.toFixed(1)} />
        <ReportStat label="가장 좋았던 날" value={`${best.date.slice(5)} · ${mv(best)}`} />
        <ReportStat label="가장 힘든 날" value={`${worst.date.slice(5)} · ${mv(worst)}`} />
      </div>

      {diaries.length > 0 && (
        <div className="mt-3 border-t border-line pt-2.5">
          <div className="mb-1.5 text-[10px] text-mut">이 주의 일기</div>
          <div className="space-y-2">
            {diaries.slice(0, 3).map((s) => (
              <div key={s.date}>
                <div className="text-[10px] text-mut">{s.date.slice(5)}</div>
                <div className="text-[12px] leading-relaxed text-sub">
                  {s.text || (s.answers?.[0]?.a ?? "")}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="mt-3 border-t border-line pt-2 text-[10px] leading-relaxed text-mut">
        {HONESTY_NOTE}
      </p>
    </div>
  );
}

function ReportStat({ label, value }) {
  return (
    <div className="rounded-lg bg-[#131B2E] px-2 py-2 text-center">
      <div className="text-[9px] text-mut">{label}</div>
      <div className="mt-0.5 text-[12px] font-bold text-ink">{value}</div>
    </div>
  );
}

function MiniStat({ label, value, center = false }) {
  return (
    <div
      className={`rounded-xl border border-line bg-[#0E1424] px-2 py-3 ${
        center ? "text-center" : ""
      }`}
    >
      <div className="text-[10px] text-mut">{label}</div>
      <div className="mt-0.5 text-lg font-bold text-ink">{value}</div>
    </div>
  );
}
