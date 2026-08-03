// 별자리 = 이번 주 일기. 7개 요일 슬롯(월~일)에 배치. 유명 별자리 모티브, 직선으로 이음.
// 기록한 날 = 밝은 별(색=기분), 안 한 날 = 흐린 빈 자리. 별 클릭 → onSelect(i).

// 주별로 다른 실제 별자리 (weeksAgo로 선택). 각 pos[i] = 요일 i(월=0 … 일=6).
const SHAPES = [
  {
    name: "북두칠성",
    pos: [[0.10, 0.58], [0.15, 0.82], [0.35, 0.84], [0.37, 0.58], [0.56, 0.46], [0.75, 0.38], [0.93, 0.28]],
    links: [[0, 1], [1, 2], [2, 3], [3, 0], [3, 4], [4, 5], [5, 6]],
  },
  {
    name: "백조자리(북십자성)",
    pos: [[0.50, 0.14], [0.50, 0.46], [0.50, 0.86], [0.26, 0.50], [0.74, 0.50], [0.08, 0.54], [0.92, 0.54]],
    links: [[0, 1], [1, 2], [5, 3], [3, 1], [1, 4], [4, 6]],
  },
];

export function shapeFor(weeksAgo = 0) {
  return SHAPES[weeksAgo % SHAPES.length];
}

// 그날 기분(1~5) → 별 색. 실제 별처럼: 빨강(저온·힘듦) → 파랑하양(고온·좋음).
const STAR_COLORS = ["#F0736F", "#F3A24E", "#F5D45E", "#EAF0FB", "#8FCBFF"];
export const starColor = (v) => STAR_COLORS[Math.max(1, Math.min(5, Math.round(v || 3))) - 1];

export default function Constellation({ slots, weeksAgo = 0, selectedIdx, onSelect }) {
  const W = 300, H = 158, pad = 26;
  const shape = shapeFor(weeksAgo);
  const XY = (i) => {
    const [nx, ny] = shape.pos[i];
    return [pad + nx * (W - 2 * pad), pad + ny * (H - 2 * pad)];
  };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 168 }}>
      {/* 배경 잔별 */}
      {[[26, 20], [268, 24], [150, 142], [46, 132], [286, 120], [206, 14]].map(([x, y], k) => (
        <circle key={`bg${k}`} cx={x} cy={y} r={0.7} fill="#4A5578" />
      ))}
      {/* 별자리 연결선 (직선, 전체 모양 흐리게) */}
      {shape.links.map(([a, b], k) => {
        const [x1, y1] = XY(a);
        const [x2, y2] = XY(b);
        const lit = slots[a]?.filled && slots[b]?.filled;
        return (
          <line key={`l${k}`} x1={x1} y1={y1} x2={x2} y2={y2}
            stroke="#7FD4FF" strokeOpacity={lit ? 0.4 : 0.12} strokeWidth={1} />
        );
      })}
      {/* 7개 요일 슬롯 */}
      {slots.map((s, i) => {
        const [x, y] = XY(i);
        if (!s.filled) {
          // 안 쓴 날 = 흐린 빈 자리
          return (
            <g key={i}>
              <circle cx={x} cy={y} r={2} fill="none" stroke="#39435F" strokeWidth={1} />
              <text x={x} y={y - 5} fontSize={7} fill="#4A5578" textAnchor="middle">{s.weekday}</text>
            </g>
          );
        }
        const on = i === selectedIdx;
        const col = starColor(s.v);
        const r = 2.8 + (s.v / 5) * 4.2;
        return (
          <g key={i} onClick={() => onSelect(i)} style={{ cursor: "pointer" }}>
            <circle cx={x} cy={y} r={r + (on ? 9 : 3 + s.v)} fill={col} opacity={on ? 0.45 : 0.12 + s.v * 0.03} />
            <circle cx={x} cy={y} r={r} fill={col}
              stroke="#FFFFFF" strokeOpacity={on ? 0.9 : 0.35} strokeWidth={on ? 1.6 : 0.6} />
            <text x={x} y={y - r - 3} fontSize={7.5} textAnchor="middle"
              fill={on ? "#FFFFFF" : "#9FB0CE"} fontWeight={on ? 700 : 400}>{s.weekday}</text>
          </g>
        );
      })}
    </svg>
  );
}
