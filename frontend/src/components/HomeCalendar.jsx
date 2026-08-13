import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import Constellation from "./Constellation.jsx";
import JyConstellationArchive from "./JyConstellationArchive.jsx";
import { constellationGroups, loadUniverse, todayKey } from "../data/myUniverse.js";
import { zodiacOf } from "../data/zodiac.js";

export default function HomeCalendar() {
  const state = loadUniverse();
  const entries = useMemo(() => (state.checkins || []).filter((entry) => !entry.empty && entry.date), [state]);
  const years = useMemo(() => [...new Set(entries.map((entry) => Number(entry.date.slice(0, 4))))].sort((a,b)=>b-a), [entries]);
  const fallbackYear = new Date().getFullYear();
  const [year,setYear] = useState(years[0] || fallbackYear);
  const [month,setMonth] = useState(null);
  const [week,setWeek] = useState(null);
  const [star,setStar] = useState(null);
  const [report,setReport] = useState(null);
  // 주간 별자리는 '달력 한 주(7일)' 기준이어야 한다 — adaptiveGroups(기록 수에 맞춘 큰 묶음)를
  // 쓰면 한 묶음이 32일이 되어 라벨·모양·리포트가 모두 깨진다.
  const groups = useMemo(() => constellationGroups(state),[state]);
  const months = useMemo(() => Array.from({length:12},(_,index)=>{
    const key=`${year}-${String(index+1).padStart(2,"0")}`;
    const items=entries.filter((entry)=>entry.date.startsWith(key));
    const moods=items.map((entry)=>entry.mood).filter(Boolean);
    return {key,index:index+1,items,count:items.length,avg:moods.length?moods.reduce((a,b)=>a+b,0)/moods.length:null};
  }),[entries,year]);
  const monthWeeks = useMemo(() => month ? groups.filter((group)=>group.stars.some((item)=>!item.empty&&item.date?.startsWith(month))) : [],[groups,month]);
  const populatedMonths=useMemo(()=>months.filter((item)=>item.count>0).map((item)=>({monthKey:item.key,entries:item.items,n:item.count,avgMood:item.avg})),[months]);
  const weeksByMonth=useMemo(()=>Object.fromEntries(populatedMonths.map((item)=>[item.monthKey,groups.filter((group)=>group.stars.some((star)=>!star.empty&&star.date?.startsWith(item.monthKey)))])),[populatedMonths,groups]);

  // 기록이 있는 달 전체(연도 넘어서까지) — 상단 화살표로 한 달씩 넘길 때 쓴다.
  const allMonths = useMemo(()=>[...new Set(entries.map((entry)=>entry.date.slice(0,7)))].sort(),[entries]);

  function moveYear(delta) { setYear((value)=>value+delta); setMonth(null); setWeek(null); setStar(null); }
  // 달을 고른 상태면 ‹ ›가 한 달씩(연도 경계도 넘어) 이동, 아니면 연도 이동.
  function step(delta) {
    if (!month) { moveYear(delta); return; }
    const at = allMonths.indexOf(month);
    const next = allMonths[at + delta];
    if (!next) return;
    setMonth(next);
    setYear(Number(next.slice(0, 4)));
    setWeek(null);
    setStar(null);
  }
  const atFirst = month ? allMonths.indexOf(month) <= 0 : false;
  const atLast = month ? allMonths.indexOf(month) >= allMonths.length - 1 : false;

  return <section className="mt-5 rounded-[24px] border border-white/[.08] bg-[#0B1322] p-4 lg:p-5">
    <div className="flex items-center justify-between gap-3"><div><p className="text-[10px] tracking-[.15em] text-[#9F85DD]">CONSTELLATION ARCHIVE</p><h2 className="mt-1 text-[17px] font-bold">나의 기록 별자리</h2></div><div className="flex items-center gap-1"><button onClick={()=>step(-1)} disabled={atFirst} className="tap flex h-9 w-9 items-center justify-center rounded-full border border-white/10 disabled:opacity-25" aria-label={month?"이전 달":"이전 해"}><ChevronLeft size={16}/></button><div className="min-w-[104px] text-center"><span className="text-[13px] font-bold">{year}년{month?` ${Number(month.slice(5))}월`:""}</span>{month&&<span className="block text-[9px] text-[#8B6CCF]">{zodiacOf(Number(month.slice(5))).ko}</span>}</div><button onClick={()=>step(1)} disabled={atLast} className="tap flex h-9 w-9 items-center justify-center rounded-full border border-white/10 disabled:opacity-25" aria-label={month?"다음 달":"다음 해"}><ChevronRight size={16}/></button></div></div>
    {/* 월 선택 — 성단을 정확히 누르지 않아도 달을 고를 수 있게(리포트까지 닿는 길). */}
    <div className="mt-3 flex flex-wrap gap-1">
      {months.map((item)=>{
        const on=month===item.key, has=item.count>0;
        return <button key={item.key} disabled={!has} onClick={()=>{setMonth(on?null:item.key);setWeek(null);setStar(null);}}
          className={`tap rounded-full border px-2.5 py-1 text-[10px] transition-colors ${on?"border-[#8B6CCF] bg-[#8B6CCF]/20 text-[#C7B5F2]":has?"border-white/10 text-sub hover:border-[#8B6CCF]/50":"border-white/5 text-mut opacity-40"}`}>
          {item.index}월 <span className="text-[8px] text-mut">{zodiacOf(item.index).ko}</span>
        </button>;
      })}
    </div>
    <p className="mt-2.5 text-[10px] leading-relaxed text-mut">달마다 그 달의 별자리(황도 12궁) 모양으로 기록이 모입니다. 달을 고르면 같은 별들이 그달의 주간 별자리로 펼쳐집니다.</p>
    <div className="mt-4"><JyConstellationArchive monthGroups={populatedMonths} weeksByMonth={weeksByMonth} focusMonth={month} onMonthPick={(key)=>{setMonth(key);setWeek(null);setStar(null);}} onWeekOpen={(group)=>{setWeek(group);setStar(null);}}/></div>
    {month && <>
      <div className="mt-4 flex items-center justify-between rounded-xl border border-[#8B6CCF]/20 bg-[#8B6CCF]/[.07] px-3 py-2.5"><div><b className="text-[12px] text-[#C7B5F2]">{Number(month.slice(5))}월 · {zodiacOf(Number(month.slice(5))).ko}</b><p className="mt-0.5 text-[9px] text-mut">{months.find((item)=>item.key===month)?.count || 0}일 기록</p></div><button onClick={()=>{setMonth(null);setWeek(null);setStar(null);}} className="tap text-[10px] text-sub">12개월 보기</button></div>
      {/* 주 선택 — 별을 정확히 못 눌러도 주간 별자리·리포트로 갈 수 있게. */}
      {monthWeeks.length>0&&<div className="mt-2 flex flex-wrap gap-1">
        {monthWeeks.map((group)=>{
          const on=week?.weekStart===group.weekStart, days=group.stars.filter((item)=>!item.empty).length;
          return <button key={group.weekStart} onClick={()=>{setWeek(on?null:group);setStar(null);}}
            className={`tap rounded-lg border px-2 py-1 text-[10px] transition-colors ${on?"border-[#8B6CCF] bg-[#8B6CCF]/20 text-[#C7B5F2]":"border-white/10 text-sub hover:border-[#8B6CCF]/50"}`}>
            {shortDate(group.weekStart)}~ <span className="text-[8px] text-mut">{days}일</span>
          </button>;
        })}
      </div>}
      {week&&<div className="mt-3 rounded-[18px] border border-white/[.07] bg-black/15 p-4"><div className="flex items-center justify-between"><div><p className="text-[9px] text-[#A88BE8]">WEEK CONSTELLATION</p><b className="text-[12px]">별을 눌러 그날의 기록 보기</b></div><button onClick={()=>setReport(week)} className="tap rounded-full bg-[#8B6CCF] px-3 py-1.5 text-[10px] font-bold">주간 리포트</button></div><div className="mx-auto mt-2 max-w-[330px]"><Constellation size={230} stars={week.stars} todayDate={todayKey()} selectedDate={star?.date} onSelect={setStar}/></div>{star&&<div className="mt-3 rounded-xl bg-white/[.035] p-3"><div className="flex justify-between text-[10px]"><b>{star.date}</b><span className="text-[#BBA4ED]">기분 {star.mood || "-"}/5</span></div><p className="mt-2 text-[11px] leading-relaxed text-sub">{star.text||star.note||"간단한 체크인만 남긴 날입니다."}</p></div>}</div>}
    </>}
    {report&&<WeeklyReport group={report} onClose={()=>setReport(null)}/>} 
  </section>;
}

function MonthCluster({item,onClick}) {
  const dots=Math.min(15,Math.max(5,item.count));
  return <button disabled={!item.count} onClick={onClick} className="tap w-full text-center disabled:opacity-25"><svg viewBox="0 0 100 72" className="h-[58px] w-full overflow-visible">{Array.from({length:dots},(_,i)=>{const angle=i*2.399;const radius=7+Math.sqrt(i)*7;const x=50+Math.cos(angle)*radius,y=36+Math.sin(angle)*radius*.68;const warm=item.avg!=null&&item.avg<3;return <g key={i}><circle cx={x} cy={y} r={8} fill={warm?"#D7774F":"#62CDBC"} opacity=".09"/><circle cx={x} cy={y} r={item.count>15?3.8:3} fill={warm?"#F0A45E":"#A6E2D8"} opacity={.68+(i/dots)*.28}/></g>;})}</svg><div className="-mt-1 text-[10px] font-semibold text-sub">{item.index}월 <span className="text-[8px] text-mut">{item.count}일</span></div></button>;
}

function WeeklyReport({group,onClose}) {
  const stars=group.stars.filter((item)=>!item.empty),moods=stars.map((item)=>item.mood).filter(Boolean);
  const avg=moods.length?(moods.reduce((a,b)=>a+b,0)/moods.length).toFixed(1):"-";
  const keywords=[...new Set(stars.map((item)=>item.keyword||item.emotion).filter(Boolean))].slice(0,5);
  return <div className="fixed inset-0 z-[100] flex items-end justify-center bg-[#02040B]/75 p-4 backdrop-blur-sm md:items-center" onClick={onClose}><div className="w-full max-w-[680px] rounded-[24px] border border-white/10 bg-[#0C1424] p-5" onClick={(event)=>event.stopPropagation()}><div className="flex justify-between"><div><p className="text-[10px] text-[#A88BE8]">WEEKLY REPORT</p><h3 className="mt-1 text-[18px] font-bold">{group.weekStart} — {group.weekEnd}</h3></div><button onClick={onClose} className="tap flex h-9 w-9 items-center justify-center rounded-full"><X size={18}/></button></div><div className="mt-5 grid grid-cols-3 gap-2">{[["기록",`${stars.length}/7일`],["평균 기분",avg],["반복 키워드",keywords.length]].map(([label,value])=><div key={label} className="rounded-xl bg-white/[.04] p-3 text-center"><b className="text-[18px] text-[#BBA4ED]">{value}</b><p className="mt-1 text-[9px] text-mut">{label}</p></div>)}</div><div className="mt-4 rounded-xl border border-white/[.06] bg-black/15 p-4"><p className="text-[10px] font-bold text-sub">이번 주 요약</p><p className="mt-2 text-[12px] leading-relaxed text-sub">{stars.length?`${stars.length}일의 기록에서 평균 기분은 ${avg}점이었어요.${keywords.length?` 반복된 키워드는 ${keywords.join(", ")}입니다.`:""}`:"이 주에는 기록이 없습니다."}</p></div></div></div>;
}

function shortDate(value) { const parts=String(value||"").split("-"); return parts.length===3?`${Number(parts[1])}.${Number(parts[2])}`:value; }
