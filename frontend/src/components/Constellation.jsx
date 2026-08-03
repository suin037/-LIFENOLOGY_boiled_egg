// ─────────────────────────────────────────────────────────────
// 별자리 SVG. 나의 우주 화면(민주) 소관. 외부 라이브러리 없이 순수 SVG.
//
// 인코딩 규칙
//  · x = 그 주의 며칠째(0~6)     · y = 그날 valence (위=긍정)
//  · 감정은 색이 아니라 **별의 밝기·크기**(등급)로 표현한다.
//    시안/골드는 앱 전체에서 선택지 A/B 전용이라 감정에 쓰면 의미가 충돌한다.
//  · 일기를 쓴 날은 별 둘레에 얇은 링. 기록이 없는 날은 점선 빈 자리.
// ─────────────────────────────────────────────────────────────

const W = 320;
const H = 128;
const PAD_X = 24;
const MID = 66;
const AMP = 36;

// 날짜 문자열 → 고정 지터. Math.random 을 쓰면 리렌더마다 별이 움직인다.
function jitter(seed, range) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return ((Math.abs(h) % 1000) / 1000 - 0.5) * range;
}

function layout(stars) {
  const n = Math.max(stars.length - 1, 1);
  const step = (W - PAD_X * 2) / n;
  return stars.map((s, i) => {
    const v = s.valence;
    const has = v != null;
    const norm = has ? (v + 1) / 2 : 0.5; // 0~1
    return {
      ...s,
      has,
      norm,
      x: PAD_X + i * step + (stars.length > 1 ? jitter(s.date, 6) : 0),
      y: MID - (has ? v * AMP : 0) + jitter(s.date + "y", 7),
      r: has ? 2.2 + norm * 2.2 : 2,
      // 아직 오지 않은 날은 거의 보이지 않게 — 자리만 잡아둔다.
      opacity: has ? 0.34 + norm * 0.62 : s.future ? 0.07 : 0.18,
    };
  });
}

export default function Constellation({
  stars = [],
  onSelect,
  selectedDate = null,
  todayDate = null,
  className = "",
}) {
  if (!stars.length) return null;
  const pts = layout(stars);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={`w-full ${className}`}
      role="img"
      aria-label={`최근 ${stars.length}일의 기록으로 그린 별자리`}
      style={{ display: "block" }}
    >
      {/* 연결선 — 양쪽 다 기록이 있으면 실선, 한쪽이라도 비면 점선 */}
      {pts.slice(1).map((p, i) => {
        const a = pts[i];
        const solid = a.has && p.has;
        const ahead = a.future || p.future;
        return (
          <line
            key={`l${p.date}`}
            x1={a.x}
            y1={a.y}
            x2={p.x}
            y2={p.y}
            stroke="#9FB0CE"
            strokeWidth={solid ? 1.1 : 0.8}
            strokeOpacity={ahead ? 0.06 : solid ? 0.42 : 0.16}
            strokeDasharray={solid ? undefined : "2 4"}
          />
        );
      })}

      {pts.map((p) => {
        const isToday = todayDate && p.date === todayDate;
        const isSel = selectedDate && p.date === selectedDate;
        return (
          <g key={p.date}>
            {/* 오늘 별에만 아주 옅은 후광 (글로우 남발 금지 원칙) */}
            {isToday && p.has && (
              <circle cx={p.x} cy={p.y} r={p.r + 5} fill="#EAF0FB" opacity={0.08} />
            )}

            {p.has ? (
              <circle cx={p.x} cy={p.y} r={p.r} fill="#EAF0FB" opacity={p.opacity} />
            ) : (
              <circle
                cx={p.x}
                cy={p.y}
                r={p.r}
                fill="none"
                stroke="#5A6B8C"
                strokeWidth={0.8}
                strokeDasharray="1.5 2"
                opacity={0.5}
              />
            )}

            {/* 일기를 쓴 날 = 링 하나 더 */}
            {p.hasDiary && (
              <circle
                cx={p.x}
                cy={p.y}
                r={p.r + 3}
                fill="none"
                stroke="#9FB0CE"
                strokeWidth={0.8}
                opacity={0.45}
              />
            )}

            {/* 선택된 날 표시 */}
            {isSel && (
              <circle
                cx={p.x}
                cy={p.y}
                r={p.r + 6}
                fill="none"
                stroke="#EAF0FB"
                strokeWidth={0.9}
                opacity={0.6}
              />
            )}

            {/* 탭 영역 — 별이 작아서 별도 히트박스 */}
            {onSelect && (
              <circle
                cx={p.x}
                cy={p.y}
                r={13}
                fill="transparent"
                style={{ cursor: "pointer" }}
                onClick={() => onSelect(p)}
              />
            )}
          </g>
        );
      })}

      {/* 시작·끝 날짜만 아주 작게 */}
      <text x={PAD_X} y={H - 6} fill="#5A6B8C" fontSize="8" textAnchor="middle">
        {shortDate(pts[0].date)}
      </text>
      {pts.length > 1 && (
        <text x={W - PAD_X} y={H - 6} fill="#5A6B8C" fontSize="8" textAnchor="middle">
          {shortDate(pts[pts.length - 1].date)}
        </text>
      )}
    </svg>
  );
}

function shortDate(d) {
  const [, m, day] = (d || "").split("-");
  return m ? `${Number(m)}/${Number(day)}` : "";
}
