import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Caption } from "../components/ui.jsx";
import Constellation from "../components/Constellation.jsx";
import PlanetGlobe from "../components/PlanetGlobe.jsx";
import { useResult } from "../data/ResultContext.jsx";
import { PLANETS } from "../data/result.js";
import { listUniverses } from "../data/savedUniverses.js";
import { chosenChoice } from "../data/actionBridge.js";
import { domainAnalysis, domainReport, analyzeStars } from "../data/diarySignals.js";
import { seedDemoYear } from "../data/demoYear.js";
import {
  universeSummary,
  constellationGroups,
  groupsByPlanet,
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

// 저장 카드 배경 그라디언트(순번용) — 데이터가 아니라 표시용 색.
const SLOT_GRADIENTS = [
  ["#3a2a6d", "#6d4aa0"],
  ["#12324d", "#1f6fa0"],
  ["#4d1230", "#a01f5a"],
];

// '전체' 선택 — 특정 영역이 아니라 전체 일기 기반 종합(별자리 만들기 성격).
const ALL_PLANET = { key: "all", label: "전체", from: "#5A6B8C", to: "#AEB9D0" };

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
  const [reportCache, setReportCache] = useState({}); // weekKey → { report, actions }
  const [reportBusy, setReportBusy] = useState(false);
  const [reportErr, setReportErr] = useState(null);

  const planet = u.state.planet;
  const isAll = planet === "all"; // '전체' = 특정 영역 아닌 전체 일기 기반(별자리 만들기)
  const selectedPlanet = PLANETS.find((p) => p.key === planet) || PLANETS[0];
  const viewPlanet = isAll ? ALL_PLANET : selectedPlanet;
  // 영역별(또는 전체) 분석 — 전체면 모든 일기 기반, 도메인이면 그 영역만.
  const domainAnal = useMemo(() => domainAnalysis(isAll ? "all" : planet, u.state), [isAll, planet, u.state]);
  // 별자리 브라우저는 적응형(기록 수 맞춰 묶음) — 전체 52개 문제·희박영역 텅빔 문제 해결.
  const domainGroups = useMemo(() => adaptiveGroups(isAll ? null : planet, u.state), [isAll, planet, u.state]);
  const planetCounts = useMemo(
    () => Object.fromEntries(PLANETS.map((p) => [p.key, domainAnalysis(p.key, u.state).n || 0])),
    [u.state],
  );

  const groups = useMemo(() => constellationGroups(u.state), [u.state]);
  const idx = Math.max(0, groups.length - 1 - weekBack);
  const group = groups[idx] || null;

  const constellation = useMemo(
    () => (group ? classifyConstellation(group, profile?.value_ranking) : null),
    [group, profile?.value_ranking],
  );

  function choosePlanet(key) {
    persistPlanet(key);
    refresh();
  }

  function toggleDemoRecords() {
    clearSavedReports(REPORT_UID);
    setReportCache({});
    setWeekBack(0);
    setPicked(null);
    setShowReport(false);
    setConstellationSheetOpen(false);

    if (isDemo(u.state)) resetUniverse();
    else if (u.stars === 0) seedDemoCheckins();

    refresh();
  }

  function openPlanetConstellation(selectedGroup) {
    const targetIndex = groups.findIndex((item) => item.weekStart === selectedGroup?.weekStart);
    if (targetIndex >= 0) setWeekBack(Math.max(0, groups.length - 1 - targetIndex));
    setPicked(null);
    setShowReport(false);
    setConstellationSheetOpen(true);
  }

  // 완성된 주의 리포트를 가져온다.
  //  1) DB 저장본 먼저 조회(즉시) → 있으면 그대로 사용
  //  2) 없으면 그 주 기록으로 1회 생성·저장(느림, LLM) → 이후엔 저장본이 남음
  async function loadWeekReport() {
    if (!group || !group.complete) return;
    const wk = group.weekStart;
    if (reportCache[wk]) return; // 이미 불러옴

    // 데모(예시 6주) → 미리 생성해 둔 고정 리포트 사용. API 호출 안 함.
    // 1년 데모(demoKind="year")는 주차가 52개라 6주용 고정본과 내용이 안 맞는다 → 실제 생성.
    if (isDemo(u.state) && u.state.demoKind !== "year") {
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
          <button
            type="button"
            onClick={toggleDemoRecords}
            className="tap mt-0.5 shrink-0 rounded-full border border-white/15 bg-white/[.06] px-2.5 py-1.5 text-[10px] font-semibold text-sub transition-colors hover:border-cyan/50 hover:text-cyan"
          >
            {isDemo(u.state) ? "데모 비우기" : "6주 데모 보기"}
          </button>
        )}
      </div>

      {isDemo(u.state) && (
        <div className="mb-3 flex items-center gap-1.5 rounded-xl border border-cyan/20 bg-cyan/[.07] px-3 py-2 text-[10px] text-cyan">
          <span aria-hidden="true">✦</span>
          6주 예시 기록을 보고 있어요. 실제 사용자 기록에는 포함되지 않습니다.
        </div>
      )}

      {/* 데모 확인용 — 예시 데이터로 즉시 채우기(옛 리포트도 함께 정리). */}
      <div className="mb-3 grid grid-cols-2 gap-2">
        <button
          onClick={() => {
            clearSavedReports(REPORT_UID);
            resetUniverse();
            seedDemoCheckins();
            setReportCache({});
            setPicked(null);
            setWeekBack(0);
            refresh();
          }}
          className="tap rounded-2xl border border-dashed border-gold/50 bg-[#241d10] py-2.5 text-[12px] font-bold text-gold"
        >
          🧪 예시 6주
        </button>
        <button
          onClick={() => {
            clearSavedReports(REPORT_UID);
            seedDemoYear();
            setReportCache({});
            setPicked(null);
            setWeekBack(0);
            refresh();
          }}
          className="tap rounded-2xl border border-dashed border-cyan/50 bg-[#12203a] py-2.5 text-[12px] font-bold text-cyan"
        >
          🧪 예시 1년치 (개인화 데모)
        </button>
      </div>

      {/* 예시 기록이 들어있는 동안은 항상 밝힌다 — 남의 기록을 내 기록처럼 보여주지 않는다. */}
      {isDemo(u.state) && (
        <div className="flex items-center justify-between rounded-xl border border-gold/40 bg-[#241d10] px-3 py-2">
          <span className="text-[11px] text-gold">
            예시 데이터로 둘러보는 중 — 내 기록이 아닙니다
          </span>
          <button
            onClick={() => {
              resetUniverse();
              clearSavedReports(REPORT_UID); // 저장된 주간 리포트도 함께 비움
              setReportCache({});
              setWeekBack(0);
              setPicked(null);
              refresh();
            }}
            className="tap shrink-0 rounded-lg border border-line px-2 py-1 text-[10px] text-sub"
          >
            비우기
          </button>
        </div>
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

      {/* 전체 리포트 — 5개 영역을 한눈에(균형·흐름). 세부는 아래 행성 우주에서. */}
      <AllDomainsReport state={u.state} onPick={choosePlanet} planet={planet} />

      {/* 행성 우주 — 도메인별 지구본(옛 행성 선택 대체). 칩이 곧 행성 선택. */}
      <Card>
        <div className="mb-1 text-base font-semibold">🪐 행성 우주</div>
        <p className="mb-2 text-[11px] text-mut">행성은 당신의 삶의 영역입니다 · 눌러서 그 영역을 봐요</p>
        <div className="mb-1 flex flex-wrap gap-1.5">
          {/* 전체 = 전체 일기 기반 종합(별자리 만들기) */}
          <button
            onClick={() => choosePlanet("all")}
            className={`tap flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] ${
              isAll ? "border-cyan text-cyan" : "border-line text-sub"
            }`}
          >
            전체
            {u.stars > 0 && <span className="rounded-full bg-cyan/15 px-1 text-[9px] text-cyan">{u.stars}</span>}
          </button>
          {PLANETS.map((p) => {
            const n = planetCounts[p.key] || 0;
            return (
              <button
                key={p.key}
                onClick={() => choosePlanet(p.key)}
                className={`tap flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] ${
                  planet === p.key ? "border-cyan text-cyan" : n > 0 ? "border-line text-sub" : "border-line text-mut opacity-60"
                }`}
              >
                {p.label}
                {n > 0 && <span className="rounded-full bg-cyan/15 px-1 text-[9px] text-cyan">{n}</span>}
              </button>
            );
          })}
        </div>
        <PlanetGlobe
          planet={viewPlanet}
          groups={groupsByPlanet(isAll ? null : planet)}
          scenarios={(isAll ? (u.state.scenarios || []) : scenariosByPlanet(planet)).map((s) => ({
            date: s.date,
            title: s.title,
            dateLabel: s.date,
            br: s.br,
          }))}
          onOpen={() => navigate("/input")}
          onConstellationOpen={openPlanetConstellation}
        />
        <p className="mt-2 rounded-xl border border-line bg-[#0E1424] px-3 py-2.5 text-[12px] text-sub">
          {isAll
            ? "전체 일기를 기반으로 한 종합 흐름·별자리예요. 특정 영역은 위에서 골라 자세히 볼 수 있어요."
            : <>선택된 행성: <span className="font-bold text-ink">{viewPlanet.label}</span> — 일기를 저장하면 이 영역으로 자동 분류돼 별로 쌓이고, 갈림길을 시뮬레이션합니다.</>}
        </p>

        {/* 리포트 — 전체(별자리 만들기) 또는 그 영역의 연속 흐름 + 요약. 로컬, API 0. */}
        <PlanetDomainReport analysis={domainAnal} planet={viewPlanet} />
        {/* 별자리들 — 유형(순항/기복형…) + 별 하나 클릭해 그 날 기록 보기. */}
        <PlanetConstellations key={planet} groups={domainGroups} valueRanking={profile?.value_ranking} />

        <div className="mt-4 border-t border-white/[.07] pt-4">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <div className="text-[12px] font-semibold text-ink">나의 우주 기록</div>
              <p className="mt-0.5 text-[10px] text-mut">지금까지 발견한 별과 탐험 기록이에요.</p>
            </div>
            <button onClick={() => navigate("/archive")} className="tap text-[11px] font-semibold text-cyan">
              전체 기록 →
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <MiniStat label="시뮬레이션" value={u.stats.simulations} center />
            <MiniStat label="수집한 별" value={u.stats.stars} center />
            <MiniStat label="완성한 별자리" value={u.completed} center />
          </div>
        </div>
      </Card>

      {constellationSheetOpen && group && (
        <div className="fixed inset-0 z-[70] flex animate-backdrop-in items-end justify-center bg-[#02050C]/70 backdrop-blur-[4px]" onClick={() => setConstellationSheetOpen(false)}>
          <div className="mb-[68px] flex max-h-[calc(100dvh-88px)] w-full max-w-phone animate-sheet-up flex-col overflow-hidden rounded-t-[34px] border border-white/10 bg-[#0D1727] shadow-[0_-24px_70px_rgba(0,0,0,.55)]" onClick={(event) => event.stopPropagation()}>
            <div className="shrink-0 px-5 pb-3 pt-3">
              <div className="mx-auto mb-3 h-1 w-11 rounded-full bg-white/25" />
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-bold text-cyan">{selectedPlanet.label} 행성의 별자리</div>
                  <h2 className="mt-1 text-[20px] font-bold">{weekBack === 0 ? "이번 주 기록" : `${weekBack}주 전 기록`}</h2>
                </div>
                <button type="button" onClick={() => setConstellationSheetOpen(false)} className="tap flex h-10 w-10 items-center justify-center rounded-full bg-white/[.07] text-[22px] text-sub" aria-label="별자리 상세 닫기">×</button>
              </div>
              {groups.length > 1 && (
                <div className="mt-3 flex items-center justify-between rounded-full border border-white/10 bg-black/10 px-2 py-1.5">
                  <PagerBtn disabled={idx <= 0} onClick={() => { setWeekBack((value) => value + 1); setPicked(null); setShowReport(false); }}>‹</PagerBtn>
                  <span className="text-[11px] text-sub">{group.weekStart} · {group.filled}/{STARS_PER_CONSTELLATION}일 기록</span>
                  <PagerBtn disabled={weekBack <= 0} onClick={() => { setWeekBack((value) => Math.max(0, value - 1)); setPicked(null); setShowReport(false); }}>›</PagerBtn>
                </div>
              )}
            </div>

            <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-10">
              <div className="rounded-[24px] border border-white/10 bg-[#091321] p-3">
                <Constellation size={292} stars={group.stars} todayDate={todayKey()} selectedDate={picked?.date} onSelect={(star) => star.future ? null : setPicked((current) => current?.date === star.date ? null : star)} />
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

// 그 영역의 별자리들 — 7별 청크마다 유형(순항/기복형…) 배지 + 별 클릭 시 그 날 리포트.
function PlanetConstellations({ groups, valueRanking }) {
  const filled = (groups || []).filter((g) => g.filled > 0);
  const [idx, setIdx] = useState(Math.max(0, filled.length - 1));
  const [picked, setPicked] = useState(null);
  if (!filled.length) return null;

  const i = Math.min(idx, filled.length - 1);
  const group = filled[i];
  const c = classifyConstellation(group, valueRanking);
  const a = analyzeStars(group.stars); // 이 묶음(별자리)의 리포트
  const trendTxt = a.trend == null ? "" : a.trend > 0.1 ? " 뒤로 갈수록 나아졌어요." : a.trend < -0.1 ? " 뒤로 갈수록 가라앉았어요." : " 큰 기복은 없었어요.";

  return (
    <div className="mt-2 rounded-xl border border-line bg-[#0E1424] px-3.5 py-3">
      <div className="flex items-center justify-between">
        <span className="inline-block rounded-lg border border-line px-2.5 py-1 text-[11px] text-sub">
          {badgeLabel(c)}
        </span>
        {filled.length > 1 && (
          <div className="flex items-center gap-1 text-[11px] text-mut">
            <PagerBtn disabled={i <= 0} onClick={() => { setIdx(i - 1); setPicked(null); }}>‹</PagerBtn>
            <span className="min-w-[92px] text-center">{group.label || `별자리 ${i + 1}`}</span>
            <PagerBtn disabled={i >= filled.length - 1} onClick={() => { setIdx(i + 1); setPicked(null); }}>›</PagerBtn>
          </div>
        )}
      </div>

      <div className="mt-2">
        <Constellation
          stars={group.stars}
          todayDate={todayKey()}
          selectedDate={picked?.date}
          onSelect={(s) => (s.empty ? null : setPicked((p) => (p?.date === s.date ? null : s)))}
        />
      </div>

      {/* 이 별자리(묶음) 리포트 */}
      {a.ok && (
        <p className="mt-1.5 text-[11.5px] leading-relaxed text-sub">
          이 별자리는 기록 {a.n}개 · 기분 평균 {a.moodAvg}.{trendTxt}
          {a.topEmotions.length > 0 && ` 자주 남긴 감정: ${a.topEmotions.join("·")}.`}
        </p>
      )}
      {picked ? (
        <StarDetail star={picked} />
      ) : (
        <p className="mt-1.5 text-[10px] text-mut">별을 누르면 그 날의 기록이 열려요.</p>
      )}
    </div>
  );
}

// 🌌 전체 리포트 — 5개 영역을 한눈에(균형·흐름). 세부는 행성 우주에서. 로컬, API 0.
function AllDomainsReport({ state, onPick, planet }) {
  const rows = PLANETS.map((p) => ({ ...p, a: domainAnalysis(p.key, state) }));
  const active = rows.filter((r) => r.a.ok);
  if (!active.length) return null;

  const totalN = active.reduce((s, r) => s + r.a.n, 0);
  const maxN = Math.max(...active.map((r) => r.a.n));
  const top = [...active].sort((a, b) => b.a.n - a.a.n)[0];
  const rising = active.filter((r) => r.a.trend != null && r.a.trend > 0.1).map((r) => r.label);
  const falling = active.filter((r) => r.a.trend != null && r.a.trend < -0.1).map((r) => r.label);
  const empty = rows.filter((r) => !r.a.ok).map((r) => r.label);
  const trendCol = (t) => (t == null ? "#67A3FF" : t > 0.1 ? "#5DCAA5" : t < -0.1 ? "#F0736F" : "#8895AF");
  const trendTxt = (t) => (t == null ? "—" : t > 0.1 ? "↗" : t < -0.1 ? "↘" : "→");

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div className="text-base font-semibold">🌌 전체 리포트</div>
        <span className="text-[10px] text-mut">최근 기록 {totalN}개 · {active.length}개 영역</span>
      </div>
      <p className="mt-1 text-[11px] leading-relaxed text-sub">
        가장 많이 기록한 영역: <b className="text-ink">{top.label}</b>.
        {rising.length > 0 && <> 회복세: <b style={{ color: "#5DCAA5" }}>{rising.join("·")}</b>.</>}
        {falling.length > 0 && <> 하강세: <b style={{ color: "#F0736F" }}>{falling.join("·")}</b>.</>}
        {empty.length > 0 && <> <span className="text-mut">{empty.join("·")}</span>은(는) 기록이 적어 균형을 살펴봐요.</>}
      </p>

      <div className="mt-3 space-y-1.5">
        {rows.map((r) => (
          <button
            key={r.key}
            onClick={() => onPick?.(r.key)}
            className={`tap flex w-full items-center gap-2 rounded-lg px-1.5 py-1 text-left ${planet === r.key ? "bg-white/[.05]" : ""}`}
          >
            <span className="w-[52px] shrink-0 text-[11px] text-sub">{r.label}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#223047]">
              <div className="h-full rounded-full" style={{ width: `${maxN ? Math.round(((r.a.n || 0) / maxN) * 100) : 0}%`, background: `linear-gradient(90deg, ${r.from}, ${r.to})` }} />
            </div>
            <span className="w-[26px] shrink-0 text-right text-[10px] tabular-nums text-mut">{r.a.n || 0}</span>
            <span className="w-[16px] shrink-0 text-center text-[11px]" style={{ color: trendCol(r.a.ok ? r.a.trend : null) }}>
              {r.a.ok ? trendTxt(r.a.trend) : "·"}
            </span>
          </button>
        ))}
      </div>
      <p className="mt-2 text-[9px] leading-relaxed text-mut">막대=기록량, 화살표=기분 흐름. 영역을 누르면 세부 분석으로 이동해요.</p>
    </Card>
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
