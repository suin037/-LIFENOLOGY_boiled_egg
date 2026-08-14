import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Archive, CalendarDays, ChevronRight, Plus, X } from "lucide-react";
import UniverseMap from "../components/UniverseMap.jsx";
import Constellation from "../components/Constellation.jsx";
import { PLANETS } from "../data/result.js";
import { adaptiveGroups, loadUniverse, resetUniverse, scenariosByPlanet, seedDemoCheckins, todayKey } from "../data/myUniverse.js";
import { seedDemoEunwoo, seedDemoYear } from "../data/demoYear.js";
import { clearSavedReports, REPORT_UID } from "../data/dispositionApi.js";
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

function domainsOf(entry) {
  return Array.isArray(entry.domains) && entry.domains.length ? entry.domains : ["career"];
}
function planetEntries(state, key) {
  return (state.checkins || []).filter((entry) => !entry.empty && domainsOf(entry).includes(key));
}
function dateLabel(date) { const [, month, day] = String(date).split("-"); return `${Number(month)}.${Number(day)}`; }

export default function MyUniverseV2() {
  const navigate = useNavigate();
  const [state, setState] = useState(loadUniverse);
  const [planet, setPlanet] = useState(null);
  const [week, setWeek] = useState(null);
  const [record, setRecord] = useState(null);
  const [report, setReport] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [future, setFuture] = useState(null);
  const [skin,setSkin]=useState(planetSkin);
  useEffect(() => { const refresh = () => setState(loadUniverse()); window.addEventListener("pm:universe", refresh); return () => window.removeEventListener("pm:universe", refresh); }, []);
  useEffect(()=>{const refresh=()=>setSkin(planetSkin());window.addEventListener("pm:planet-shop",refresh);return()=>window.removeEventListener("pm:planet-shop",refresh);},[]);

  const allGroups = useMemo(() => adaptiveGroups(null, state), [state]);
  const selectedGroups = useMemo(() => planet ? adaptiveGroups(planet.key, state) : allGroups, [planet, state, allGroups]);
  const currentGroup = week || selectedGroups[selectedGroups.length - 1] || allGroups[allGroups.length - 1] || null;
  const futureGroups = useMemo(() => {
    const source = planet ? scenariosByPlanet(planet.key, state) : (state.scenarios || []);
    const mapped = source.map((scenario,index)=>({
      ...scenario,
      scenario,
      weekStart: `${scenario.date || "future"}-${scenario.domain || "all"}-${index}`,
      stars: [
        { label:"현재", horizon:"현재", empty:false },
        { label:"3개월", horizon:"3개월", empty:false },
        { label:"1년", horizon:"1년", empty:false },
        { label:"3년", horizon:"3년", empty:false },
      ],
    }));
    const visiblePlanets = planet ? [planet] : PLANETS;
    for (const item of visiblePlanets) {
      if (mapped.some((group)=>group.domain===item.key)) continue;
      mapped.push({
        domain:item.key,
        placeholder:true,
        title:`${item.label} 미래 탐색`,
        weekStart:`future-${item.key}`,
        scenario:{domain:item.key,title:`${item.label} 미래 탐색`,br:[]},
        stars:["현재","3개월","1년","3년"].map((label)=>({label,horizon:label,empty:false})),
      });
    }
    return mapped;
  },[planet,state]);

  function openPlanet(key) { setPlanet(PLANETS.find((item) => item.key === key)); setWeek(null); setFuture(null); }
  function openWeek(group) { setWeek(group || selectedGroups[selectedGroups.length - 1] || null); setRecord(null); setReport(false); }
  function runDemo(kind) {
    clearSavedReports(REPORT_UID);
    setPlanet(null); setWeek(null); setRecord(null); setReport(false); setFuture(null);
    if (kind === "clear") resetUniverse();
    else if (kind === "6w") { resetUniverse(); seedDemoCheckins(); }
    else if (kind === "1y") seedDemoYear();
    else if (kind === "eunwoo") seedDemoEunwoo();
    setState(loadUniverse());
  }

  return (
    <div className="relative h-full min-h-[620px] overflow-hidden rounded-[26px] border border-white/10 bg-[#030712] lg:h-[calc(100vh-76px)] lg:min-h-[calc(100vh-76px)] lg:rounded-none lg:border-0">
      <div className="pointer-events-none absolute left-8 top-6 z-20 lg:left-12 lg:top-9 xl:left-16">
        <h1 className="text-[25px] font-bold tracking-[-.03em]">나의 우주</h1>
        <p className="mt-1 text-[11px] text-sub">당신의 기록이 별이 되고, 별들이 연결되어 우주가 됩니다.</p>
      </div>
      <div className="absolute right-6 top-5 z-30 flex flex-wrap justify-end gap-1.5 lg:right-12 lg:top-8 xl:right-16">
        {[['6w','6주'],['1y','1년'],['eunwoo','은우'],['clear','비우기']].map(([key,label])=><button key={key} type="button" onClick={()=>runDemo(key)} className="tap rounded-full border border-white/10 bg-black/25 px-3 py-1.5 text-[9px] font-semibold text-white/60 backdrop-blur hover:border-[#8B6CCF]/50 hover:text-[#C7B5F2]">{label}</button>)}
        <button type="button" onClick={() => navigate("/archive")} className="tap flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-3 text-[10px] text-sub backdrop-blur"><Archive size={13} /> 보관함</button>
      </div>
      <div className={`transition-[margin] duration-300 ease-out ${(planet||future)?"md:mr-[450px]":""}`}>
        <UniverseMap planets={PLANETS} groups={futureGroups} skin={skin} scenarios={state.scenarios || []} selectedKey={planet?.key} onPlanetSelect={(key)=>key ? openPlanet(key) : (setPlanet(null),setFuture(null))} onConstellationOpen={(group,key)=>{
          if (key) setPlanet(PLANETS.find((item)=>item.key===key));
          setFuture(group);
        }} />
      </div>
      <p className="pointer-events-none absolute bottom-5 left-1/2 z-20 -translate-x-1/2 text-[10px] text-white/40">행성을 클릭해 영역별 미래를 비교해보세요 · 드래그 회전 · 휠/핀치 확대</p>

      {planet && !future && <PlanetModal planet={planet} state={state} groups={futureGroups} scenarios={scenariosByPlanet(planet.key, state)} onClose={() => setPlanet(null)} onSimulate={() => navigate("/input")} onArchive={() => navigate("/archive")} />}
      {future && <FutureScenarioPanel planet={planet} future={future} onClose={()=>setFuture(null)} onCompare={()=>navigate("/input")}/>} 
    </div>
  );
}

function Shell({ children, onClose, wide = false }) {
  return <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#02040B]/65 p-5 backdrop-blur-[3px]" onClick={onClose}><section className={`max-h-[88%] overflow-y-auto rounded-[24px] border border-white/10 bg-[#0C1424]/95 p-5 shadow-[0_30px_90px_rgba(0,0,0,.55)] ${wide ? "w-[min(920px,92%)]" : "w-[min(660px,92%)]"}`} onClick={(e) => e.stopPropagation()}>{children}</section></div>;
}
function Close({ onClick }) { return <button type="button" onClick={onClick} className="tap flex h-9 w-9 items-center justify-center rounded-full text-sub"><X size={18} /></button>; }

function PlanetModal({ planet, state, groups, scenarios, onClose, onSimulate, onArchive }) {
  const entries = planetEntries(state, planet.key), recent = entries.slice(-3).reverse();
  const futures = [...(scenarios || [])].reverse();
  return <div className="absolute inset-y-5 right-5 z-40 w-[min(430px,calc(100%-40px))] overflow-y-auto rounded-[24px] border border-white/10 bg-[#09111F]/94 p-5 shadow-[0_30px_90px_rgba(0,0,0,.6)] backdrop-blur-xl"><div>
    <div className="flex items-start justify-between"><div className="flex items-center gap-4"><PlanetOrb planet={planet} /><div><p className="text-[9px] tracking-[.16em] text-[#A88BE8]">FUTURE PLANET</p><h2 className="mt-1 text-[22px] font-bold">{planet.label}</h2></div></div><Close onClick={onClose}/></div>
    <p className="mt-4 text-[11px] leading-relaxed text-sub">{DESCRIPTIONS[planet.key]}</p>
    <div className="mt-5 rounded-[18px] border border-[#8B6CCF]/25 bg-[#8B6CCF]/[.07] p-4">
      <div className="flex items-center justify-between"><p className="text-[11px] font-bold">이 영역에서 탐색한 미래</p><span className="text-[10px] text-[#A88BE8]">{futures.length}개 시나리오</span></div>
      <div className="mt-3 space-y-2">{futures.length ? futures.slice(0,3).map((scenario, i)=><div key={`${scenario.date}-${i}`} className="rounded-xl border border-white/[.07] bg-black/20 p-3"><div className="flex justify-between gap-3"><p className="text-[11px] font-semibold">{scenario.title}</p><span className="shrink-0 text-[9px] text-mut">{scenario.date}</span></div>{scenario.br?.length>0&&<p className="mt-2 line-clamp-2 text-[10px] leading-relaxed text-sub">{scenario.br.join(" · ")}</p>}</div>) : <p className="py-2 text-[10px] leading-relaxed text-mut">아직 이 영역에서 만든 미래 시뮬레이션이 없어요. 선택지를 비교하면 결과가 이 행성에 쌓입니다.</p>}</div>
      <button onClick={onSimulate} className="tap mt-3 w-full rounded-xl bg-[#8B6CCF] text-[12px] font-bold">{futures.length ? "새 미래 시뮬레이션" : "첫 미래 시뮬레이션 시작"}</button>
    </div>
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
