import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Archive, CalendarDays, ChevronRight, Plus, X } from "lucide-react";
import UniverseMap from "../components/UniverseMap.jsx";
import Constellation from "../components/Constellation.jsx";
import { PLANETS } from "../data/result.js";
import { adaptiveGroups, hasRecord, loadUniverse, resetUniverse, scenariosByPlanet, seedDemoCheckins, starGroupsOf, todayKey } from "../data/myUniverse.js";
import { seedDemoEunwoo, seedDemoYear } from "../data/demoYear.js";
import { domainAnalysis, domainMonths, domainReport } from "../data/diarySignals.js";
import { futureMaterials, getCachedFuture, writeFuture, getCachedOpportunities, scanOpportunities } from "../data/futureApi.js";
import { expeditionsFor, startExpedition } from "../data/expeditions.js";
import { shapeOf, MIN_RECORDS_TO_NAME, HONESTY_NOTE } from "../data/constellationRules.js";
import { topAxes } from "../data/valueCards.js";
import { useResult } from "../data/ResultContext.jsx";
import { clearSavedReports, REPORT_UID, loadSpeech } from "../data/dispositionApi.js";
import { planetSkin } from "../data/planetShop.js";

const DESCRIPTIONS = {
  career: "나의 진로와 커리어에 대한 고민, 선택, 방향성을 기록해요.",
  growth: "배움과 성취, 새로운 가능성을 향한 과정을 기록해요.",
  life: "일상에서 느낀 평온과 만족, 삶의 균형을 기록해요.",
  relation: "가족과 친구, 동료와 나눈 관계의 순간을 기록해요.",
  health: "몸과 마음의 변화, 회복과 돌봄의 기록을 모아요.",
};
const KEYWORDS = {
  career: ["진로 고민", "진로 탐색", "목표 설정", "취업 준비", "방향성"],
  growth: ["배움", "자기 확신", "도전", "성취"], life: ["일상", "평온", "균형", "만족"],
  relation: ["가족", "친구", "동료", "소통"], health: ["회복", "수면", "운동", "마음 건강"],
};

// 그 행성의 기록 — 별·분석과 같은 규칙(hasRecord + 저장된 domains)을 쓴다.
// 전에는 domains 가 없으면 career 로 밀어넣고 기분만 찍은 날도 셌다. 그래서
// '최근 기록'에 "(체크인만 남긴 날)"이 뜨고 개수도 별과 어긋났다.
function planetEntries(state, key) {
  return (state.checkins || []).filter(
    (entry) => hasRecord(entry) && Array.isArray(entry.domains) && entry.domains.includes(key),
  );
}
function dateLabel(date) { const [, month, day] = String(date).split("-"); return `${Number(month)}.${Number(day)}`; }

export default function MyUniverseV2() {
  const navigate = useNavigate();
  const { profile, setChoices, setScenarioTexts, setScenarioDomains } = useResult();
  const [state, setState] = useState(loadUniverse);
  const [planet, setPlanet] = useState(null);
  // 3D 에서 별자리를 누르면 그 별자리 하나를 펼쳐 본다(모양·상태·그 안의 기록).
  const [cluster, setCluster] = useState(null);
  const [skin,setSkin]=useState(planetSkin);
  useEffect(() => { const refresh = () => setState(loadUniverse()); window.addEventListener("pm:universe", refresh); return () => window.removeEventListener("pm:universe", refresh); }, []);
  useEffect(()=>{const refresh=()=>setSkin(planetSkin());window.addEventListener("pm:planet-shop",refresh);return()=>window.removeEventListener("pm:planet-shop",refresh);},[]);

  // 기회 카드를 누르면 그 갈림길이 채워진 채로 시뮬레이션이 열린다 —
  // 다시 타이핑하게 하면 '길을 내밀었다'는 의미가 없다. 영역도 그 행성으로 넘겨
  // 결과 시나리오가 원래 행성에 다시 쌓이게 한다.
  function pickOpportunity(item) {
    if (!planet) return;
    setChoices({ a: item.choiceA, b: item.choiceB });
    setScenarioTexts({ a: item.why || "", b: "" });
    setScenarioDomains({ a: [planet.key], b: [planet.key] });
    setPlanet(null);
    navigate("/input");
  }

  const allGroups = useMemo(() => adaptiveGroups(null, state), [state]);
  const selectedGroups = useMemo(() => planet ? adaptiveGroups(planet.key, state) : allGroups, [planet, state, allGroups]);

  // 행성 둘레를 도는 별자리 = 그 영역의 일기. 전에는 시나리오 표식(현재/3개월/1년/3년
  // 고정 4개)이 돌고 있어서, 기록이 20개여도 별은 4개만 보였다.
  // "당신의 기록이 별이 되고, 별들이 연결되어 우주가 됩니다" 가 이 화면의 약속이다.
  const orbitGroups = useMemo(() => {
    if (planet) return starGroupsOf(planet.key, state);
    return PLANETS.flatMap((item) => starGroupsOf(item.key, state));
  }, [planet, state]);
  const planetScenarios = useMemo(
    () => (planet ? scenariosByPlanet(planet.key, state) : []), [planet, state]);

  function openPlanet(key) { setPlanet(PLANETS.find((item) => item.key === key)); setCluster(null); }
  function runDemo(kind) {
    clearSavedReports(REPORT_UID);
    setPlanet(null); setCluster(null);
    if (kind === "clear") resetUniverse();
    else if (kind === "6w") { resetUniverse(); seedDemoCheckins(); }
    else if (kind === "1y") seedDemoYear();
    else if (kind === "eunwoo") seedDemoEunwoo();
    setState(loadUniverse());
  }

  return (
    <div className="relative h-full min-h-[620px] overflow-hidden rounded-[26px] border border-white/10 bg-[#030712]">
      <div className="pointer-events-none absolute left-8 top-6 z-20">
        <h1 className="text-[25px] font-bold tracking-[-.03em]">나의 우주</h1>
        <p className="mt-1 text-[11px] text-sub">당신의 기록이 별이 되고, 별들이 연결되어 우주가 됩니다.</p>
      </div>
      <div className="absolute right-6 top-5 z-30 flex flex-wrap justify-end gap-1.5">
        {[['6w','6주'],['1y','1년'],['eunwoo','은우'],['clear','비우기']].map(([key,label])=><button key={key} type="button" onClick={()=>runDemo(key)} className="tap rounded-full border border-white/10 bg-black/25 px-3 py-1.5 text-[9px] font-semibold text-white/60 backdrop-blur hover:border-[#8B6CCF]/50 hover:text-[#C7B5F2]">{label}</button>)}
        <button type="button" onClick={() => navigate("/archive")} className="tap flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-3 text-[10px] text-sub backdrop-blur"><Archive size={13} /> 보관함</button>
      </div>
      <div className={`transition-[margin] duration-300 ease-out ${planet?"md:mr-[450px]":""}`}>
        <UniverseMap planets={PLANETS} groups={orbitGroups} skin={skin} scenarios={state.scenarios || []} selectedKey={planet?.key} onPlanetSelect={(key)=>key ? openPlanet(key) : (setPlanet(null),setCluster(null))} onConstellationOpen={(group,key)=>{
          // 기록 별자리를 누르면 그 별자리를 펼친다(행성 전체는 패널 안에서 열 수 있다).
          if (key) setPlanet(PLANETS.find((item) => item.key === key));
          setCluster(group);
        }} onScenarioOpen={(scenario)=>openPlanet(scenario.domain)} />
      </div>
      <p className="pointer-events-none absolute bottom-5 left-1/2 z-20 -translate-x-1/2 text-[10px] text-white/40">행성을 클릭해 영역별 미래를 비교해보세요 · 드래그 회전 · 휠/핀치 확대</p>

      {/* 시나리오 마름모·카드는 모두 그 행성 모달로 모은다.
          예전 FutureScenarioPanel 은 시점 문구가 전부 고정 텍스트였고 br(세부 예측)이
          비어 있어 "세부 예측 결과가 아직 저장되지 않았습니다"만 뜨는 빈 화면이었다.
          행성 모달이 그 영역의 기록·기회·N년 뒤를 실제 데이터로 다 보여준다. */}
      {cluster && <ClusterPanel group={cluster} planet={planet} profile={profile} onClose={()=>setCluster(null)} onWhole={()=>setCluster(null)} />}
      {planet && !cluster && <PlanetModal planet={planet} state={state} groups={orbitGroups} scenarios={planetScenarios} onClose={() => setPlanet(null)} onSimulate={() => navigate("/input")} onArchive={() => navigate("/archive")} onOpportunity={pickOpportunity} onOpenScenario={() => {}} profile={profile} />}
    </div>
  );
}

// ── 별자리 하나 펼쳐보기 ──────────────────────────────────────
// 3D 에서 별자리를 누르면 그 모양과 상태를 여기서 본다.
//
// 이름은 두 축이다 — 모양(그 묶음 기분의 평균×진폭)과 주제(사용자의 가치 1순위).
// 다만 이 묶음은 달력 한 주가 아니라 '그 영역 기록 7개'라, 문구를 '7일'이 아니라
// '기록 N개'로 쓴다. 성격 진단으로 읽히지 않게 개수를 항상 앞에 둔다.
function ClusterPanel({ group, planet, profile, onClose, onWhole }) {
  const stars = group?.stars || [];
  const values = stars.map((s) => s.valence).filter((v) => v != null);
  const theme = topAxes(profile?.value_ranking, 1)[0] || "성장";
  const named = values.length >= MIN_RECORDS_TO_NAME;
  const shape = named ? shapeOf(values) : null;
  const withText = stars.filter((s) => (s.text || s.note || "").trim());
  const moods = stars.map((s) => s.mood).filter((m) => m != null);
  const avg = moods.length ? (moods.reduce((a, b) => a + b, 0) / moods.length).toFixed(1) : null;

  return (
    <aside className="absolute inset-y-5 right-5 z-[60] w-[min(430px,calc(100%-40px))] overflow-y-auto rounded-[24px] border border-white/10 bg-[#09111F]/95 p-5 shadow-[0_30px_90px_rgba(0,0,0,.62)] backdrop-blur-xl">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[9px] tracking-[.15em] text-[#A88BE8]">RECORD CONSTELLATION</p>
          <h2 className="mt-1 text-[20px] font-bold">
            {named ? `${shape.adj}형 ${theme} 별자리` : "아직 이름 없는 별자리"}
          </h2>
          <p className="mt-1 text-[10px] text-mut">
            {planet?.label} · {group?.label || `별 ${stars.length}개`}
          </p>
        </div>
        <Close onClick={onClose} />
      </div>

      {/* 모양 — 그 묶음의 별을 그대로 그린다. */}
      <div className="mt-4 rounded-[20px] border border-white/[.07] bg-[#070D19] p-3">
        <Constellation size={250} stars={stars} todayDate={todayKey()} />
      </div>

      {/* 상태 */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        <Mini label="별" value={stars.length} />
        <Mini label="평균 기분" value={avg ?? "—"} />
        <Mini label="진폭" value={shape ? shape.sd.toFixed(2) : "—"} />
      </div>

      <p className="mt-3 text-[11.5px] leading-relaxed text-sub">
        {named
          ? `이 기록 ${values.length}개는 ${shape.line}`
          : `기록이 ${values.length}개라 아직 모양을 부르지 않았어요. ${MIN_RECORDS_TO_NAME}개부터 이름이 붙어요.`}
      </p>

      {withText.length > 0 && (
        <div className="mt-3 border-t border-white/[.06] pt-3">
          <p className="text-[9.5px] text-mut">이 별자리에 담긴 기록</p>
          <div className="mt-1.5 space-y-1">
            {withText.slice(0, 5).map((s) => (
              <p key={s.date} className="truncate text-[10.5px] text-sub">
                <span className="mr-1.5 text-mut">{dateLabel(s.date)}</span>
                {s.text || s.note}
              </p>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={onWhole}
        className="tap mt-4 w-full rounded-xl border border-[#8B6CCF]/40 bg-[#8B6CCF]/10 text-[12px] font-bold text-[#C7B5F2]"
      >
        {planet?.label} 전체 보기
      </button>
      <p className="mt-3 text-[9px] leading-relaxed text-mut">{HONESTY_NOTE}</p>
    </aside>
  );
}

function Shell({ children, onClose, wide = false }) {
  return <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#02040B]/65 p-5 backdrop-blur-[3px]" onClick={onClose}><section className={`max-h-[88%] overflow-y-auto rounded-[24px] border border-white/10 bg-[#0C1424]/95 p-5 shadow-[0_30px_90px_rgba(0,0,0,.55)] ${wide ? "w-[min(920px,92%)]" : "w-[min(660px,92%)]"}`} onClick={(e) => e.stopPropagation()}>{children}</section></div>;
}
function Close({ onClick }) { return <button type="button" onClick={onClick} className="tap flex h-9 w-9 items-center justify-center rounded-full text-sub"><X size={18} /></button>; }

// 그 행성(영역)으로 분류된 일기의 분석 — 기록 수·기분 흐름·자주 남긴 감정·월별 추이와
// 실제로 그날 쓴 문장. 시나리오(미래)와 기록(과거)이 한 행성에서 만나게 하는 부분이다.
const MOOD_COLORS = ["#E24B4A", "#D85A30", "#EDA100", "#5DCAA5", "#378ADD"];

function DomainRecords({ planet, state, entries, recent }) {
  // 1년치가 들어오면 이 셋은 렌더마다 수백 개 기록을 다시 훑는다 — 상태가 바뀔 때만 돌린다.
  const a = useMemo(() => domainAnalysis(planet.key, state), [planet.key, state]);
  const months = useMemo(() => domainMonths(planet.key, state).slice(0, 6).reverse(), [planet.key, state]);
  const maxN = useMemo(() => Math.max(1, ...months.map((m) => m.analysis.n || 0)), [months]);

  if (!a?.ok) {
    return (
      <div className="mt-4 rounded-[18px] border border-white/[.07] bg-black/20 p-4">
        <p className="text-[11px] font-bold">이 영역의 기록</p>
        <p className="mt-2 text-[10px] leading-relaxed text-mut">{domainReport(a, planet.label)}</p>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-[18px] border border-white/[.07] bg-black/20 p-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold">이 영역의 기록</p>
        <span className="text-[10px] text-[#A88BE8]">{a.n}개 · 평균 {a.moodAvg}</span>
      </div>

      <p className="mt-2 text-[10.5px] leading-relaxed text-sub">{domainReport(a, planet.label)}</p>

      {/* 월별 기록량 — 이 영역을 언제 많이 썼는지 */}
      {months.length > 1 && (
        <div className="mt-3">
          <div className="flex items-end gap-1.5">
            {months.map((m) => {
              const n = m.analysis.n || 0;
              const mood = m.analysis.moodAvg;
              const col = mood ? MOOD_COLORS[Math.max(0, Math.min(4, Math.round(mood) - 1))] : "#39435F";
              return (
                <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex h-[38px] w-full items-end">
                    <div className="w-full rounded-t-[3px]" style={{ height: `${Math.max(8, (n / maxN) * 100)}%`, background: col, opacity: 0.8 }} />
                  </div>
                  <span className="text-[8px] text-mut">{Number(m.month.split("-")[1])}월</span>
                </div>
              );
            })}
          </div>
          <p className="mt-1 text-[8.5px] text-mut">높이 = 기록 수 · 색 = 그달 평균 기분</p>
        </div>
      )}

      {a.topEmotions?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {a.topEmotions.map((e) => (
            <span key={e} className="rounded-full border border-white/10 px-2 py-0.5 text-[9px] text-sub">{e}</span>
          ))}
        </div>
      )}

      {/* 대표 기록 — 숫자보다 그날 문장이 이 영역을 기억나게 한다.
          기분이 고른 구간에선 '가장 좋았던 날'이 부정적 문장으로 뽑히기도 해서,
          실제 기분값으로 표현을 가른다(4점 이상일 때만 '좋았던 날'). */}
      <div className="mt-3 space-y-1.5">
        {a.best?.text && (
          <div className="rounded-lg bg-[#5DCAA5]/[.08] px-2.5 py-1.5">
            <p className="text-[8.5px] text-[#5DCAA5]">
              {a.best.mood >= 4 ? "가장 좋았던 날" : "그중 나았던 날"} · {dateLabel(a.best.date)}
            </p>
            <p className="mt-0.5 text-[10px] leading-relaxed text-sub">“{a.best.text}”</p>
          </div>
        )}
        {a.worst?.text && a.worst.date !== a.best?.date && (
          <div className="rounded-lg bg-[#F0736F]/[.08] px-2.5 py-1.5">
            <p className="text-[8.5px] text-[#F0736F]">
              {a.worst.mood <= 2 ? "가장 힘들었던 날" : "그중 무거웠던 날"} · {dateLabel(a.worst.date)}
            </p>
            <p className="mt-0.5 text-[10px] leading-relaxed text-sub">“{a.worst.text}”</p>
          </div>
        )}
      </div>

      {/* 최근 기록 몇 개 */}
      {recent?.length > 0 && (
        <div className="mt-3 border-t border-white/[.06] pt-2.5">
          <p className="text-[9.5px] text-mut">최근 기록</p>
          <div className="mt-1.5 space-y-1">
            {recent.map((e, i) => (
              <p key={i} className="truncate text-[10px] text-sub">
                <span className="mr-1.5 text-mut">{dateLabel(e.date)}</span>
                {e.text || e.note || "(체크인만 남긴 날)"}
              </p>
            ))}
          </div>
        </div>
      )}

      <p className="mt-3 text-[8.5px] leading-relaxed text-mut">
        이 영역으로 분류된 기록만 모아 정리한 것이며, 성격 진단이나 예측이 아닙니다.
      </p>
    </div>
  );
}

// ── 이 영역의 N년 뒤 ──────────────────────────────────────────
// 행성 하나에 쌓인 셋(그 영역 일기 · 그 영역에서 돌린 시뮬레이션 · 저장한 우주의 회고)을
// 한 번에 읽어 "이대로 가면 N년 뒤" 를 서사로 받아온다. 예측 수치가 아니라 기록에서
// 끌어온 이야기라, 화면에도 그대로 밝힌다.
// ── 아직 안 가본 길 ──────────────────────────────────────────
// 이 서비스가 하는 일은 하나를 맞히는 게 아니라 놓치고 있던 선택지를 여러 개 보이게
// 하는 것이다. 기록을 읽어 아직 저울에 올려본 적 없는 갈림길을 내밀고, 누르면
// 그 두 선택지가 채워진 채로 시뮬레이션이 열린다.
const EFFORT_COLOR = {
  "지금 바로": "#5DCAA5",
  "몇 달 준비": "#EDA100",
  "길게 준비": "#8FB4F0",
};

function Opportunities({ planet, state, onPick, profile }) {
  const mat = useMemo(() => futureMaterials(planet.key, state), [planet.key, state]);
  const [found, setFound] = useState(() => getCachedOpportunities(planet.key));
  const [busy, setBusy] = useState(false);
  const [mine, setMine] = useState(() => expeditionsFor(planet.key));
  useEffect(() => {
    const refresh = () => setMine(expeditionsFor(planet.key));
    window.addEventListener("pm:expedition", refresh);
    return () => window.removeEventListener("pm:expedition", refresh);
  }, [planet.key]);

  // 이미 떠난 길인지 — 같은 제목을 또 권하면 카드가 지저분해진다.
  const stateOf = (title) => {
    const e = mine.find((x) => x.title === title);
    if (!e) return null;
    return e.doneAt ? "done" : e.gaveUpAt ? "dropped" : "going";
  };

  async function scan() {
    setBusy(true);
    try {
      setFound(await scanOpportunities(planet, { speech: loadSpeech(), state, profile }));
    } finally {
      setBusy(false);
    }
  }

  const stale = found?.ok && found.nRecords != null && mat.total > found.nRecords;

  return (
    <div className="mt-4 rounded-[18px] border border-[#5DCAA5]/25 bg-[#5DCAA5]/[.06] p-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold">아직 안 가본 길</p>
        {found?.ok && <span className="text-[9.5px] text-[#7FD9BB]">{found.items.length}개</span>}
      </div>
      <p className="mt-1 text-[9.5px] leading-relaxed text-mut">
        아는 두 갈래 사이에서만 고민하지 않도록, 기록에서 다른 길을 찾아봐요.
      </p>

      {!mat.ready ? (
        <p className="mt-2 text-[10px] leading-relaxed text-mut">
          이 영역 일기가 3개는 모여야 길을 찾을 수 있어요. 지금 {mat.total}개예요.
        </p>
      ) : (
        <>
          {found?.ok && (
            <div className="mt-3 space-y-2">
              {found.items.map((it, i) => {
                const st = stateOf(it.title);
                return (
                  <div key={i} className="rounded-xl border border-white/[.07] bg-black/25 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[11px] font-semibold text-ink">{it.title}</p>
                      {it.effort && (
                        <span
                          className="shrink-0 rounded-full px-2 py-0.5 text-[8.5px]"
                          style={{
                            color: EFFORT_COLOR[it.effort] || "#9FB0CE",
                            background: `${EFFORT_COLOR[it.effort] || "#9FB0CE"}1A`,
                          }}
                        >
                          {it.effort}
                        </span>
                      )}
                    </div>
                    {it.why && <p className="mt-1 text-[10px] leading-relaxed text-sub">{it.why}</p>}
                    {it.first && (
                      <p className="mt-1.5 text-[9.5px] leading-relaxed text-mut">첫 걸음 · {it.first}</p>
                    )}
                    {/* 두 갈래로 나간다 — 아직 모르겠으면 작게 다녀오고(탐험),
                        저울에 올릴 준비가 됐으면 바로 비교한다. */}
                    <div className="mt-2 flex gap-1.5">
                      {st === "done" ? (
                        <span className="flex-1 rounded-lg bg-[#5DCAA5]/15 py-1.5 text-center text-[10px] text-[#7FD9BB]">
                          다녀온 길 ✓
                        </span>
                      ) : st === "going" ? (
                        <span className="flex-1 rounded-lg bg-white/[.06] py-1.5 text-center text-[10px] text-mut">
                          탐험 중…
                        </span>
                      ) : (
                        <button
                          onClick={() => startExpedition({
                            planet: planet.key, planetLabel: planet.label, title: it.title,
                            step: it.first, why: it.why, choiceA: it.choiceA, choiceB: it.choiceB,
                          })}
                          className="tap flex-1 rounded-lg bg-[#3E9C7F] py-1.5 text-[10px] font-bold text-white"
                        >
                          작은 탐험으로 다녀오기
                        </button>
                      )}
                      <button
                        onClick={() => onPick(it)}
                        className="tap rounded-lg border border-white/[.09] px-2.5 py-1.5 text-[10px] text-sub"
                        title={`${it.choiceA} vs ${it.choiceB}`}
                      >
                        비교하기
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {found && !found.ok && found.reason && (
            <p className="mt-3 text-[10px] leading-relaxed text-mut">{found.reason}</p>
          )}

          <button
            onClick={scan}
            disabled={busy}
            className={`tap mt-3 w-full rounded-xl text-[12px] font-bold ${
              busy ? "bg-[#1E2740] text-mut" : "bg-[#3E9C7F] text-white"
            }`}
          >
            {busy ? "기록에서 길을 찾는 중…" : found?.ok ? "다시 찾기" : "이 영역의 길 찾기"}
          </button>
          {stale && (
            <p className="mt-1.5 text-[9px] text-[#EDA100]">
              길을 찾은 뒤 기록이 {mat.total - found.nRecords}개 늘었어요. 다시 찾으면 반영돼요.
            </p>
          )}
          <p className="mt-2 text-[8.5px] leading-relaxed text-mut">
            기록에 있는 흐름에서만 끌어온 제안이에요. 눌러서 바로 비교해볼 수 있어요.
          </p>
        </>
      )}
    </div>
  );
}

// 관측 거리 — 멀리 보려면 더 개척해야 한다. 쌓인 게 늘수록 먼 해가 열린다.
// 기록이 곧 망원경이고, 회고(선택하고 돌아와 적은 것)가 가장 멀리 보게 해준다.
// 멀리 보려면 더 개척해야 한다. 다만 '겪은 것'을 만드는 길이 시뮬레이션 하나뿐이면
// 5년·10년은 사실상 안 열린다. 작은 탐험을 다녀온 것도 같은 무게로 센다 —
// 오히려 상상한 갈림길보다 실제로 가서 알아온 쪽이 단단한 근거다.
const YEAR_TIERS = [
  { years: 1, need: { records: 3 } },
  { years: 3, need: { records: 10 } },
  { years: 5, need: { records: 10, probes: 1 } },
  { years: 10, need: { records: 10, probes: 1, deep: 1 } },
];

function tierState(tier, mat) {
  const trips = mat.trips?.length || 0;
  const have = {
    records: mat.total,
    probes: mat.sims.length + trips,          // 저울에 올렸거나 직접 다녀온 것
    deep: mat.reflections + trips,            // 그래서 알게 된 것을 적어둔 것
  };
  const missing = [];
  if (have.records < (tier.need.records || 0)) {
    missing.push(`일기 ${tier.need.records - have.records}개`);
  }
  if (have.probes < (tier.need.probes || 0)) missing.push("작은 탐험 1번(또는 시뮬레이션)");
  if (have.deep < (tier.need.deep || 0)) missing.push("탐험 기록 1개(또는 회고)");
  return { open: missing.length === 0, missing };
}

function FutureYears({ planet, state, profile }) {
  const mat = useMemo(() => futureMaterials(planet.key, state), [planet.key, state]);
  const tiers = useMemo(() => YEAR_TIERS.map((t) => ({ ...t, ...tierState(t, mat) })), [mat]);
  const furthest = useMemo(() => {
    const open = tiers.filter((t) => t.open);
    return open.length ? open[open.length - 1].years : null;
  }, [tiers]);

  const [years, setYears] = useState(() => furthest || 1);
  const [busy, setBusy] = useState(false);
  const [story, setStory] = useState(() => (furthest ? getCachedFuture(planet.key, furthest) : null));

  // 햇수를 바꾸면 그 햇수로 써둔 이야기가 있으면 꺼내고, 없으면 비운다.
  function pickYears(y) {
    setYears(y);
    setStory(getCachedFuture(planet.key, y));
  }

  async function write() {
    setBusy(true);
    try {
      setStory(await writeFuture(planet, years, { speech: loadSpeech(), state, profile }));
    } finally {
      setBusy(false);
    }
  }

  // 새 기록이 쌓였으면 다시 쓸 만하다고 알려준다(이야기는 쓴 시점에 묶여 있다).
  const stale = story?.ok && story.nRecords != null && mat.total > story.nRecords;

  return (
    <div className="mt-4 rounded-[18px] border border-[#4E7FD9]/25 bg-[#4E7FD9]/[.07] p-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold">이 영역의 N년 뒤</p>
        <span className="text-[9.5px] text-[#8FB4F0]">
          일기 {mat.total}개{mat.sims.length ? ` · 시뮬 ${mat.sims.length}개` : ""}
          {mat.trips?.length ? ` · 탐험 ${mat.trips.length}개` : ""}{mat.reflections ? ` · 회고 ${mat.reflections}개` : ""}
        </span>
      </div>

      {!furthest ? (
        <p className="mt-2 text-[10px] leading-relaxed text-mut">
          이 영역 일기가 3개는 모여야 1년 뒤가 보여요. 지금 {mat.total}개예요.
        </p>
      ) : (
        <>
          {/* 잠긴 해는 눌러도 안 열리고, 무엇을 더 쌓아야 열리는지만 알려준다. */}
          <div className="mt-3 grid grid-cols-4 gap-1.5">
            {tiers.map((t) => (
              <button
                key={t.years}
                onClick={() => t.open && pickYears(t.years)}
                disabled={!t.open}
                title={t.open ? undefined : `${t.missing.join(" + ")} 더 모으면 열려요`}
                className={`tap rounded-xl border py-2 text-[10px] font-semibold ${
                  !t.open
                    ? "border-white/[.05] text-[#4A5573]"
                    : years === t.years
                      ? "border-[#4E7FD9] bg-[#4E7FD9]/20 text-[#B6D0FA]"
                      : "border-white/[.07] text-mut"
                }`}
              >
                {t.open ? `${t.years}년 뒤` : `🔒 ${t.years}년`}
              </button>
            ))}
          </div>
          {tiers.some((t) => !t.open) && (
            <p className="mt-1.5 text-[9px] leading-relaxed text-mut">
              {(() => {
                const next = tiers.find((t) => !t.open);
                return `${next.missing.join(" + ")} 더 쌓이면 ${next.years}년 뒤까지 보여요 — 멀리 보려면 더 개척해야 해요.`;
              })()}
            </p>
          )}

          {story?.ok ? (
            <div className="mt-3 space-y-2.5">
              {story.now && (
                <div className="rounded-xl bg-black/20 p-3">
                  <p className="text-[9px] text-mut">지금 이 영역은</p>
                  <p className="mt-1 text-[10.5px] leading-relaxed text-sub">{story.now}</p>
                </div>
              )}
              <div className="rounded-xl border border-[#4E7FD9]/25 bg-black/25 p-3">
                <p className="text-[9px] text-[#8FB4F0]">{story.years}년 뒤</p>
                <p className="mt-1 text-[11px] leading-relaxed text-ink">{story.future}</p>
              </div>
              {story.hinge && (
                <div className="rounded-xl bg-[#EDA100]/[.08] p-3">
                  <p className="text-[9px] text-[#EDA100]">이 미래를 가르는 갈림길</p>
                  <p className="mt-1 text-[10.5px] leading-relaxed text-sub">{story.hinge}</p>
                </div>
              )}
              {story.basis?.length > 0 && (
                <div className="border-t border-white/[.06] pt-2.5">
                  <p className="text-[9px] text-mut">이 이야기를 끌어온 기록</p>
                  <ul className="mt-1 space-y-0.5">
                    {story.basis.map((b, i) => (
                      <li key={i} className="text-[9.5px] leading-relaxed text-mut">· {b}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : story?.reason ? (
            <p className="mt-3 text-[10px] leading-relaxed text-mut">{story.reason}</p>
          ) : null}

          <button
            onClick={write}
            disabled={busy}
            className={`tap mt-3 w-full rounded-xl text-[12px] font-bold ${
              busy ? "bg-[#1E2740] text-mut" : "bg-[#4E7FD9] text-white"
            }`}
          >
            {busy ? "기록을 읽는 중…" : story?.ok ? "다시 쓰기" : `${years}년 뒤 이야기 쓰기`}
          </button>
          {stale && (
            <p className="mt-1.5 text-[9px] text-[#EDA100]">
              이야기를 쓴 뒤 기록이 {mat.total - story.nRecords}개 늘었어요. 다시 쓰면 반영돼요.
            </p>
          )}
          <p className="mt-2 text-[8.5px] leading-relaxed text-mut">
            예측이 아니라 내 기록에서 끌어온 이야기예요. 통계 예측치와는 무관합니다.
          </p>
        </>
      )}
    </div>
  );
}

function PlanetModal({ planet, state, groups, scenarios, onClose, onSimulate, onArchive, onOpportunity, onOpenScenario, profile }) {
  const entries = useMemo(() => planetEntries(state, planet.key), [state, planet.key]);
  const recent = useMemo(() => entries.slice(-3).reverse(), [entries]);
  const futures = useMemo(() => [...(scenarios || [])].reverse(), [scenarios]);
  return <div className="absolute inset-y-5 right-5 z-40 w-[min(430px,calc(100%-40px))] overflow-y-auto rounded-[24px] border border-white/10 bg-[#09111F]/94 p-5 shadow-[0_30px_90px_rgba(0,0,0,.6)] backdrop-blur-xl"><div>
    <div className="flex items-start justify-between"><div className="flex items-center gap-4"><PlanetOrb planet={planet} /><div><p className="text-[9px] tracking-[.16em] text-[#A88BE8]">FUTURE PLANET</p><h2 className="mt-1 text-[22px] font-bold">{planet.label}</h2></div></div><Close onClick={onClose}/></div>
    <p className="mt-4 text-[11px] leading-relaxed text-sub">{DESCRIPTIONS[planet.key]}</p>
    <div className="mt-5 rounded-[18px] border border-[#8B6CCF]/25 bg-[#8B6CCF]/[.07] p-4">
      <div className="flex items-center justify-between"><p className="text-[11px] font-bold">이 영역에서 탐색한 미래</p><span className="text-[10px] text-[#A88BE8]">{futures.length}개 시나리오</span></div>
      {/* 시나리오 카드를 눌러 시점별 패널을 연다 — 별자리는 이제 기록을 그리므로,
          미래 패널로 가는 길은 여기다. */}
      <div className="mt-3 space-y-2">{futures.length ? futures.slice(0,3).map((scenario, i)=><div key={`${scenario.date}-${i}`} className="w-full rounded-xl border border-white/[.07] bg-black/20 p-3 text-left"><div className="flex justify-between gap-3"><p className="text-[11px] font-semibold">{scenario.title}</p><span className="shrink-0 text-[9px] text-mut">{scenario.date}</span></div>{scenario.br?.length>0&&<p className="mt-2 line-clamp-2 text-[10px] leading-relaxed text-sub">{scenario.br.join(" · ")}</p>}</div>) : <p className="py-2 text-[10px] leading-relaxed text-mut">아직 이 영역에서 만든 미래 시뮬레이션이 없어요. 선택지를 비교하면 결과가 이 행성에 쌓입니다.</p>}</div>
      <button onClick={onSimulate} className="tap mt-3 w-full rounded-xl bg-[#8B6CCF] text-[12px] font-bold">{futures.length ? "새 미래 시뮬레이션" : "첫 미래 시뮬레이션 시작"}</button>
    </div>
    {/* 이 영역의 일기 분석 — 행성이 시나리오만 담으면 '내 기록'과 끊긴다.
        같은 영역으로 분류된 일기의 흐름·감정·대표 기록을 여기서 보여준다. */}
    <DomainRecords planet={planet} state={state} entries={entries} recent={recent} />
    {/* 기록에서 아직 안 가본 길을 찾아 내민다 — 누르면 그 갈림길로 시뮬레이션이 열린다. */}
    <Opportunities planet={planet} state={state} onPick={onOpportunity} profile={profile} />
    {/* 과거(일기)와 미래(시뮬)가 한 행성에서 만났으니, 그 둘을 이어 'N년 뒤'를 쓴다. */}
    <FutureYears planet={planet} state={state} profile={profile} />

    <div className="mt-4 grid grid-cols-3 gap-2">{[["저장한 결과",futures.length],["비교한 미래",futures.length*2],["관련 기록",entries.length]].map(([l,v])=><Mini key={l} label={l} value={v}/>)}</div>
    <button onClick={onArchive} className="tap mt-4 w-full rounded-xl border border-[#8B6CCF]/40 bg-[#8B6CCF]/10 text-[12px] font-bold text-[#C7B5F2]">저장한 시뮬레이션 전체 보기</button>
    <p className="mt-4 text-[9px] leading-relaxed text-mut">이 행성에는 해당 영역의 선택지, 예측 변화와 저장한 시뮬레이션 결과가 쌓입니다.</p>
  </div></div>;
  /* Legacy modal layout retained below for reference only.
  return <Shell onClose={onClose} wide><div className="grid gap-6 md:grid-cols-[230px_1fr]">
    <div><div className="flex items-center gap-4"><PlanetOrb planet={planet} /><div><h2 className="text-[22px] font-bold">{planet.label}</h2><p className="mt-1 text-[11px] leading-relaxed text-sub">{DESCRIPTIONS[planet.key]}</p></div></div>
      <div className="mt-5 grid grid-cols-3 gap-2">{[["이번 주 별자리",groups.length],["기록한 주",groups.length],["누적 기록",entries.length]].map(([l,v])=><Mini key={l} label={l} value={v}/>)}</div>
      <button onClick={onWeek} className="tap mt-5 w-full rounded-xl bg-[#8B6CCF] text-[12px] font-bold">이번 주 별자리 보기</button>
      <button onClick={onAdd} className="tap mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 text-[12px] text-sub"><Plus size={14}/>기록 추가</button>
    </div>
    <div className="border-white/10 md:border-l md:pl-6"><div className="flex items-start justify-between"><div><p className="text-[11px] font-semibold text-sub">주요 키워드</p><div className="mt-2 flex flex-wrap gap-1.5">{KEYWORDS[planet.key].map(k=><span key={k} className="rounded-full bg-white/[.05] px-2.5 py-1 text-[9px] text-sub">{k}</span>)}</div></div><Close onClick={onClose}/></div>
      <p className="mb-2 mt-6 text-[11px] font-semibold text-sub">최근 기록</p><div className="divide-y divide-white/[.06] rounded-xl bg-black/10 px-3">{recent.length ? recent.map(e=><div key={e.date} className="flex justify-between gap-4 py-3 text-[11px]"><span className="truncate text-sub">{e.text || e.note || "기록한 하루"}</span><span className="text-mut">{dateLabel(e.date)}</span></div>) : <p className="py-5 text-[11px] text-mut">아직 기록이 없어요.</p>}</div>
      <button onClick={onArchive} className="tap mt-3 text-[11px] text-cyan">전체 아카이브 보기 <ChevronRight size={13} className="inline"/></button></div>
  </div></Shell>; */
}

function FutureScenarioPanel({ planet, future, onClose, onCompare }) {
  const scenario = future.scenario || future;
  const [horizon,setHorizon] = useState(future.selectedPoint?.horizon || "현재");
  useEffect(()=>setHorizon(future.selectedPoint?.horizon || "현재"),[future]);
  const branches = scenario.br?.filter(Boolean) || [];
  const horizonCopy = {
    "현재":"선택을 앞둔 지금의 조건과 출발점을 보여줍니다.",
    "3개월":"초기 적응과 비용, 가장 먼저 체감할 변화를 살펴봅니다.",
    "1년":"생활 패턴과 만족도, 성장 방향이 자리 잡는 시점입니다.",
    "3년":"선택이 장기적인 경로와 기회에 만든 차이를 확인합니다.",
  };
  return <aside className="absolute inset-y-5 right-5 z-[60] w-[min(430px,calc(100%-40px))] overflow-y-auto rounded-[24px] border border-white/10 bg-[#09111F]/95 p-5 shadow-[0_30px_90px_rgba(0,0,0,.62)] backdrop-blur-xl">
    <div className="flex items-start justify-between"><div><p className="text-[9px] tracking-[.15em] text-[#A88BE8]">FUTURE CONSTELLATION</p><h2 className="mt-1 text-[20px] font-bold">{scenario.title || `${planet?.label || "미래"} 시나리오`}</h2><p className="mt-1 text-[10px] text-mut">{planet?.label} · {scenario.date || "저장된 미래"}</p></div><Close onClick={onClose}/></div>
    <div className="mt-5"><p className="text-[10px] font-semibold text-sub">미래 시점</p><div className="mt-2 grid grid-cols-4 gap-1.5">{["현재","3개월","1년","3년"].map((item)=><button key={item} onClick={()=>setHorizon(item)} className={`tap rounded-xl border py-2 text-[10px] font-semibold ${horizon===item?"border-[#8B6CCF] bg-[#8B6CCF]/20 text-[#CDBDF3]":"border-white/[.07] text-mut"}`}>{item}</button>)}</div></div>
    <div className="mt-4 rounded-[18px] border border-[#8B6CCF]/25 bg-[#8B6CCF]/[.07] p-4"><p className="text-[10px] font-bold text-[#BBA4ED]">{horizon}의 나</p><p className="mt-2 text-[12px] leading-relaxed text-sub">{horizonCopy[horizon]}</p>{branches.length?<div className="mt-3 space-y-2">{branches.map((text,i)=><div key={i} className="rounded-xl bg-black/20 p-3 text-[10px] leading-relaxed text-sub"><b className="mr-2 text-[#A88BE8]">미래 {String.fromCharCode(65+i)}</b>{text}</div>)}</div>:<p className="mt-3 text-[10px] text-mut">세부 예측 결과가 아직 저장되지 않았습니다. 다시 시뮬레이션하면 이 시점의 변화가 채워집니다.</p>}</div>
    <div className="mt-4 grid grid-cols-3 gap-2"><Mini label="시나리오" value={branches.length || 1}/><Mini label="시간축" value="4"/><Mini label="근거" value={branches.length?"연결":"대기"}/></div>
    <button onClick={onCompare} className="tap mt-4 w-full rounded-xl bg-[#8B6CCF] text-[12px] font-bold">다른 미래와 비교하기</button>
    <p className="mt-3 text-[9px] leading-relaxed text-mut">예측은 확정된 미래가 아니라 현재 입력과 관측 근거를 바탕으로 한 탐색 결과입니다.</p>
  </aside>;
}

function WeekModal({ planet, group, picked, onPick, onClose, onReport }) {
  if (!group) return null;
  return <aside className="absolute inset-y-5 right-5 z-[60] w-[min(430px,calc(100%-40px))] overflow-y-auto rounded-[24px] border border-white/10 bg-[#09111F]/95 p-5 shadow-[0_30px_90px_rgba(0,0,0,.62)] backdrop-blur-xl">
    <div className="flex items-start justify-between"><div><p className="text-[9px] tracking-[.15em] text-[#A88BE8]">ORBITING CONSTELLATION</p><h2 className="mt-1 text-[20px] font-bold">{planet?.label || "나의 우주"} · 별자리</h2><p className="mt-1 text-[11px] text-mut">{dateLabel(group.weekStart)} — {dateLabel(group.weekEnd)}</p></div><Close onClick={onClose}/></div>
    <div className="mt-4 rounded-[20px] border border-white/[.07] bg-[#070D19] p-3"><Constellation size={250} stars={group.stars} todayDate={todayKey()} selectedDate={picked?.date} onSelect={(star)=>!star.future&&onPick(star)}/></div>
    <p className="mt-2 text-[9px] leading-relaxed text-mut">별을 선택하면 해당 날짜의 기록이 아래에 열립니다.</p>
    {picked ? <RecordPreview record={picked}/> : <div className="mt-4 rounded-xl border border-white/[.06] bg-black/15 p-4 text-[11px] leading-relaxed text-mut">별자리의 별을 선택하면 그날 작성한 일기가 표시됩니다.</div>}
  </aside>;
}

function ReportModal({ planet, group, onClose }) {
  const stars=group.stars.filter(s=>!s.empty), moods=stars.map(s=>s.mood||3), avg=moods.length?(moods.reduce((a,b)=>a+b,0)/moods.length).toFixed(1):"—";
  return <Shell onClose={onClose} wide><div className="flex items-start justify-between"><div><h2 className="text-[20px] font-bold">{planet?.label || "전체"} · {dateLabel(group.weekStart)} - {dateLabel(group.weekEnd)} 주간 리포트</h2><p className="mt-1 text-[11px] text-mut">이번 주 기록을 한눈에 돌아봅니다.</p></div><Close onClick={onClose}/></div>
    <div className="mt-5 grid gap-3 md:grid-cols-4"><ReportCard title="체크인 현황" value={`${group.filled}/7`} text="이번 주 체크인"/><ReportCard title="감정 흐름" value={avg} text="평균 기분"/><ReportCard title="반복 키워드" value={KEYWORDS[planet?.key||"career"][0]} text="가장 자주 나타남"/><ReportCard title="이번 주 한줄 요약" value="기록이 방향을 만들고 있어요" text="작은 변화를 이어가세요"/></div>
  </Shell>;
}

function ArchiveModal({ state, onClose, onPlanet, onRecord }) {
  const recent=(state.checkins||[]).filter(e=>!e.empty).slice(-5).reverse();
  return <Shell onClose={onClose} wide><div className="flex items-start justify-between"><div><h2 className="text-[20px] font-bold">기록 아카이브</h2><p className="mt-1 text-[11px] text-mut">행성별 기록과 별자리를 찾아보세요.</p></div><Close onClick={onClose}/></div><div className="mt-5 grid gap-6 md:grid-cols-2"><div className="divide-y divide-white/[.07]">{PLANETS.map(p=>{const entries=planetEntries(state,p.key);return <button key={p.key} onClick={()=>onPlanet(p)} className="tap flex w-full items-center gap-4 py-3 text-left"><PlanetOrb planet={p} small/><div className="min-w-0 flex-1"><div className="text-[12px] font-bold">{p.label}</div><p className="truncate text-[10px] text-mut">{entries.at(-1)?.text||DESCRIPTIONS[p.key]}</p></div><span className="text-[11px] text-sub">{entries.length}개 기록</span><ChevronRight size={15}/></button>})}</div>
    <div className="border-white/10 md:border-l md:pl-5"><p className="mb-2 text-[11px] font-semibold text-sub">최근 기록</p><div className="divide-y divide-white/[.07]">{recent.map(e=><button key={e.date} onClick={()=>onRecord(e)} className="tap flex w-full items-center justify-between gap-3 py-3 text-left"><div className="min-w-0"><div className="text-[11px] font-semibold">{dateLabel(e.date)}</div><p className="mt-1 truncate text-[10px] text-mut">{e.text||e.note||"기록한 하루"}</p></div><ChevronRight size={14}/></button>)}</div></div></div>
  </Shell>;
}

function RecordModal({ record, onClose, onRelated }) { return <Shell onClose={onClose}><div className="flex items-start justify-between"><div><p className="text-[10px] text-mut">기록 상세</p><h2 className="mt-1 text-[19px] font-bold">{dateLabel(record.date)}</h2></div><Close onClick={onClose}/></div><RecordPreview record={record}/><button onClick={onRelated} className="tap mt-4 text-[11px] text-cyan">관련 별자리 보기 <ChevronRight size={13} className="inline"/></button></Shell>; }
function RecordPreview({ record }) { return <div className="mt-4 rounded-xl border border-white/[.07] bg-black/10 p-4"><div className="grid grid-cols-3 gap-3 text-[10px]"><Mini label="기분" value={record.mood?`${record.mood}/5`:"—"}/><Mini label="에너지" value={record.energy?`${record.energy}/5`:"—"}/><Mini label="키워드" value={record.emotion||"기록"}/></div><p className="mt-4 text-[12px] leading-relaxed text-sub">{record.text||record.note||"이날의 기록이 아직 짧아요."}</p></div>; }
function Mini({label,value}) { return <div className="rounded-xl bg-white/[.035] px-2 py-3 text-center"><div className="text-[15px] font-bold text-ink">{value}</div><div className="mt-1 text-[9px] text-mut">{label}</div></div>; }
function ReportCard({title,value,text}) { return <div className="min-h-[145px] rounded-[18px] border border-white/[.07] bg-black/10 p-4"><div className="text-[10px] font-semibold text-sub">{title}</div><div className="mt-5 text-[21px] font-bold text-cyan">{value}</div><p className="mt-2 text-[10px] leading-relaxed text-mut">{text}</p></div>; }
function PlanetOrb({planet,small=false}) { return <span className={`block shrink-0 rounded-full border border-white/15 ${small?"h-10 w-10":"h-16 w-16"}`} style={{background:`radial-gradient(circle at 30% 25%,#fff9,transparent 18%),radial-gradient(circle at 34% 30%,${planet.to},${planet.from} 62%,#080912)`}}/>; }
