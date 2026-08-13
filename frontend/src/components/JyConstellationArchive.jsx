import { useMemo } from "react";

const COL=["#E24B4A","#D85A30","#EDA100","#5DCAA5","#378ADD"];
const PASTEL=["#F0A3A2","#F2B48E","#F7DCA0","#AEE6CF","#A8CDF5"];
const W=330,H=306,CX=W/2,CY=H/2,ZOOM_MONTH=2.2,MINI_R_MIN=16,MINI_R_SPREAD=60;
const rng=(n)=>{const x=Math.sin(n*12.9898+78.233)*43758.5453;return x-Math.floor(x);};
const level=(s)=>s.mood!=null?Math.max(1,Math.min(5,Math.round(s.mood))):s.valence!=null?Math.max(1,Math.min(5,Math.round(s.valence*2+3))):3;
function miniCoord(day,lvl,scale){const r=(MINI_R_MIN+((lvl-1)/4)*MINI_R_SPREAD)*scale,a=(-90+day*(360/7))*Math.PI/180;return [r*Math.cos(a),r*Math.sin(a)];}

export default function JyConstellationArchive({monthGroups,weeksByMonth,focusMonth,onMonthPick,onWeekOpen}) {
  const months=useMemo(()=>{
    const now=new Date().toISOString().slice(0,7),n=monthGroups.length,step=22,right=286;
    return monthGroups.map((m,i)=>{
      const num=parseInt(m.monthKey.slice(5),10);
      const cx=right-(n-1-i)*step+(rng(num*3+1)-.5)*10;
      const cy=Math.max(118,Math.min(186,CY+Math.sin(i*.55+.4)*30+(rng(num*3+2)-.5)*22));
      const weeks=(weeksByMonth[m.monthKey]||[]).slice(0,6),count=weeks.length||1,stars=[],weekMeta=[];let k=0;
      weeks.forEach((g,wi)=>{
        const a=(-90+wi*(360/count))*Math.PI/180,dist=count>1?34:0,wx=cx+dist*Math.cos(a),wy=cy+dist*Math.sin(a)*.9,verts=[];
        g.stars.forEach((s,di)=>{
          const filled=!s.empty&&(s.mood!=null||s.valence!=null),lvl=filled?level(s):1,[mx,my]=miniCoord(di,lvl,.155),vx=wx+mx,vy=wy+my;
          verts.push({x:vx,y:vy,filled}); if(!filled)return;
          const br=1.15*Math.sqrt(k+.6),ba=k*2.39996+i*1.7;
          stars.push({key:s.date,blobX:cx+br*Math.cos(ba),blobY:cy+br*Math.sin(ba)*.85,zoomX:vx,zoomY:vy,c:COL[lvl-1],p:PASTEL[lvl-1],r:1+lvl*.16});k++;
        });
        weekMeta.push({g,wx,wy,verts});
      });
      return {m,num,cx,cy,stars,weekMeta,count:k,isNow:m.monthKey===now,labelUp:i%2===0};
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
        {mo.stars.map((s)=><g key={s.key} style={{transform:active?`translate(${s.zoomX}px,${s.zoomY}px)`:`translate(${s.blobX}px,${s.blobY}px)`,transition:"transform .8s cubic-bezier(.25,.9,.3,1)"}}><circle r={s.r+1.6} fill={active?s.c:s.p} opacity=".2" style={{transition:"fill .5s"}}/><circle r={s.r} fill={active?s.c:s.p} style={{transition:"fill .5s"}}/><circle r={s.r*.45} fill="#fff" opacity={active?0:.8} style={{transition:"opacity .5s"}}/></g>)}
        {!active&&<g onClick={()=>onMonthPick(mo.m.monthKey)} style={{cursor:"pointer"}}><circle cx={mo.cx} cy={mo.cy} r={mo.isNow?12:9} fill="none" stroke={mo.isNow?"#A8CDF5":"#8B6CCF"} strokeOpacity={mo.isNow?.7:.16}/><circle cx={mo.cx} cy={mo.cy} r="15" fill="transparent"/><text x={mo.cx} y={mo.cy+(mo.labelUp?-14:18)} textAnchor="middle" fill="#9FB0CE" fontSize="6.5">{mo.num}월</text></g>}
      </g>})}
    </g>
    {focused&&<g pointerEvents="none"><text x={CX} y="32" textAnchor="middle" fill="#EDF1FF" fontSize="16" fontWeight="700">{focused.m.monthKey.slice(0,4)}년 {focused.num}월</text><text x={CX} y="45" textAnchor="middle" fill="#9FB0CE" fontSize="6">주간 별자리를 눌러 기록을 확인하세요</text></g>}
  </svg></div>;
}
function short(value){const [,m,d]=String(value||"").split("-");return m&&d?`${Number(m)}.${Number(d)}`:value;}
