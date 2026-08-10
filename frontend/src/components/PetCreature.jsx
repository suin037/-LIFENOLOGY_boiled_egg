// 🐣 클레이 펫 — 돌보미별 다른 동물. 매트 뽀얀 몸 + 점눈 + 볼터치(마메고마풍).
//  · nova(핑크)=햄스터 / cosmo(블루)=물범(머리 위 행성 고리) / lumi(옐로)=병아리
//  · expr="happy" 면 눈이 ^ᴗ^ 로(간식/쓰다듬 리액션), mood="시무룩"이면 처진 눈.
const V = {
  nova:  { edge: "#FFE1EC", tint: "#F49CBE", eye: "#4A2130", animal: "hamster" },
  cosmo: { edge: "#DCEEFF", tint: "#89C0F0", eye: "#22415C", animal: "seal" },
  lumi:  { edge: "#FFF3CF", tint: "#F2CE62", eye: "#6E521B", animal: "chick", beak: "#F59A3C" },
};

// 5각 별 path
function star(cx, cy, o, i, fill) {
  let p = "";
  for (let k = 0; k < 10; k++) {
    const r = k % 2 ? i : o;
    const a = -Math.PI / 2 + k * (Math.PI / 5);
    p += `${k ? "L" : "M"}${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }
  return <path d={`${p}Z`} fill={fill} />;
}

export default function PetCreature({ size = 120, variant = "cosmo", mood = "기쁨", expr = "idle" }) {
  const v = V[variant] || V.cosmo;
  const gid = `clay_${variant}`;
  const sad = mood === "시무룩";
  const happy = expr === "happy" && !sad;

  // 점눈 / 웃는눈(^ᴗ^) / 처진눈
  const Eyes = ({ lx, rx, y }) => {
    if (sad)
      return (
        <>
          <path d={`M${lx - 3.5},${y + 1} Q${lx},${y + 4} ${lx + 3.5},${y + 1}`} fill="none" stroke={v.eye} strokeWidth="2.2" strokeLinecap="round" />
          <path d={`M${rx - 3.5},${y + 1} Q${rx},${y + 4} ${rx + 3.5},${y + 1}`} fill="none" stroke={v.eye} strokeWidth="2.2" strokeLinecap="round" />
        </>
      );
    // 담곰(햄스터)은 웃어도 눈 그대로(입만) — 나머지는 눈만 웃음.
    if (happy && v.animal !== "hamster")
      return (
        <>
          <path d={`M${lx - 2.5},${y + 1} Q${lx},${y - 1.7} ${lx + 2.5},${y + 1}`} fill="none" stroke={v.eye} strokeWidth="2" strokeLinecap="round" />
          <path d={`M${rx - 2.5},${y + 1} Q${rx},${y - 1.7} ${rx + 2.5},${y + 1}`} fill="none" stroke={v.eye} strokeWidth="2" strokeLinecap="round" />
        </>
      );
    // 햄스터 평소 = 농담곰식 작은 점눈(밋밋·데드팬, 하이라이트 없음)
    if (v.animal === "hamster")
      return (
        <>
          <circle cx={lx} cy={y} r="2" fill={v.eye} />
          <circle cx={rx} cy={y} r="2" fill={v.eye} />
        </>
      );
    return (
      <>
        <circle cx={lx} cy={y} r="2.4" fill={v.eye} />
        <circle cx={rx} cy={y} r="2.4" fill={v.eye} />
      </>
    );
  };

  // W(ᴥ) 입 + 코 톡 — 물범·햄스터 공용. 웃을 땐 입 활짝.
  const WMouth = ({ y }) => (
    <>
      {v.animal !== "hamster" && <ellipse cx="50" cy={y - 2.4} rx="1.6" ry="1.1" fill={v.tint} />}
      {happy && v.animal === "hamster" ? (
        <path d={`M44,${y + 0.6} Q49,${y + 2.8} 56,${y - 2.2}`} fill="none" stroke={v.eye} strokeWidth="1.8" strokeLinecap="round" />
      ) : v.animal === "hamster" ? (
        <path d={`M44,${y + 1.8} Q50,${y - 2.4} 56,${y + 1.8}`} fill="none" stroke={v.eye} strokeWidth="1.7" strokeLinecap="round" />
      ) : (
        <>
          <path d={`M50,${y - 1.4} L50,${y + 0.3}`} stroke={v.eye} strokeWidth="1.3" strokeLinecap="round" />
          <path d={`M44.5,${y} Q47.5,${y + 3.2} 50,${y + 0.4} Q52.5,${y + 3.2} 55.5,${y}`} fill="none" stroke={v.eye} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
    </>
  );

  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ display: "block", overflow: "visible" }}>
      <defs>
        <radialGradient id={gid} cx="42%" cy="28%" r="82%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="55%" stopColor="#FCFDFF" />
          <stop offset="100%" stopColor={v.edge} />
        </radialGradient>
      </defs>

      {/* 바닥 접지 그림자 */}
      <ellipse cx="50" cy="92" rx="23" ry="4.2" fill="#0A1220" opacity="0.24" />

      {/* ───────── 햄스터 (nova) — 동글·통통 ───────── */}
      {v.animal === "hamster" && (
        <>
          {/* 귀 (작고 동글, 밋밋) */}
          <circle cx="35" cy="33" r="6" fill={`url(#${gid})`} />
          <circle cx="65" cy="33" r="6" fill={`url(#${gid})`} />
          {/* 팔 (짧은 막대) */}
          <ellipse cx="24" cy="64" rx="6" ry="4.5" fill={`url(#${gid})`} transform="rotate(20 24 64)" />
          <ellipse cx="76" cy="64" rx="6" ry="4.5" fill={`url(#${gid})`} transform="rotate(-20 76 64)" />
          {/* 발 */}
          <ellipse cx="42" cy="85" rx="7" ry="4.6" fill={`url(#${gid})`} />
          <ellipse cx="58" cy="85" rx="7" ry="4.6" fill={`url(#${gid})`} />
          {/* 몸 (동글·약간 넓게) */}
          <ellipse cx="50" cy="58" rx="31" ry="28" fill={`url(#${gid})`} />
          {/* 농담곰식: 볼터치 없이 밋밋. 눈은 작고 넓게. */}
          <Eyes lx={40} rx={60} y={54} />
          <WMouth y={65} />
        </>
      )}

      {/* ───────── 물범 (cosmo) — 머리 위 행성 고리, W 입 ───────── */}
      {v.animal === "seal" && (
        <>
          {/* 행성 고리 (머리 위 떠 있음) */}
          <ellipse cx="50" cy="17" rx="20" ry="5.5" fill="none" stroke={v.tint} strokeWidth="3" opacity="0.72" transform="rotate(-11 50 17)" />
          {/* 지느러미 + 꼬리(하트꼬리) */}
          <ellipse cx="25" cy="69" rx="8" ry="5" fill={`url(#${gid})`} transform="rotate(28 25 69)" />
          <ellipse cx="75" cy="69" rx="8" ry="5" fill={`url(#${gid})`} transform="rotate(-28 75 69)" />
          <path d="M43,88 Q50,84 57,88 Q50,92 43,88 Z" fill={`url(#${gid})`} />
          {/* 몸 (동글·통통) */}
          <ellipse cx="50" cy="59" rx="30" ry="28" fill={`url(#${gid})`} />
          {/* 볼터치 */}
          <ellipse cx="32" cy="63" rx="5.5" ry="3.6" fill={v.tint} opacity="0.42" />
          <ellipse cx="68" cy="63" rx="5.5" ry="3.6" fill={v.tint} opacity="0.42" />
          <Eyes lx={41} rx={59} y={55} />
          <WMouth y={65} />
        </>
      )}

      {/* ───────── 병아리 (lumi) ───────── */}
      {v.animal === "chick" && (
        <>
          {/* 머리 위 별 */}
          {star(50, 19, 6.5, 2.7, v.tint)}
          {/* 날개 */}
          <ellipse cx="23" cy="62" rx="7" ry="9" fill={`url(#${gid})`} transform="rotate(12 23 62)" />
          <ellipse cx="77" cy="62" rx="7" ry="9" fill={`url(#${gid})`} transform="rotate(-12 77 62)" />
          {/* 다리/발 (주황) */}
          <path d="M44,88 v4 M42,93 h4 M44,92 l-3,2 M44,92 l3,2" stroke={v.beak} strokeWidth="1.8" strokeLinecap="round" fill="none" />
          <path d="M56,88 v4 M54,93 h4 M56,92 l-3,2 M56,92 l3,2" stroke={v.beak} strokeWidth="1.8" strokeLinecap="round" fill="none" />
          {/* 몸 (동글) */}
          <ellipse cx="50" cy="58" rx="29" ry="28" fill={`url(#${gid})`} />
          {/* 볼터치 */}
          <ellipse cx="33" cy="61" rx="5" ry="3.3" fill={v.tint} opacity="0.5" />
          <ellipse cx="67" cy="61" rx="5" ry="3.3" fill={v.tint} opacity="0.5" />
          <Eyes lx={41} rx={59} y={52} />
          {/* 부리 (웃어도 그대로 — 병아리는 눈만 웃음) */}
          {sad ? (
            <path d="M47,61 L53,61 L50,58 Z" fill={v.beak} />
          ) : (
            <path d="M46,60 L54,60 L50,65 Z" fill={v.beak} />
          )}
        </>
      )}
    </svg>
  );
}
