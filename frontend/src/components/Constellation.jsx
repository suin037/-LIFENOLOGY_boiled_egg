import { useState } from "react";

// 별자리 = 중심점 극좌표. 요일=각도(월→일), 기분=반지름(좋을수록 바깥) + 색.
// minju constellationGroups().stars 를 그대로 받는다. 별 클릭 → onSelect(star).

const W = 200, H = 200, CX = 100, CY = 96;
const R_MIN = 16, R_SPREAD = 60; // 힘든 날=중심, 좋은 날=바깥
const COL = ["#E24B4A", "#D85A30", "#EDA100", "#5DCAA5", "#8B6CCF"]; // 기분 1~5 색
const MOOD_LABEL = ["매우 낮음", "낮음", "보통", "좋음", "매우 좋음"];

// valence(-1~1) 또는 mood(1~5) → 기분레벨 1~5
function level(s) {
  if (s.mood != null) return Math.max(1, Math.min(5, Math.round(s.mood)));
  if (s.valence != null) return Math.max(1, Math.min(5, Math.round(s.valence * 2 + 3)));
  return 3;
}
export const starColor = (s) => COL[level(s) - 1];

function shortNote(star) {
  const note = String(star.note || star.text || "").replace(/\s+/g, " ").trim();
  if (!note) return star.hasDiary ? "일기를 기록했어요" : "기분을 기록했어요";
  return note.length > 34 ? `${note.slice(0, 34)}…` : note;
}

function dateLabel(dateKey) {
  const [, month, day] = String(dateKey || "").split("-");
  return month && day ? `${Number(month)}월 ${Number(day)}일` : dateKey;
}

function coord(i, s, filled) {
  const norm = filled ? (level(s) - 1) / 4 : 0; // 빈 날은 중심 근처
  const r = R_MIN + norm * R_SPREAD;
  const a = (-90 + i * (360 / 7)) * Math.PI / 180; // 요일마다 360/7°
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
}

export default function Constellation({ stars = [], onSelect, selectedDate = null, todayDate = null, size = 210 }) {
  const [hovered, setHovered] = useState(null);
  if (!stars.length) return null;
  const pts = stars.map((s, i) => {
    const filled = !s.empty && (s.mood != null || s.valence != null);
    const [x, y] = coord(i, s, filled);
    return { ...s, x, y, filled, lvl: level(s) };
  });
  // 7일 다 기록해 별자리가 완성되면 은은하게 빛난다.
  const complete = pts.length >= 7 && pts.every((p) => p.filled);

  return (
    <div className="relative">
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img"
      aria-label={`이번 주 ${pts.filter((p) => p.filled).length}일의 기록으로 그린 별자리`}
      style={{ maxHeight: size, height: size, display: "block" }}>
      {/* 중심점 */}
      <circle cx={CX} cy={CY} r={2} fill="#8B6CCF" opacity={0.5} />
      {/* 중심→별 살(spoke) */}
      {pts.map((p, i) => (
        <line key={`sp${i}`} x1={CX} y1={CY} x2={p.x} y2={p.y}
          stroke="#8B6CCF" strokeWidth={0.5} strokeOpacity={0.16} />
      ))}
      {/* 별끼리 잇는 별자리 선(순서대로, 마지막→처음 닫기) */}
      {pts.map((p, i) => {
        const q = pts[(i + 1) % pts.length];
        const solid = p.filled && q.filled;
        return (
          <line key={`ln${i}`} x1={p.x} y1={p.y} x2={q.x} y2={q.y}
            stroke="#8B6CCF" strokeWidth={solid ? 1 : 0.8}
            strokeOpacity={solid ? 0.42 : 0.14}
            strokeDasharray={solid ? undefined : "2 4"} />
        );
      })}
      {/* 별 */}
      {pts.map((p, i) => {
        const isSel = selectedDate && p.date === selectedDate;
        const isToday = todayDate && p.date === todayDate;
        if (!p.filled) {
          return <circle key={i} cx={p.x} cy={p.y} r={2} fill="none"
            stroke="#39435F" strokeWidth={0.8} strokeDasharray="1.5 2" opacity={0.5} />;
        }
        const r = 2.4 + (p.lvl / 5) * 3.2;
        const col = COL[p.lvl - 1];
        return (
          <g
            key={i}
            role={onSelect ? "button" : undefined}
            tabIndex={onSelect ? 0 : undefined}
            aria-label={`${dateLabel(p.date)}, 기분 ${MOOD_LABEL[p.lvl - 1]}`}
            onMouseEnter={() => setHovered(p)}
            onMouseLeave={() => setHovered(null)}
            onFocus={() => setHovered(p)}
            onBlur={() => setHovered(null)}
            onClick={() => onSelect?.(p)}
            onKeyDown={(e) => {
              if ((e.key === "Enter" || e.key === " ") && onSelect) {
                e.preventDefault();
                onSelect(p);
              }
            }}
            style={{ cursor: onSelect ? "pointer" : "default", outline: "none" }}
          >
            <circle cx={p.x} cy={p.y} r={r + (isSel ? 8 : 3)} fill={col} opacity={isSel ? 0.4 : 0.14} />
            <circle cx={p.x} cy={p.y} r={r} fill={col}
              stroke="#FFFFFF" strokeOpacity={isToday ? 0.9 : 0.35} strokeWidth={isToday ? 1.4 : 0.6} />
            {p.hasDiary && <circle cx={p.x} cy={p.y} r={r + 3} fill="none" stroke="#8B6CCF" strokeWidth={0.7} opacity={0.45} />}
            {/* 별이 작아서 탭 영역 별도 */}
            <circle cx={p.x} cy={p.y} r={13} fill="transparent" />
          </g>
        );
      })}
      {/* 완성 시 각 별 옆에서 작은 반짝이가 빤짝빤짝 */}
      {complete &&
        pts
          .filter((p) => p.filled)
          .flatMap((p, i) => {
            const off = [
              [6, -5],
              [-5, 5],
            ];
            return off.map(([dx, dy], j) => (
              <Sparkle
                key={`spk${i}-${j}`}
                x={p.x + dx}
                y={p.y + dy}
                size={1.4 + j * 0.8}
                delay={(((i * 2 + j) * 0.26) % 1.8).toFixed(2)}
              />
            ));
          })}
    </svg>
    {hovered && (
      <div
        className="pointer-events-none absolute z-10 w-max max-w-[180px] -translate-x-1/2 -translate-y-[calc(100%+8px)] rounded-xl border border-line bg-[#0B1220]/95 px-2.5 py-2 text-left shadow-xl backdrop-blur"
        style={{
          left: `${Math.max(16, Math.min(84, (hovered.x / W) * 100))}%`,
          top: `${(hovered.y / H) * 100}%`,
        }}
        role="tooltip"
      >
        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-ink">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COL[hovered.lvl - 1] }} />
          {dateLabel(hovered.date)} · {MOOD_LABEL[hovered.lvl - 1]}
        </div>
        <p className="mt-1 line-clamp-2 text-[10px] leading-[1.45] text-sub">{shortNote(hovered)}</p>
      </div>
    )}
    </div>
  );
}

// 작은 4갈래 반짝이 별 — 완성 별자리에서 빤짝거린다.
function Sparkle({ x, y, size = 3, delay = "0" }) {
  const r = size,
    s = size * 0.32;
  const d = `M${x},${y - r} L${x + s},${y - s} L${x + r},${y} L${x + s},${y + s} L${x},${y + r} L${x - s},${y + s} L${x - r},${y} L${x - s},${y - s} Z`;
  return (
    <path d={d} fill="#F4F0FF">
      <animate attributeName="opacity" values="0;1;0.3;1;0" dur="1.8s" begin={`${delay}s`} repeatCount="indefinite" />
    </path>
  );
}
