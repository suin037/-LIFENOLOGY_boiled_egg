import { useMemo, useRef, useState } from "react";

// 우주 지도 — 은하(시간)와 행성(영역)을 한 캔버스에, 카메라 줌으로 탐험한다.
//  · 전경: 달마다 그 달 기록들이 꽉 뭉친 성단(얼룩덜룩한 원)으로 은하수 띠를 이룬다.
//  · 달 성단을 누르면 카메라가 날아가고, 뭉쳐있던 별들이 그 달의 '주간 별자리'
//    (Constellation과 같은 극좌표: 요일=각도, 기분=반지름) 모양으로 촥 펼쳐진다.
//  · 행성을 누르면 그 행성으로 줌 — 둘레에 그 영역의 별자리 성단(실제 모양 미니어처).
const COL = ["#E24B4A", "#D85A30", "#EDA100", "#5DCAA5", "#378ADD"]; // 기분 1~5 (Constellation과 동일)
// 전경(멀리서 본 별)용 파스텔 톤 — 줌인하면 원색(COL)으로 또렷해진다.
const PASTEL = ["#F0A3A2", "#F2B48E", "#F7DCA0", "#AEE6CF", "#A8CDF5"];

const W = 330;
const H = 306;
const CX = W / 2;
const CY = H / 2;
const ZOOM_PLANET = 2.5;
const ZOOM_MONTH = 2.2;

// Constellation.jsx 와 같은 극좌표 규칙(요일=각도, 기분=반지름)의 미니어처.
const MINI_R_MIN = 16;
const MINI_R_SPREAD = 60;

function level(s) {
  if (s.mood != null) return Math.max(1, Math.min(5, Math.round(s.mood)));
  if (s.valence != null) return Math.max(1, Math.min(5, Math.round(s.valence * 2 + 3)));
  return 3;
}

export function moodColor(avg) {
  if (avg == null) return "#39435F";
  return COL[Math.max(0, Math.min(4, Math.round(avg) - 1))];
}

// 인덱스 기반 의사난수(0~1) — 렌더마다 같은 배치.
function rng(n) {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

// 실제 별자리(극좌표) 모양의 미니 좌표 — dayIdx=요일칸, lvl=기분레벨.
function miniCoord(dayIdx, lvl, scale) {
  const r = (MINI_R_MIN + ((lvl - 1) / 4) * MINI_R_SPREAD) * scale;
  const a = ((-90 + dayIdx * (360 / 7)) * Math.PI) / 180;
  return [r * Math.cos(a), r * Math.sin(a)];
}

// 행성 자리 — 은하수 띠(가운데)를 피해 비대칭으로 흩어놓은 손배치.
const PLANET_POS = {
  career: { x: 64, y: 54 },
  life: { x: 268, y: 62 },
  relation: { x: 286, y: 236 }, // 우하단 — 오른쪽 끝에 생기는 최신 달과 안 겹치게
  health: { x: 52, y: 222 },
  growth: { x: 172, y: 258 },
};

// 행성 개성 — 고리/위성(기본 스킨). 추후 XP 상점에서 스킨으로 확장할 자리.
export const PLANET_TRAIT = {
  career: { moon: true },
  life: { ring: true },
  relation: { moon: true },
  health: {},
  growth: { ring: true },
};

// 성단(별자리 묶음) 배치 각 — 행성 둘레로 퍼짐.
const CLUSTER_ANGLES = [-150, -85, -20, 45, 110, 175];

// 기울어진 고리의 반쪽 아크 — back=true 위쪽(행성 뒤), false 아래쪽(행성 앞).
function ringArc(p, back) {
  const rx = p.size * 1.6;
  const ry = p.size * 0.55;
  const rot = -18;
  const rad = (rot * Math.PI) / 180;
  const x1 = p.x - rx * Math.cos(rad);
  const y1 = p.y - rx * Math.sin(rad);
  const x2 = p.x + rx * Math.cos(rad);
  const y2 = p.y + rx * Math.sin(rad);
  return `M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${rx.toFixed(1)} ${ry.toFixed(1)} ${rot} 0 ${back ? 1 : 0} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
}

export default function UniverseMap({
  monthGroups,
  weeksByMonth,
  planets,
  maxPlanetN,
  clustersByPlanet,
  scenarioCounts, // {planetKey: 시뮬레이션 수} — 행성 옆 ◆ 뱃지
  focus, // 행성 key | null
  focusMonth, // "YYYY-MM" | null
  skin = "basic", // 행성 스킨(XP 상점): basic=민무늬 | glow=빛나는 구체 | stripe=줄무늬
  onPlanetPick,
  onMonthPick,
  onClusterOpen,
  onWeekOpen,
}) {
  const deco = skin !== "basic"; // 구체 그라데이션·헤일로·고리·위성
  const striped = skin === "stripe";

  // 달 띠 = 타임라인. 최신 달이 항상 오른쪽 끝 — 새 달이 생기면 옛 달들이 왼쪽으로 밀린다.
  // 12개 넘는 옛 달은 화면 왼쪽 밖 → 드래그(슬라이드)로 탐색. 행성은 고정.
  const MONTH_STEP = 22;
  const MONTH_RIGHT_X = 286;
  const [bandOffset, setBandOffset] = useState(0); // 0=최신, 커질수록 과거가 보인다
  const dragRef = useRef({ active: false, x: 0, off: 0, moved: false });

  // 달 성단 — 띠 위 중심 + (전경) 뭉친 별들 / (줌) 주간 별자리로 펼친 별들.
  const months = useMemo(() => {
    const nowMk = new Date().toISOString().slice(0, 7);
    const n = (monthGroups || []).length;
    return (monthGroups || []).map((m, i) => {
      const num = parseInt(m.monthKey.slice(5), 10);
      const cx = MONTH_RIGHT_X - (n - 1 - i) * MONTH_STEP + (rng(num * 3 + 1) - 0.5) * 10;
      // 세로는 행성 코리도(위 4행성/아래 3행성)와 안 겹치게 띠 범위를 묶는다.
      const cy = Math.max(118, Math.min(186, CY + Math.sin(i * 0.55 + 0.4) * 30 + (rng(num * 3 + 2) - 0.5) * 22));

      const weeks = (weeksByMonth?.[m.monthKey] || []).slice(0, 6);
      const nW = weeks.length || 1;
      const stars = [];
      const weekMeta = [];
      let k = 0;
      weeks.forEach((g, wi) => {
        // 줌 시 주간 별자리들이 달 중심 둘레에 원형으로 선다.
        const wa = ((-90 + wi * (360 / nW)) * Math.PI) / 180;
        const wDist = nW > 1 ? 34 : 0;
        const wx = cx + wDist * Math.cos(wa);
        const wy = cy + wDist * Math.sin(wa) * 0.9;
        // 시트(Constellation)와 같은 규칙: 빈 날도 중심 근처(R_MIN) 꼭짓점으로 남긴다 —
        // 그래야 펼쳐진 미니 별자리와 시트에서 열리는 실제 별자리 모양이 일치한다.
        const verts = [];
        g.stars.forEach((s, di) => {
          const filled = !s.empty && (s.mood != null || s.valence != null);
          const lvl = filled ? level(s) : 1; // 빈 날 = norm 0 → R_MIN
          const [mx, my] = miniCoord(di, filled ? lvl : 1, 0.155);
          const vx = wx + mx;
          const vy = wy + my;
          verts.push({ x: vx, y: vy, filled });
          if (!filled) return;
          // 전경: 골든앵글 나선으로 꽉 뭉친 성단.
          const br = 1.15 * Math.sqrt(k + 0.6);
          const ba = k * 2.39996 + i * 1.7;
          stars.push({
            key: `${s.date}`,
            blobX: cx + br * Math.cos(ba),
            blobY: cy + br * Math.sin(ba) * 0.85,
            zoomX: vx,
            zoomY: vy,
            c: COL[lvl - 1],
            p: PASTEL[lvl - 1],
            r: 1 + lvl * 0.16,
          });
          k += 1;
        });
        weekMeta.push({ g, wx, wy, verts });
      });
      return { m, num, cx, cy, stars, weekMeta, count: k, isNow: m.monthKey === nowMk, labelUp: i % 2 === 0 };
    });
  }, [monthGroups, weeksByMonth]);

  const planetPts = useMemo(
    () =>
      (planets || []).map((p) => {
        const n = p.a?.n || 0;
        const pos = PLANET_POS[p.key] || { x: CX, y: CY };
        return {
          ...p,
          n,
          ...pos,
          ...(PLANET_TRAIT[p.key] || {}),
          size: n === 0 ? 12 : 14 + Math.round((n / (maxPlanetN || 1)) * 10),
        };
      }),
    [planets, maxPlanetN],
  );

  const focusedPlanet = focus ? planetPts.find((p) => p.key === focus) : null;
  const focusedMonth = focusMonth ? months.find((mo) => mo.m.monthKey === focusMonth) : null;

  // 카메라 — 포커스 지점이 화면 중심에 오도록 이동+확대. CSS transform이 부드럽게 비행.
  const cam = focusedPlanet
    ? { transform: `translate(${CX - ZOOM_PLANET * focusedPlanet.x}px, ${CY - ZOOM_PLANET * focusedPlanet.y}px) scale(${ZOOM_PLANET})` }
    : focusedMonth
      ? { transform: `translate(${CX - ZOOM_MONTH * (focusedMonth.cx + bandOffset)}px, ${CY - ZOOM_MONTH * focusedMonth.cy}px) scale(${ZOOM_MONTH})` }
      : { transform: "translate(0px, 0px) scale(1)" };

  const anyFocus = !!(focusedPlanet || focusedMonth);

  // 달 띠 슬라이드 — 좌우 드래그로 옛 달 탐색(전경에서만). 5px 넘게 움직이면 탭 무시.
  const maxOffset = Math.max(0, (months.length - 12) * MONTH_STEP);
  function bandDown(e) {
    if (anyFocus || maxOffset === 0) return;
    dragRef.current = { active: true, x: e.clientX, off: bandOffset, moved: false };
  }
  function bandMove(e) {
    const d = dragRef.current;
    if (!d.active) return;
    const dx = e.clientX - d.x;
    if (Math.abs(dx) > 5) d.moved = true;
    setBandOffset(Math.max(0, Math.min(maxOffset, d.off + dx)));
  }
  function bandUp() {
    dragRef.current.active = false;
    setTimeout(() => {
      dragRef.current.moved = false;
    }, 60);
  }

  // 포커스 행성의 성단들 — 실제 별자리(극좌표) 모양 미니어처로 둘레에 선다.
  const clusters = useMemo(() => {
    if (!focusedPlanet) return [];
    const gs = (clustersByPlanet?.[focusedPlanet.key] || []).slice(-CLUSTER_ANGLES.length);
    return gs.map((g, i) => {
      const a = (CLUSTER_ANGLES[i] * Math.PI) / 180;
      const dist = focusedPlanet.size + 26 + (i % 2) * 10;
      const cx = focusedPlanet.x + dist * Math.cos(a);
      const cy = focusedPlanet.y + dist * Math.sin(a);
      const stars = g.stars
        .filter((s) => !s.empty && (s.mood != null || s.valence != null))
        .map((s, di) => {
          const lvl = level(s);
          const [mx, my] = miniCoord(di, lvl, 0.13);
          return { x: cx + mx, y: cy + my, c: COL[lvl - 1], r: 0.8 + lvl * 0.16 };
        });
      return { g, cx, cy, stars };
    });
  }, [focusedPlanet, clustersByPlanet]);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full select-none">
      <defs>
        {planetPts.map((p) => (
          <radialGradient key={p.key} id={`pm-g-${p.key}`} cx="0.35" cy="0.3" r="0.85">
            <stop offset="0%" stopColor={p.to} />
            <stop offset="55%" stopColor={p.from} />
            <stop offset="100%" stopColor={p.from} />
          </radialGradient>
        ))}
        {planetPts.map((p) => (
          <radialGradient key={`h-${p.key}`} id={`pm-h-${p.key}`} cx="0.5" cy="0.5" r="0.5">
            <stop offset="35%" stopColor={p.from} stopOpacity="0.4" />
            <stop offset="100%" stopColor={p.from} stopOpacity="0" />
          </radialGradient>
        ))}
        <radialGradient id="pm-shade" cx="0.68" cy="0.72" r="0.95">
          <stop offset="42%" stopColor="#000000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.5" />
        </radialGradient>
        <radialGradient id="pm-fog" cx="0.4" cy="0.35" r="0.85">
          <stop offset="0%" stopColor="#39435F" />
          <stop offset="100%" stopColor="#1E2740" />
        </radialGradient>
        {/* 줄무늬 스킨용 구체 클립 */}
        {planetPts.map((p) => (
          <clipPath key={`c-${p.key}`} id={`pm-clip-${p.key}`}>
            <circle cx={p.x} cy={p.y} r={p.size} />
          </clipPath>
        ))}
      </defs>

      <g style={{ ...cam, transition: "transform .8s cubic-bezier(.25,.9,.3,1)", transformOrigin: "0 0" }}>
        {/* 달 띠(타임라인) — 좌우 드래그로 옛 달 탐색. 행성은 이 그룹 밖이라 고정. */}
        <g
          transform={`translate(${bandOffset} 0)`}
          onPointerDown={bandDown}
          onPointerMove={bandMove}
          onPointerUp={bandUp}
          onPointerLeave={bandUp}
          style={{ touchAction: "pan-y", cursor: !anyFocus && maxOffset > 0 ? "grab" : "default" }}
        >
        {/* 드래그 캐치 영역(띠 전체) */}
        {!anyFocus && maxOffset > 0 && months.length > 0 && (
          <rect
            x={months[0].cx - 28}
            y={CY - 78}
            width={months[months.length - 1].cx - months[0].cx + 56}
            height={156}
            fill="transparent"
          />
        )}
        {/* 은하수 띠의 실 */}
        {months.length > 1 && (
          <polyline
            points={months.map((mo) => `${mo.cx.toFixed(1)},${mo.cy.toFixed(1)}`).join(" ")}
            fill="none"
            stroke="#5A6B8C"
            strokeOpacity={anyFocus ? 0.04 : 0.16}
            strokeWidth="0.8"
            style={{ transition: "stroke-opacity .5s" }}
          />
        )}

        {/* 달 성단들 */}
        {months.map((mo) => {
          const isFocusM = focusMonth === mo.m.monthKey;
          const dim = (focusedPlanet || (focusedMonth && !isFocusM)) ? 0.1 : 1;
          return (
            <g key={mo.m.monthKey} style={{ opacity: dim, transition: "opacity .5s" }}>
              {/* 줌 시: 주간 별자리 연결선 + 주 라벨 (펼쳐진 뒤에 떠오른다) */}
              {isFocusM &&
                mo.weekMeta.map(({ g, wx, wy, verts }) => (
                  <g key={g.weekStart} style={{ animation: "pm-fade .5s ease .5s both" }}>
                    {/* 별자리 선 — 시트와 동일: 채운 날끼리 실선, 빈 날 지나면 흐린 점선 */}
                    {verts.map((v, vi) => {
                      const q = verts[(vi + 1) % verts.length];
                      if (!q || verts.length < 2) return null;
                      const solid = v.filled && q.filled;
                      return (
                        <line key={vi} x1={v.x} y1={v.y} x2={q.x} y2={q.y}
                          stroke="#9FB0CE" strokeWidth={solid ? 0.35 : 0.28}
                          strokeOpacity={solid ? 0.42 : 0.13}
                          strokeDasharray={solid ? undefined : "0.8 1.4"} />
                      );
                    })}
                    {/* 빈 날 자리 — 점선 동그라미(시트와 동일 문법) */}
                    {verts.filter((v) => !v.filled).map((v, vi) => (
                      <circle key={`e${vi}`} cx={v.x} cy={v.y} r="0.7" fill="none"
                        stroke="#39435F" strokeWidth="0.3" strokeDasharray="0.5 0.7" opacity="0.6" />
                    ))}
                    <text x={wx} y={wy + 14.5} textAnchor="middle" fontSize="4.6" fill="#8895AF">
                      {g.weekStart.slice(5).replace("-", ".")}~ · {g.filled}일
                    </text>
                    <circle cx={wx} cy={wy} r={13} fill="transparent" className="cursor-pointer"
                      onClick={() => onWeekOpen?.(g)} />
                  </g>
                ))}

              {/* 별들 — 전경(뭉침·파스텔) ↔ 줌(별자리 모양·원색) 사이를 이동 */}
              {mo.stars.map((s) => (
                <g
                  key={s.key}
                  style={{
                    transform: isFocusM ? `translate(${s.zoomX}px, ${s.zoomY}px)` : `translate(${s.blobX}px, ${s.blobY}px)`,
                    transition: "transform .8s cubic-bezier(.25,.9,.3,1)",
                  }}
                >
                  <circle r={s.r + 1.6} fill={isFocusM ? s.c : s.p} opacity="0.2" style={{ transition: "fill .5s" }} />
                  <circle r={s.r} fill={isFocusM ? s.c : s.p} style={{ transition: "fill .5s" }} />
                  {/* 흰 심지 — 멀리서 별처럼 반짝이게. 줌인하면 원색이 또렷해진다. */}
                  <circle r={s.r * 0.45} fill="#FFFFFF" style={{ opacity: isFocusM ? 0 : 0.8, transition: "opacity .5s" }} />
                </g>
              ))}

              {/* 줌인한 달 타이틀 — 몇 월인지 크게 */}
              {isFocusM && (
                <text
                  x={mo.cx}
                  y={mo.cy - 55}
                  textAnchor="middle"
                  fontSize="8.5"
                  fontWeight="700"
                  fill="#EAF2FF"
                  style={{ animation: "pm-fade .5s ease .45s both" }}
                >
                  {mo.m.monthKey.slice(0, 4)}년 {mo.num}월
                </text>
              )}
              {/* 이번 달 반짝 링 */}
              {mo.isNow && !isFocusM && (
                <circle cx={mo.cx} cy={mo.cy} r={1.3 * Math.sqrt(mo.count + 1) + 4.5} fill="none" stroke="#7FD4FF" strokeWidth="1" className="animate-pulse" />
              )}
              {/* 달 라벨 — 성단 위/아래 번갈아(겹침 방지), 줌하면 숨김 */}
              {!isFocusM && (
                <text
                  x={mo.cx}
                  y={mo.labelUp ? mo.cy - 1.3 * Math.sqrt(mo.count + 1) - 5 : mo.cy + 1.3 * Math.sqrt(mo.count + 1) + 10}
                  textAnchor="middle"
                  fontSize="7"
                  fill="#8895AF"
                >
                  {mo.num}월
                </text>
              )}
              {/* 탭 타깃 — 드래그로 움직였으면 탭 무시 */}
              {!focusedPlanet && (
                <circle cx={mo.cx} cy={mo.cy} r={13} fill="transparent" className="cursor-pointer"
                  onClick={() => {
                    if (dragRef.current.moved) return;
                    onMonthPick?.(mo.m.monthKey);
                  }} />
              )}
            </g>
          );
        })}
        </g>

        {/* 행성들 */}
        {planetPts.map((p) => {
          const unexplored = p.n === 0;
          const dimmed = anyFocus && focus !== p.key;
          return (
            <g
              key={p.key}
              className="cursor-pointer"
              style={{ opacity: dimmed ? 0.12 : 1, transition: "opacity .5s" }}
              onClick={() => onPlanetPick?.(p.key)}
            >
              {!unexplored && deco && <circle cx={p.x} cy={p.y} r={p.size * 2} fill={`url(#pm-h-${p.key})`} />}
              {!unexplored && deco && p.ring && (
                <path d={ringArc(p, true)} fill="none" stroke={p.to} strokeWidth={p.size * 0.14} strokeOpacity="0.5" />
              )}
              <circle
                cx={p.x}
                cy={p.y}
                r={p.size}
                fill={unexplored ? "url(#pm-fog)" : deco ? `url(#pm-g-${p.key})` : p.from}
                stroke={unexplored ? "#39435F" : deco ? "none" : p.to}
                strokeWidth={unexplored || deco ? 1 : 1}
                strokeDasharray={unexplored ? "3 3" : "none"}
                opacity={unexplored ? 0.6 : 1}
              />
              {/* 기본(민무늬) 스킨 — 작은 하이라이트 점만 */}
              {!unexplored && !deco && (
                <circle cx={p.x - p.size * 0.3} cy={p.y - p.size * 0.35} r={p.size * 0.4} fill={p.to} opacity="0.45" />
              )}
              {/* 줄무늬 스킨 — 구체 안에 가스행성 밴드 */}
              {!unexplored && striped && (
                <g clipPath={`url(#pm-clip-${p.key})`}>
                  {[-0.42, -0.05, 0.34, 0.68].map((off, bi) => (
                    <rect
                      key={bi}
                      x={p.x - p.size * 1.3}
                      y={p.y + p.size * off - p.size * 0.11}
                      width={p.size * 2.6}
                      height={p.size * 0.22}
                      fill={bi % 2 === 0 ? p.to : "#0A1322"}
                      opacity={bi % 2 === 0 ? 0.35 : 0.22}
                      transform={`rotate(-12 ${p.x} ${p.y})`}
                    />
                  ))}
                </g>
              )}
              {!unexplored && deco && <circle cx={p.x} cy={p.y} r={p.size} fill="url(#pm-shade)" />}
              {!unexplored && deco && p.ring && (
                <path d={ringArc(p, false)} fill="none" stroke={p.to} strokeWidth={p.size * 0.16} strokeOpacity="0.85" />
              )}
              {/* 위성 — 그 행성으로 줌인하면 성단과 헷갈리지 않게 흐려진다 */}
              {!unexplored && deco && p.moon && (
                <circle
                  cx={p.x + p.size * 1.35}
                  cy={p.y - p.size * 0.9}
                  r={p.size * 0.18}
                  fill={p.to}
                  style={{ opacity: focus === p.key ? 0.12 : 0.9, transition: "opacity .5s" }}
                />
              )}
              <g style={{ opacity: anyFocus ? 0 : 1, transition: "opacity .4s" }}>
                <text x={p.x} y={p.y + p.size + 11} textAnchor="middle" fontSize="9" fill="#AEB9D0">
                  {p.label}
                </text>
                <text x={p.x} y={p.y + p.size + 21} textAnchor="middle" fontSize="7.5" fill="#677595">
                  {unexplored ? "미탐사" : `${p.n}개`}
                </text>
                {/* 시뮬레이션 ◆ 뱃지 — 이 영역에서 돌린 갈림길 수 */}
                {!unexplored && (scenarioCounts?.[p.key] || 0) > 0 && (
                  <>
                    <rect
                      x={p.x - p.size * 0.95 - 2.6}
                      y={p.y - p.size * 0.85 - 2.6}
                      width={5.2}
                      height={5.2}
                      fill="#F2DDB0"
                      transform={`rotate(45 ${p.x - p.size * 0.95} ${p.y - p.size * 0.85})`}
                    />
                    <text x={p.x - p.size * 0.95 - 6} y={p.y - p.size * 0.85 + 2.5} textAnchor="end" fontSize="7" fill="#F2DDB0">
                      {scenarioCounts[p.key]}
                    </text>
                  </>
                )}
              </g>
            </g>
          );
        })}

        {/* 포커스 행성의 성단들 — 실제 별자리 모양 미니어처 */}
        {clusters.map(({ g, cx, cy, stars }) => (
          <g
            key={g.label || g.index}
            className="cursor-pointer"
            style={{ animation: "pm-fade .6s ease .35s both" }}
            onClick={() => onClusterOpen?.(g)}
          >
            {stars.map((s, si) => {
              const q = stars[(si + 1) % stars.length];
              if (!q || stars.length < 2) return null;
              return (
                <line key={si} x1={s.x} y1={s.y} x2={q.x} y2={q.y}
                  stroke="#9FB0CE" strokeWidth="0.3" strokeOpacity="0.45" />
              );
            })}
            {stars.map((s, si) => (
              <circle key={`s${si}`} cx={s.x} cy={s.y} r={s.r} fill={s.c} />
            ))}
            <text x={cx} y={cy + 14} textAnchor="middle" fontSize="4.6" fill="#8895AF">
              {g.label || `별자리 ${g.index + 1}`} · {g.filled}일
            </text>
            <circle cx={cx} cy={cy} r={13} fill="transparent" />
          </g>
        ))}
      </g>
      <style>{`@keyframes pm-fade { from { opacity: 0 } to { opacity: 1 } }`}</style>
    </svg>
  );
}
