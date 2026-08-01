import { BACKGROUNDS, DEFAULT_AVATAR } from "../data/avatarOptions.js";

// avatarConfig → 플랫 초상(사람) SVG 아바타 + 우주 배경/링. size=px.
const STARS = [
  [18, 20], [80, 26], [26, 84], [86, 64], [66, 13], [13, 50],
];

// 머리 캡(앞머리) path: topY / fringeY(가운데 내려오는 깊이) / sideY(옆 길이)
const cap = (t, f, s) =>
  `M31,${s} Q31,${t} 50,${t} Q69,${t} 69,${s} Q60,${f} 50,${f} Q40,${f} 31,${s} Z`;

function darken(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * f);
  const g = Math.round(((n >> 8) & 255) * f);
  const b = Math.round((n & 255) * f);
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function hairBack(id, col) {
  if (id === "long")
    return (
      <>
        <path d="M30,42 Q26,84 41,84 L41,46 Z" fill={col} />
        <path d="M70,42 Q74,84 59,84 L59,46 Z" fill={col} />
        <rect x="33" y="38" width="34" height="40" rx="16" fill={col} />
      </>
    );
  if (id === "bob")
    return (
      <>
        <path d="M30,42 Q29,62 38,62 L38,46 Z" fill={col} />
        <path d="M70,42 Q71,62 62,62 L62,46 Z" fill={col} />
      </>
    );
  return null;
}

function hairFront(id, col) {
  if (id === "bald") return null;
  if (id === "bun")
    return (
      <>
        <circle cx="50" cy="22" r="6.5" fill={col} />
        <path d={cap(26, 38, 47)} fill={col} />
      </>
    );
  if (id === "crop") return <path d={cap(30, 41, 46)} fill={col} />;
  if (id === "long") return <path d={cap(25, 38, 48)} fill={col} />;
  if (id === "bob") return <path d={cap(26, 38, 48)} fill={col} />;
  return <path d={cap(26, 38, 47)} fill={col} />; // short
}

export default function Avatar({ config, size = 96, ring = true }) {
  const c = { ...DEFAULT_AVATAR, ...(config || {}) };
  const bg = BACKGROUNDS.find((b) => b.id === c.bg) || BACKGROUNDS[0];
  const gid = "avbg_" + (c.bg || "cyan");
  const cid = "avclip_" + (c.bg || "cyan");
  const cloth = bg.cloth || "#3a4a6a";
  const sh = darken(c.skin, 0.86);
  const cx = 50, eyeY = 45, edx = 6.6;

  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ display: "block" }}>
      <defs>
        <radialGradient id={gid} cx="50%" cy="34%" r="80%">
          <stop offset="0%" stopColor={bg.stops[0]} />
          <stop offset="100%" stopColor={bg.stops[1]} />
        </radialGradient>
        <clipPath id={cid}>
          <circle cx="50" cy="50" r="50" />
        </clipPath>
      </defs>

      <circle cx="50" cy="50" r="50" fill={`url(#${gid})`} />
      {STARS.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i % 2 ? 0.8 : 1.2} fill="#EAF0FB" opacity="0.5" />
      ))}

      <g clipPath={`url(#${cid})`}>
        {/* 어깨(옷) */}
        <path d="M20,101 Q20,74 50,74 Q80,74 80,101 Z" fill={cloth} />
        <path d="M20,101 Q20,74 50,74 Q80,74 80,101 Z" fill="#ffffff" opacity="0.05" />
        {/* 목 */}
        <rect x="44.5" y="56" width="11" height="14" rx="4" fill={sh} />

        {hairBack(c.hair, c.hairColor)}

        {/* 귀 */}
        <ellipse cx="33" cy="47" rx="3" ry="4" fill={c.skin} />
        <ellipse cx="67" cy="47" rx="3" ry="4" fill={c.skin} />

        {/* 얼굴 */}
        <path
          d="M33.5,44 C33.5,33 40,27 50,27 C60,27 66.5,33 66.5,44 C66.5,55 59,63 50,63 C41,63 33.5,55 33.5,44 Z"
          fill={c.skin}
        />

        {/* 눈썹 */}
        <path
          d={`M${cx - edx - 2.4},40.5 Q${cx - edx},39 ${cx - edx + 2.4},40.3`}
          stroke={c.hairColor}
          strokeWidth="1.4"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d={`M${cx + edx - 2.4},40.3 Q${cx + edx},39 ${cx + edx + 2.4},40.5`}
          stroke={c.hairColor}
          strokeWidth="1.4"
          fill="none"
          strokeLinecap="round"
        />

        {/* 눈: 흰자 + 눈동자 + 눈빛 */}
        <ellipse cx={cx - edx} cy={eyeY} rx="2.7" ry="2.2" fill="#fff" />
        <ellipse cx={cx + edx} cy={eyeY} rx="2.7" ry="2.2" fill="#fff" />
        <circle cx={cx - edx} cy={eyeY + 0.3} r="1.55" fill="#3A2B22" />
        <circle cx={cx + edx} cy={eyeY + 0.3} r="1.55" fill="#3A2B22" />
        <circle cx={cx - edx - 0.5} cy={eyeY - 0.4} r="0.6" fill="#fff" />
        <circle cx={cx + edx - 0.5} cy={eyeY - 0.4} r="0.6" fill="#fff" />

        {/* 코 */}
        <path
          d="M49.2,47 Q48.6,50.5 51,51"
          stroke={sh}
          strokeWidth="1.2"
          fill="none"
          strokeLinecap="round"
        />

        {/* 입 */}
        <path
          d="M46.5,55 Q50,58 53.5,55"
          stroke="#9B5C50"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
        />

        {/* 옅은 볼터치 */}
        <ellipse cx={cx - 9.5} cy="52" rx="2.6" ry="1.5" fill="#FF9EBC" opacity="0.35" />
        <ellipse cx={cx + 9.5} cy="52" rx="2.6" ry="1.5" fill="#FF9EBC" opacity="0.35" />

        {hairFront(c.hair, c.hairColor)}

        {/* 안경 */}
        {c.glasses === "round" && (
          <g stroke="#20304d" strokeWidth="1.4" fill="none">
            <circle cx={cx - edx} cy={eyeY} r="4.4" />
            <circle cx={cx + edx} cy={eyeY} r="4.4" />
            <line x1={cx - 2.2} y1={eyeY} x2={cx + 2.2} y2={eyeY} />
          </g>
        )}
        {c.glasses === "square" && (
          <g stroke="#20304d" strokeWidth="1.4" fill="none">
            <rect x={cx - 11.5} y={eyeY - 3.6} width="9" height="7.2" rx="1.8" />
            <rect x={cx + 2.5} y={eyeY - 3.6} width="9" height="7.2" rx="1.8" />
            <line x1={cx - 2.5} y1={eyeY} x2={cx + 2.5} y2={eyeY} />
          </g>
        )}
      </g>

      {ring && (
        <circle cx="50" cy="50" r="48" fill="none" stroke="#7FD4FF" strokeOpacity="0.35" strokeWidth="1.5" />
      )}
    </svg>
  );
}
