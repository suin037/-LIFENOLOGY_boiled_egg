import { useMemo } from "react";
import { zodiacOf, zodiacPoints, zodiacLines, zodiacGhost } from "../data/zodiac.js";

const COL=["#E24B4A","#D85A30","#EDA100","#5DCAA5","#378ADD"];
const PASTEL=["#F0A3A2","#F2B48E","#F7DCA0","#AEE6CF","#A8CDF5"];
const CALM="#FFFFFF";   // 평소 별빛 — 흰색. 기분 색은 '자세히 보기'에서만 드러난다.
// 캘린더는 모달(최대 820px)이라 넓게 써도 된다. 별자리끼리 겹치지 않게 간격을 벌렸다.
const W=470,H=300,CX=W/2,CY=H/2,ZOOM_MONTH=2.2,MINI_R_MIN=16,MINI_R_SPREAD=60;
const ZR=16;   // 별자리 반지름 — 간격(STEP)보다 작아야 이웃과 안 겹친다
const STEP=38, RIGHT=430;
const rng=(n)=>{const x=Math.sin(n*12.9898+78.233)*43758.5453;return x-Math.floor(x);};
const level=(s)=>s.mood!=null?Math.max(1,Math.min(5,Math.round(s.mood))):s.valence!=null?Math.max(1,Math.min(5,Math.round(s.valence*2+3))):3;
function miniCoord(day,lvl,scale){const r=(MINI_R_MIN+((lvl-1)/4)*MINI_R_SPREAD)*scale,a=(-90+day*(360/7))*Math.PI/180;return [r*Math.cos(a),r*Math.sin(a)];}

export default function JyConstellationArchive({monthGroups,weeksByMonth,focusMonth,onMonthPick,onWeekOpen}) {
  const months=useMemo(()=>{
    const now=new Date().toISOString().slice(0,7),n=monthGroups.length;
    return monthGroups.map((m,i)=>{
      const num=parseInt(m.monthKey.slice(5),10);
      const cx=RIGHT-(n-1-i)*STEP+(rng(num*3+1)-.5)*6;
      // 위아래로도 벌려 이웃 별자리와 겹치지 않게(윗줄·아랫줄이 번갈아 오도록).
      const cy=Math.max(96,Math.min(204,CY+Math.sin(i*.9+.4)*44+(rng(num*3+2)-.5)*10));
      const weeks=(weeksByMonth[m.monthKey]||[]).slice(0,6),count=weeks.length||1,stars=[],weekMeta=[];let k=0;
      // 그 달의 대표 별자리(황도 12궁) 자리표 — 기록이 이 꼭짓점부터 채워진다.
      const filledN=(weeksByMonth[m.monthKey]||[]).reduce((sum,g)=>sum+g.stars.filter((s)=>!s.empty&&(s.mood!=null||s.valence!=null)).length,0);
      const zPts=zodiacPoints(num,filledN,ZR);
      weeks.forEach((g,wi)=>{
        const a=(-90+wi*(360/count))*Math.PI/180,dist=count>1?34:0,wx=cx+dist*Math.cos(a),wy=cy+dist*Math.sin(a)*.9,verts=[];
        g.stars.forEach((s,di)=>{
          const filled=!s.empty&&(s.mood!=null||s.valence!=null),lvl=filled?level(s):1,[mx,my]=miniCoord(di,lvl,.155),vx=wx+mx,vy=wy+my;
          verts.push({x:vx,y:vy,filled}); if(!filled)return;
          const zp=zPts[k]||[0,0];
          stars.push({key:s.date,blobX:cx+zp[0],blobY:cy+zp[1],zoomX:vx,zoomY:vy,c:COL[lvl-1],p:PASTEL[lvl-1],r:1+lvl*.16});k++;
        });
        weekMeta.push({g,wx,wy,verts});
      });
      return {m,num,cx,cy,stars,weekMeta,count:k,zodiac:zodiacOf(num),
              zLines:zodiacLines(num,k,ZR),ghost:zodiacGhost(num,ZR),
              isNow:m.monthKey===now,labelUp:i%2===0};
    });
  },[monthGroups,weeksByMonth]);
  const focused=focusMonth?months.find((item)=>item.m.monthKey===focusMonth):null;
  const cam=focused?`translate(${CX-ZOOM_MONTH*focused.cx}px,${CY-ZOOM_MONTH*focused.cy}px) scale(${ZOOM_MONTH})`:"translate(0px,0px) scale(1)";
  return <div className="overflow-hidden rounded-[22px] border border-white/[.05] bg-[#071121]"><svg viewBox={`0 0 ${W} ${H}`} className="block w-full select-none">
    <defs><radialGradient id="jy-core"><stop offset="0" stopColor="#8B6CCF" stopOpacity=".3"/><stop offset="1" stopColor="#071121" stopOpacity="0"/></radialGradient></defs>
    <rect width={W} height={H} fill="#071121"/><circle cx={CX} cy={CY} r="105" fill="url(#jy-core)"/>
    {Array.from({length:34},(_,i)=><circle key={i} cx={(i*73)%W} cy={(i*47)%H} r={i%7===0?1:.55} fill="#CAD5EA" opacity={.22+(i%4)*.1}/>) }
    <g style={{transform:cam,transformOrigin:"0 0",transition:"transform .75s cubic-bezier(.2,.85,.25,1)"}}>
      {months.length>1&&<polyline points={months.map((m)=>`${m.cx},${m.cy}`).join(" ")} fill="none" stroke="#8B6CCF" strokeWidth=".7" strokeOpacity=".12"/>}
      {months.map((mo)=>{const active=focusMonth===mo.m.monthKey,dim=focusMonth&&!active?.1:1;return <g key={mo.m.monthKey} opacity={dim} style={{transition:"opacity .5s"}}>
        {active&&mo.weekMeta.map((wk)=><g key={wk.g.weekStart} onClick={()=>onWeekOpen(wk.g)} style={{cursor:"pointer",opacity:1,transition:"opacity .5s .45s"}}>{wk.verts.map((v,i)=>{const q=wk.verts[(i+1)%wk.verts.length],solid=v.filled&&q.filled;return <line key={i} x1={v.x} y1={v.y} x2={q.x} y2={q.y} stroke="#9FB0CE" strokeWidth={solid?.35:.28} strokeOpacity={solid?.42:.13} strokeDasharray={solid?undefined:".8 1.4"}/>})}{wk.verts.filter((v)=>!v.filled).map((v,i)=><circle key={`e${i}`} cx={v.x} cy={v.y} r=".7" fill="none" stroke="#39435F" strokeWidth=".3" strokeDasharray=".5 .7" opacity=".6"/>)}<text x={wk.wx} y={wk.wy+14.5} textAnchor="middle" fill="#8895AF" fontSize="4.6">{short(wk.g.weekStart)}~ · {wk.g.stars.filter((s)=>!s.empty).length}일</text><circle cx={wk.wx} cy={wk.wy} r="13" fill="transparent"/></g>)}
        {/* 별자리 밑그림 — 기록이 없어도 그 달의 별자리 형태가 아주 연하게 깔린다.
            내 기록은 이 자리 위에서 하나씩 밝아진다(밑그림=별자리, 밝은 별=내 기록). */}
        {!active&&<g pointerEvents="none">
          {mo.ghost.lines.map((ln,li)=><line key={`gl${li}`} x1={mo.cx+ln[0]} y1={mo.cy+ln[1]} x2={mo.cx+ln[2]} y2={mo.cy+ln[3]} stroke="#8B6CCF" strokeWidth=".5" strokeOpacity=".13"/>)}
          {mo.ghost.dots.map((p,pi)=><circle key={`gd${pi}`} cx={mo.cx+p[0]} cy={mo.cy+p[1]} r=".9" fill="#9FB0CE" opacity=".2"/>)}
        </g>}
        {!active&&mo.zLines.map((ln,li)=><line key={`z${li}`} x1={mo.cx+ln[0]} y1={mo.cy+ln[1]} x2={mo.cx+ln[2]} y2={mo.cy+ln[3]} stroke="#9FB0CE" strokeWidth=".4" strokeOpacity=".38" style={{transition:"opacity .4s"}}/>)}
        {/* 평소엔 별을 연보라 하나로 — 12달이 한눈에 차분히 보인다.
            달을 눌러 자세히 볼 때만 그날 기분 색으로 갈라진다(색이 의미를 갖는 순간). */}
        {mo.stars.map((s)=><g key={s.key} style={{transform:active?`translate(${s.zoomX}px,${s.zoomY}px)`:`translate(${s.blobX}px,${s.blobY}px)`,transition:"transform .8s cubic-bezier(.25,.9,.3,1)"}}><circle r={s.r+1.6} fill={active?s.c:CALM} opacity=".2" style={{transition:"fill .5s"}}/><circle r={s.r} fill={active?s.c:CALM} style={{transition:"fill .5s"}}/><circle r={s.r*.45} fill="#fff" opacity={active?0:.8} style={{transition:"opacity .5s"}}/></g>)}
        {!active&&<g onClick={()=>onMonthPick(mo.m.monthKey)} style={{cursor:"pointer"}}>
          {mo.isNow&&<circle cx={mo.cx} cy={mo.cy} r={ZR+5} fill="none" stroke="#A8CDF5" strokeOpacity=".55"/>}
          <circle cx={mo.cx} cy={mo.cy} r={ZR+4} fill="transparent"/>
          <text x={mo.cx} y={mo.cy+(mo.labelUp?-ZR-8:ZR+13)} textAnchor="middle" fill="#9FB0CE" fontSize="7">{mo.num}월</text>
          <text x={mo.cx} y={mo.cy+(mo.labelUp?-ZR-1.5:ZR+20)} textAnchor="middle" fill="#8B6CCF" fontSize="5.4">{mo.zodiac.ko}</text>
        </g>}
      </g>})}
    </g>
    {/* 연·월 제목은 SVG 밖(HTML)에서 넘김 버튼과 함께 그린다 — 크기 조절과 겹침 관리가 쉽다. */}
    {focused&&<g pointerEvents="none">
      <text x={CX} y="24" textAnchor="middle" fill="#9FB0CE" fontSize="6">주간 별자리를 눌러 기록을 확인하세요</text>
      {/* 색이 드러나는 순간에만 그 뜻을 함께 — 색 = 그날 기분. */}
      <text x={CX-46} y="38" textAnchor="end" fill="#7A8AA8" fontSize="5.4">힘듦</text>
      {COL.map((c,i)=><circle key={c} cx={CX-38+i*10} cy="36" r="2.6" fill={c}/>)}
      <text x={CX+46} y="38" textAnchor="start" fill="#7A8AA8" fontSize="5.4">좋음</text>
    </g>}
  </svg></div>;
}
function short(value){const [,m,d]=String(value||"").split("-");return m&&d?`${Number(m)}.${Number(d)}`:value;}
