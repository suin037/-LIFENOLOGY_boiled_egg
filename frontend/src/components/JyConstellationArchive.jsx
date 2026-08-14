import { useMemo } from "react";
import { zodiacOf, zodiacPoints, zodiacLines } from "../data/zodiac.js";
import { ART_BY_MONTH, ART_VIEWBOX } from "../data/zodiacArt.js";

// 512 좌표계로 그려진 별자리 일러스트를 원하는 위치·크기로 얹는다.
function ZodiacArt({ month, cx, cy, size }) {
  const art = ART_BY_MONTH[month];
  if (!art) return null;
  const k = size / ART_VIEWBOX;
  return (
    <g className="zart" transform={`translate(${cx - size / 2} ${cy - size / 2}) scale(${k})`}
       dangerouslySetInnerHTML={{ __html: art.inner }} />
  );
}

const COL=["#E24B4A","#D85A30","#EDA100","#5DCAA5","#378ADD"];
const PASTEL=["#F0A3A2","#F2B48E","#F7DCA0","#AEE6CF","#A8CDF5"];
// 평소 별빛 — 순백은 너무 쨍해서, 푸른 기 도는 은은한 별빛으로. (Constellation 반짝이와 같은 톤)
const CALM="#CBD8EE";
// 캘린더는 모달(최대 820px)이라 넓게 써도 된다. 별자리끼리 겹치지 않게 간격을 벌렸다.
const W=470,H=300,CX=W/2,CY=H/2,ZOOM_MONTH=2.2,MINI_R_MIN=16,MINI_R_SPREAD=60;
const ZR=16;   // 기록 성단 반지름 — 간격(STEP)보다 작아야 이웃과 안 겹친다
const STEP=35, RIGHT=430;   // 12달 × 별자리 폭(64)이 좌우로 잘리지 않는 값
const ART_OFFSET=56;   // 별자리를 띠에서 위·아래로 띄우는 거리(기록 성단과 24px 벌어진다)
const rng=(n)=>{const x=Math.sin(n*12.9898+78.233)*43758.5453;return x-Math.floor(x);};

// 별 하나씩 따로 반짝이게 하는 규칙. 11칸(소수)으로 나눠 그림마다 배분이 어긋나게 하고,
// 칸마다 서로 안 맞아떨어지는 주기·시작 시각을 준다 → 같이 깜박이는 티가 안 난다.
const ZART_TWINKLE = (() => {
  const rules = [];
  for (let i = 0; i < 11; i += 1) {
    if (i % 11 >= 7) continue;                 // 11칸 중 7칸만 — 나머지는 가만히 있는 별
    const dur = (2.3 + rng(i * 5 + 1) * 2.8).toFixed(2);
    const delay = (rng(i * 9 + 4) * 4.2).toFixed(2);
    const dip = (0.22 + rng(i * 3 + 7) * 0.34).toFixed(2);   // 얼마나 어두워지는지도 다르게
    rules.push(
      `.zart circle:nth-child(11n+${i + 1}){animation:zart-tw ${dur}s ease-in-out ${delay}s infinite;--dip:${dip}}`,
    );
  }
  return `@keyframes zart-tw{0%,100%{opacity:1}50%{opacity:var(--dip,.35)}}\n${rules.join("\n")}\n`
    + `@media (prefers-reduced-motion:reduce){.zart circle{animation:none}}`;
})();
const level=(s)=>s.mood!=null?Math.max(1,Math.min(5,Math.round(s.mood))):s.valence!=null?Math.max(1,Math.min(5,Math.round(s.valence*2+3))):3;
function miniCoord(day,lvl,scale){const r=(MINI_R_MIN+((lvl-1)/4)*MINI_R_SPREAD)*scale,a=(-90+day*(360/7))*Math.PI/180;return [r*Math.cos(a),r*Math.sin(a)];}

export default function JyConstellationArchive({monthGroups,weeksByMonth,focusMonth,onMonthPick,onWeekOpen}) {
  const months=useMemo(()=>{
    const now=new Date().toISOString().slice(0,7),n=monthGroups.length;
    return monthGroups.map((m,i)=>{
      const num=parseInt(m.monthKey.slice(5),10);
      const cx=RIGHT-(n-1-i)*STEP+(rng(num*3+1)-.5)*6;
      // 띠는 거의 수평으로 둔다 — 별자리를 위·아래로 번갈아 붙이는 리듬이 흐트러지지 않게.
      const cy=Math.max(126,Math.min(174,CY+Math.sin(i*.9+.4)*14+(rng(num*3+2)-.5)*8));
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
          // 별처럼 보이게 — 밝기·반짝임 주기를 조금씩 다르게(같은 날이면 항상 같은 값).
          const seed=rng(k*7+i*13);
          stars.push({key:s.date,blobX:cx+zp[0],blobY:cy+zp[1],zoomX:vx,zoomY:vy,
                      c:COL[lvl-1],p:PASTEL[lvl-1],r:1+lvl*.16,
                      glint:seed>.72,                       // 일부만 4갈래 빛
                      twinkle:seed<.34,                     // 반짝임도 일부만(성능)
                      tw:(2.6+seed*2.4).toFixed(2),         // 반짝임 주기(초)
                      delay:(seed*3).toFixed(2)});k++;
        });
        weekMeta.push({g,wx,wy,verts});
      });
      return {m,num,cx,cy,stars,weekMeta,count:k,zodiac:zodiacOf(num),
              zLines:zodiacLines(num,k,ZR),
              isNow:m.monthKey===now,labelUp:i%2===0};
    });
  },[monthGroups,weeksByMonth]);
  const focused=focusMonth?months.find((item)=>item.m.monthKey===focusMonth):null;
  const cam=focused?`translate(${CX-ZOOM_MONTH*focused.cx}px,${CY-ZOOM_MONTH*focused.cy}px) scale(${ZOOM_MONTH})`:"translate(0px,0px) scale(1)";
  return <div className="overflow-hidden rounded-[22px] border border-white/[.05] bg-[#071121]"><svg viewBox={`0 0 ${W} ${H}`} className="block w-full select-none">
    <defs><radialGradient id="jy-core"><stop offset="0" stopColor="#8B6CCF" stopOpacity=".3"/><stop offset="1" stopColor="#071121" stopOpacity="0"/></radialGradient></defs>
    {/* 12별자리 그림 속 별 반짝임.
        별자리 통째로 밝아지면 '그림이 켜졌다 꺼졌다' 하는 느낌이라, 별 하나씩
        따로 반짝이게 한다. 주기와 시작 시각이 같으면 다 같이 깜박여 티가 나므로
        11칸으로 나눠 서로 안 맞아떨어지는 주기(2.3~5.1초)와 시작 시각을 준다.
        별이 318개라 전부 돌리면 무거워서, 11칸 중 7칸만 켠다. */}
    <style>{ZART_TWINKLE}</style>
    <rect width={W} height={H} fill="#071121"/><circle cx={CX} cy={CY} r="105" fill="url(#jy-core)"/>
    {Array.from({length:34},(_,i)=><circle key={i} cx={(i*73)%W} cy={(i*47)%H} r={i%7===0?1:.55} fill="#CAD5EA" opacity={.22+(i%4)*.1}/>) }
    <g style={{transform:cam,transformOrigin:"0 0",transition:"transform .75s cubic-bezier(.2,.85,.25,1)"}}>
      {months.length>1&&<polyline points={months.map((m)=>`${m.cx},${m.cy}`).join(" ")} fill="none" stroke="#8B6CCF" strokeWidth=".7" strokeOpacity=".12"/>}
      {months.map((mo)=>{const active=focusMonth===mo.m.monthKey,dim=focusMonth&&!active?.1:1;return <g key={mo.m.monthKey} opacity={dim} style={{transition:"opacity .5s"}}>
        {active&&mo.weekMeta.map((wk)=><g key={wk.g.weekStart} onClick={()=>onWeekOpen(wk.g)} style={{cursor:"pointer",opacity:1,transition:"opacity .5s .45s"}}>{wk.verts.map((v,i)=>{const q=wk.verts[(i+1)%wk.verts.length],solid=v.filled&&q.filled;return <line key={i} x1={v.x} y1={v.y} x2={q.x} y2={q.y} stroke="#9FB0CE" strokeWidth={solid?.35:.28} strokeOpacity={solid?.42:.13} strokeDasharray={solid?undefined:".8 1.4"}/>})}{wk.verts.filter((v)=>!v.filled).map((v,i)=><circle key={`e${i}`} cx={v.x} cy={v.y} r=".7" fill="none" stroke="#39435F" strokeWidth=".3" strokeDasharray=".5 .7" opacity=".6"/>)}<text x={wk.wx} y={wk.wy+14.5} textAnchor="middle" fill="#8895AF" fontSize="4.6">{short(wk.g.weekStart)}~ · {wk.g.stars.filter((s)=>!s.empty).length}일</text><circle cx={wk.wx} cy={wk.wy} r="13" fill="transparent"/></g>)}
        {/* 별자리 밑그림 — 기록이 없어도 그 달의 별자리 형태가 아주 연하게 깔린다.
            내 기록은 이 자리 위에서 하나씩 밝아진다(밑그림=별자리, 밝은 별=내 기록). */}
        {/* 그 달의 별자리 — 띠 위·아래로 번갈아 놓는다(뒤에 깔지 않는다).
            기록이 쌓일수록 그 별자리가 밝아지고 빛무리가 번진다: 기록이 별자리를 켠다. */}
        {/* 밝기 — 기록 없는 달도 형태는 알아볼 만큼 두고(.22), 기록이 쌓이면 확실히 켜진다(1).
            불투명도만으로는 선이 얇아 잘 안 보여서 brightness 로 선·별 자체를 밝히고,
            빛무리(drop-shadow)도 두 겹으로 겹쳐 번지게 한다. */}
        {!active&&<g pointerEvents="none"
           opacity={mo.count>0 ? Math.min(1, .55+Math.min(1,mo.count/18)*.45) : .22}
           style={{filter: mo.count>0
             ? `drop-shadow(0 0 ${(2+Math.min(1,mo.count/18)*4).toFixed(1)}px rgba(180,158,246,${(.38+Math.min(1,mo.count/18)*.5).toFixed(2)}))`
               + ` drop-shadow(0 0 ${(6+Math.min(1,mo.count/18)*8).toFixed(1)}px rgba(140,120,220,.3))`
               + ` brightness(${(1.15+Math.min(1,mo.count/18)*.45).toFixed(2)})`
             : "brightness(1.1)"}}>
          <ZodiacArt month={mo.num} cx={mo.cx} cy={mo.cy+(mo.labelUp?-ART_OFFSET:ART_OFFSET)} size={ZR*4}/>
        </g>}
        {!active&&mo.zLines.map((ln,li)=><line key={`z${li}`} x1={mo.cx+ln[0]} y1={mo.cy+ln[1]} x2={mo.cx+ln[2]} y2={mo.cy+ln[3]} stroke="#9FB0CE" strokeWidth=".4" strokeOpacity=".38" style={{transition:"opacity .4s"}}/>)}
        {/* 평소엔 별을 연보라 하나로 — 12달이 한눈에 차분히 보인다.
            달을 눌러 자세히 볼 때만 그날 기분 색으로 갈라진다(색이 의미를 갖는 순간). */}
        {mo.stars.map((s)=>(
          <g key={s.key}
             style={{transform:active?`translate(${s.zoomX}px,${s.zoomY}px)`:`translate(${s.blobX}px,${s.blobY}px)`,
                     transition:"transform .8s cubic-bezier(.25,.9,.3,1)"}}>
            {/* 번짐 → 4갈래 빛 → 알맹이 → 심지. 겹쳐야 별처럼 보인다. */}
            <circle r={s.r+2.2} fill={active?s.c:CALM} opacity=".14" style={{transition:"fill .5s"}}/>
            {!active&&s.glint&&(
              <g stroke={CALM} strokeWidth=".28" strokeLinecap="round" opacity=".5">
                <line x1={-s.r*2.6} y1="0" x2={s.r*2.6} y2="0"/>
                <line x1="0" y1={-s.r*2.6} x2="0" y2={s.r*2.6}/>
              </g>
            )}
            {/* 반짝임은 일부만 — 1년치(별 100개↑)에서 전부 SMIL 을 돌리면 스크롤이 끊긴다.
                띄엄띄엄 깜박여도 하늘은 충분히 살아 보인다. */}
            <circle r={s.r} fill={active?s.c:CALM} style={{transition:"fill .5s"}}>
              {!active&&s.twinkle&&<animate attributeName="opacity" values="1;.62;1"
                                 dur={`${s.tw}s`} begin={`${s.delay}s`} repeatCount="indefinite"/>}
            </circle>
            <circle r={s.r*.42} fill="#fff" opacity={active?0:.6} style={{transition:"opacity .5s"}}/>
          </g>
        ))}
        {/* 기록 없는 달은 눌러도 펼칠 게 없다 — 커서·색으로 구분한다. */}
        {!active&&<g onClick={()=>{ if(mo.count>0) onMonthPick(mo.m.monthKey); }}
                     style={{cursor:mo.count>0?"pointer":"default"}} opacity={mo.count>0?1:.45}>
          {mo.isNow&&<circle cx={mo.cx} cy={mo.cy} r={ZR+5} fill="none" stroke="#A8CDF5" strokeOpacity=".55"/>}
          <circle cx={mo.cx} cy={mo.cy} r={ZR+4} fill="transparent"/>
          {/* 별자리 쪽을 눌러도 그 달이 열리게 — 그림이 곧 그 달의 표식이다. */}
          <circle cx={mo.cx} cy={mo.cy+(mo.labelUp?-ART_OFFSET:ART_OFFSET)} r={ZR*1.9} fill="transparent"/>
          {/* 글자는 별자리 반대쪽에 둔다 — 그림과 겹치지 않게. */}
          <text x={mo.cx} y={mo.cy+(mo.labelUp?ZR+13:-ZR-8)} textAnchor="middle" fill="#9FB0CE" fontSize="7">{mo.num}월</text>
          <text x={mo.cx} y={mo.cy+(mo.labelUp?ZR+20:-ZR-1.5)} textAnchor="middle" fill="#8B6CCF" fontSize="5.4">{mo.zodiac.ko}</text>
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
