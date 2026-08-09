import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Caption } from "../components/ui.jsx";
import Constellation from "../components/Constellation.jsx";
import PlanetGlobe from "../components/PlanetGlobe.jsx";
import { useResult } from "../data/ResultContext.jsx";
import { PLANETS } from "../data/result.js";
import { listUniverses } from "../data/savedUniverses.js";
import { chosenChoice } from "../data/actionBridge.js";
import { domainAnalysis, domainReport } from "../data/diarySignals.js";
import { seedDemoYear } from "../data/demoYear.js";
import {
  universeSummary,
  constellationGroups,
  groupsByPlanet,
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
  const [reportCache, setReportCache] = useState({}); // weekKey → { report, actions }
  const [reportBusy, setReportBusy] = useState(false);
  const [reportErr, setReportErr] = useState(null);

  const planet = u.state.planet;
  const selectedPlanet = PLANETS.find((p) => p.key === planet) || PLANETS[0];
  // 영역(행성)별 분석 — 그 영역 전체를 하나의 연속 흐름으로. (달로 쪼개지 않음)
  const domainAnal = useMemo(() => domainAnalysis(planet, u.state), [planet, u.state]);
  // 그 영역의 별자리들(7별 청크) — 유형 분류 + 별 클릭 리포트용.
  const domainGroups = useMemo(() => groupsByPlanet(planet, u.state), [planet, u.state]);
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
    <div>
      <h1 className="mb-1 mt-2 text-[24px] font-bold leading-[1.2]">나의 우주</h1>
      <p className="mb-3 text-[13px] text-sub">
        하루에 별 하나. {STARS_PER_CONSTELLATION}개가 모이면 별자리가 됩니다.
      </p>

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
      <Card className="flex items-center gap-3">
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

      <Card>
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
      </Card>

      {/* 별자리 만들기 */}
      <Card>
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

      {/* 행성 우주 — 도메인별 지구본(옛 행성 선택 대체). 칩이 곧 행성 선택. */}
      <Card>
        <div className="mb-1 text-base font-semibold">🪐 행성 우주</div>
        <p className="mb-2 text-[11px] text-mut">행성은 당신의 삶의 영역입니다 · 눌러서 그 영역을 봐요</p>
        <div className="mb-1 flex flex-wrap gap-1.5">
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
          planet={selectedPlanet}
          groups={groupsByPlanet(planet)}
          scenarios={scenariosByPlanet(planet).map((s) => ({
            date: s.date,
            title: s.title,
            dateLabel: s.date,
            br: s.br,
          }))}
          onOpen={() => navigate("/input")}
        />

        {/* 영역별 리포트 — 그 영역 전체의 연속 흐름 + 요약. 로컬, API 0. */}
        <PlanetDomainReport analysis={domainAnal} planet={selectedPlanet} />

        {/* 그 영역의 별자리들 — 유형(순항/기복형…) + 별 하나하나 클릭해 그 날 기록 보기. */}
        <PlanetConstellations key={planet} groups={domainGroups} valueRanking={profile?.value_ranking} />
      </Card>

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

      {/* 은하수 아카이브 통계 */}
      <Card>
        <div className="mb-3 flex items-center gap-1.5 text-base font-semibold">🌌 은하수 아카이브</div>
        <div className="grid grid-cols-3 gap-2.5">
          <MiniStat label="시뮬레이션" value={u.stats.simulations} center />
          <MiniStat label="수집한 별" value={u.stats.stars} center />
          <MiniStat label="탐험한 우주" value={u.stats.universes} center />
        </div>
        <button
          onClick={() => navigate("/archive")}
          className="tap mt-3 w-full rounded-2xl border border-line bg-[#0E1424] py-3 text-[13px] text-sub"
        >
          기록 아카이브 보기 →
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

  return (
    <div className="mt-2 rounded-xl border border-line bg-[#0E1424] px-3.5 py-3">
      <div className="flex items-center justify-between">
        <span className="inline-block rounded-lg border border-line px-2.5 py-1 text-[11px] text-sub">
          {badgeLabel(c)}
        </span>
        {filled.length > 1 && (
          <div className="flex items-center gap-1 text-[11px] text-mut">
            <PagerBtn disabled={i <= 0} onClick={() => { setIdx(i - 1); setPicked(null); }}>‹</PagerBtn>
            <span className="min-w-[64px] text-center">별자리 {i + 1} / {filled.length}</span>
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

      <p className="mt-1 text-[11.5px] leading-relaxed text-sub">{c.caption}</p>
      {picked ? (
        <StarDetail star={picked} />
      ) : (
        <p className="mt-1.5 text-[10px] text-mut">별을 누르면 그 날의 기록이 열려요.</p>
      )}
    </div>
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
