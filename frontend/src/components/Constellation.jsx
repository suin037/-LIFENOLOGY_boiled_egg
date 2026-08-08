// 별자리 = 중심점 극좌표. 요일=각도(월→일), 기분=반지름(좋을수록 바깥) + 색.
// minju constellationGroups().stars 를 그대로 받는다. 별 클릭 → onSelect(star).

const W = 200, H = 200, CX = 100, CY = 96;
const R_MIN = 16, R_SPREAD = 60; // 힘든 날=중심, 좋은 날=바깥
const COL = ["#E24B4A", "#D85A30", "#EDA100", "#5DCAA5", "#378ADD"]; // 기분 1~5 색

// valence(-1~1) 또는 mood(1~5) → 기분레벨 1~5
function level(s) {
  if (s.mood != null) return Math.max(1, Math.min(5, Math.round(s.mood)));
  if (s.valence != null) return Math.max(1, Math.min(5, Math.round(s.valence * 2 + 3)));
  return 3;
}
export const starColor = (s) => COL[level(s) - 1];

function coord(i, s, filled) {
  const norm = filled ? (level(s) - 1) / 4 : 0; // 빈 날은 중심 근처
  const r = R_MIN + norm * R_SPREAD;
  const a = (-90 + i * (360 / 7)) * Math.PI / 180; // 요일마다 360/7°
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
}

export default function Constellation({ stars = [], onSelect, selectedDate = null, todayDate = null }) {
  if (!stars.length) return null;
  const pts = stars.map((s, i) => {
    const filled = !s.empty && (s.mood != null || s.valence != null);
    const [x, y] = coord(i, s, filled);
    return { ...s, x, y, filled, lvl: level(s) };
  });
  // 7일 다 기록해 별자리가 완성되면 은은하게 빛난다.
  const complete = pts.length >= 7 && pts.every((p) => p.filled);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img"
      aria-label={`이번 주 ${pts.filter((p) => p.filled).length}일의 기록으로 그린 별자리${complete ? " (완성)" : ""}`}
      style={{ maxHeight: 210, display: "block" }}>
      {complete && (
        <>
          <defs>
            <radialGradient id="cglow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#7FD4FF" stopOpacity="0.34" />
              <stop offset="65%" stopColor="#7FD4FF" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#7FD4FF" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx={CX} cy={CY} r={R_MIN + R_SPREAD + 12} fill="url(#cglow)">
            <animate attributeName="opacity" values="0.55;1;0.55" dur="3.2s" repeatCount="indefinite" />
          </circle>
        </>
      )}
      {/* 중심점 */}
      <circle cx={CX} cy={CY} r={2} fill="#5A6B8C" opacity={0.5} />
      {/* 중심→별 살(spoke) */}
      {pts.map((p, i) => (
        <line key={`sp${i}`} x1={CX} y1={CY} x2={p.x} y2={p.y}
          stroke="#5A6B8C" strokeWidth={0.5} strokeOpacity={0.16} />
      ))}
      {/* 별끼리 잇는 별자리 선(순서대로, 마지막→처음 닫기) */}
      {pts.map((p, i) => {
        const q = pts[(i + 1) % pts.length];
        const solid = p.filled && q.filled;
        return (
          <line key={`ln${i}`} x1={p.x} y1={p.y} x2={q.x} y2={q.y}
            stroke="#9FB0CE" strokeWidth={solid ? 1 : 0.8}
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
          <g key={i} onClick={() => onSelect?.(p)} style={{ cursor: onSelect ? "pointer" : "default" }}>
            <circle cx={p.x} cy={p.y} r={r + (isSel ? 8 : 3)} fill={col} opacity={isSel ? 0.4 : 0.14} />
            <circle cx={p.x} cy={p.y} r={r} fill={col}
              stroke="#FFFFFF" strokeOpacity={isToday ? 0.9 : 0.35} strokeWidth={isToday ? 1.4 : 0.6} />
            {p.hasDiary && <circle cx={p.x} cy={p.y} r={r + 3} fill="none" stroke="#9FB0CE" strokeWidth={0.7} opacity={0.45} />}
            {/* 별이 작아서 탭 영역 별도 */}
            <circle cx={p.x} cy={p.y} r={13} fill="transparent" />
          </g>
        );
      })}
    </svg>
  );
}
