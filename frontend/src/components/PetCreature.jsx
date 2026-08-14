// 🐣 클레이 펫 — 돌보미별 다른 동물. 매트 뽀얀 몸 + 점눈 + 볼터치(마메고마풍).
//  · nova(핑크)=햄스터 / cosmo(블루)=물범(머리 위 행성 고리) / lumi(옐로)=병아리
//  · expr="happy" 면 눈이 ^ᴗ^ 로(간식/쓰다듬 리액션), mood="시무룩"이면 처진 눈.
const V = {
  nova:  { edge: "#FFE6EF", tint: "#F4A8C6", eye: "#4A2130", animal: "hamster", blush: "#F7A9C6" },
  cosmo: { edge: "#E4F1FF", tint: "#8FC4F2", eye: "#22415C", animal: "seal",    blush: "#F4A6C0" },
  lumi:  { edge: "#FFF6D8", tint: "#F3D26E", eye: "#6E521B", animal: "chick", beak: "#F59A3C", blush: "#F6AEA0" },
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

// 상점에서 산 꾸미기 — 100×100 좌표계 기준으로 머리 위(y 17~35)나 목(y 72~88)에 얹는다.
// 종류마다 몸 모양이 조금 달라도 이 범위면 어색하지 않게 걸린다.
function Accessory({ id }) {
  if (id === "beanie") {
    return (
      <g>
        <path d="M33,32 A17,15 0 0 1 67,32 Z" fill="#6E7FE0" />
        <rect x="31" y="29.5" width="38" height="6" rx="3" fill="#8E9CF0" />
        <circle cx="50" cy="16" r="4" fill="#DDE4FF" />
      </g>
    );
  }
  if (id === "crown") {
    return (
      <g>
        <path d="M34,32 L38,20 L44,28 L50,17 L56,28 L62,20 L66,32 Z" fill="#F5C846" />
        <circle cx="50" cy="16.5" r="2.4" fill="#FFF0B8" />
        <rect x="34" y="30.5" width="32" height="4" rx="2" fill="#E0AE2C" />
      </g>
    );
  }
  if (id === "scarf") {
    return (
      <g>
        <rect x="30" y="73" width="40" height="7" rx="3.5" fill="#F0837C" />
        <path d="M62,79 l7,10 l-7,-2 z" fill="#E2726B" />
      </g>
    );
  }
  if (id === "glasses") {
    return (
      <g fill="none" stroke="#3B4560" strokeWidth="1.7">
        <circle cx="41" cy="52" r="7" />
        <circle cx="59" cy="52" r="7" />
        <path d="M48,52 h4" strokeLinecap="round" />
      </g>
    );
  }
  if (id === "ribbon") {
    return (
      <g transform="translate(70 31)">
        <path d="M0,0 L-8,-5 L-8,5 Z" fill="#F27DA8" />
        <path d="M0,0 L8,-5 L8,5 Z" fill="#F27DA8" />
        <circle cx="0" cy="0" r="2.6" fill="#FFB6D0" />
      </g>
    );
  }
  return null;   // "none" 포함
}

export default function PetCreature({ size = 120, variant = "cosmo", mood = "기쁨", expr = "idle", accessory = "none" }) {
  const v = V[variant] || V.cosmo;
  const gid = `clay_${variant}`;
  const sad = mood === "시무룩";
  const happy = expr === "happy" && !sad;

  // 점눈 / 웃는눈(^ᴗ^) / 처진눈 — 주기적 깜빡임(pm-blink)으로 감싼다.
  const Eyes = ({ lx, rx, y }) => {
    let inner;
    // 기분 나쁠 때(시무룩) = 눈이 -  - 일자(언짢은 표정)
    if (sad)
      inner = (
        <>
          <path d={`M${lx - 3},${y} h6`} fill="none" stroke={v.eye} strokeWidth="2.2" strokeLinecap="round" />
          <path d={`M${rx - 3},${y} h6`} fill="none" stroke={v.eye} strokeWidth="2.2" strokeLinecap="round" />
        </>
      );
    // 담곰(햄스터)은 웃어도 눈 그대로(입만) — 나머지는 눈만 웃음.
    else if (happy && v.animal !== "hamster")
      inner = (
        <>
          <path d={`M${lx - 2.5},${y + 1} Q${lx},${y - 1.7} ${lx + 2.5},${y + 1}`} fill="none" stroke={v.eye} strokeWidth="2" strokeLinecap="round" />
          <path d={`M${rx - 2.5},${y + 1} Q${rx},${y - 1.7} ${rx + 2.5},${y + 1}`} fill="none" stroke={v.eye} strokeWidth="2" strokeLinecap="round" />
        </>
      );
    // 햄스터 평소 = 농담곰식 작은 점눈(밋밋·데드팬, 하이라이트 없음)
    else if (v.animal === "hamster")
      inner = (
        <>
          <circle cx={lx} cy={y} r="2" fill={v.eye} />
          <circle cx={rx} cy={y} r="2" fill={v.eye} />
        </>
      );
    else
      inner = (
        <>
          <circle cx={lx} cy={y} r="2.4" fill={v.eye} />
          <circle cx={rx} cy={y} r="2.4" fill={v.eye} />
        </>
      );
    // 웃거나 시무룩일 땐 깜빡 안 함(표정 유지), 평소에만 깜빡.
    const blink = !sad && !happy;
    return (
      <g style={blink ? { transformBox: "view-box", transformOrigin: `50px ${y}px`, animation: "pm-blink 4.6s ease-in-out infinite" } : undefined}>
        {inner}
      </g>
    );
  };

  // W(ᴥ) 입 + 코 톡 — 물범·햄스터 공용. 웃을 땐 입 활짝.
  const WMouth = ({ y }) => (
    <>
      {v.animal !== "hamster" && <ellipse cx="50" cy={y - 2.4} rx="1.6" ry="1.1" fill={v.tint} />}
      {happy && v.animal === "hamster" ? (
        <path d={`M44,${y + 0.6} Q49,${y + 2.8} 56,${y - 2.2}`} fill="none" stroke={v.eye} strokeWidth="1.8" strokeLinecap="round" />
      ) : v.animal === "hamster" ? (
        <path d={`M45.5,${y} L54.5,${y}`} fill="none" stroke={v.eye} strokeWidth="1.7" strokeLinecap="round" />
      ) : (
        <>
          <path d={`M50,${y - 1.4} L50,${y + 0.3}`} stroke={v.eye} strokeWidth="1.3" strokeLinecap="round" />
          <path d={`M44.5,${y + 1.8} Q47.5,${y + 3.4} 50,${y - 0.2} Q52.5,${y + 3.4} 55.5,${y + 1.8}`} fill="none" stroke={v.eye} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
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
          {/* 볼터치(은은한 파스텔) — 담곰도 살짝 */}
          <ellipse cx="30" cy="59" rx="6.4" ry="4.2" fill={v.blush} opacity="0.5" />
          <ellipse cx="70" cy="59" rx="6.4" ry="4.2" fill={v.blush} opacity="0.5" />
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
          {/* 볼터치(파스텔·큼) */}
          <ellipse cx="31" cy="63" rx="6.6" ry="4.3" fill={v.blush} opacity="0.5" />
          <ellipse cx="69" cy="63" rx="6.6" ry="4.3" fill={v.blush} opacity="0.5" />
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
          {/* 볼터치(파스텔·큼) */}
          <ellipse cx="32" cy="60" rx="6.2" ry="4" fill={v.blush} opacity="0.52" />
          <ellipse cx="68" cy="60" rx="6.2" ry="4" fill={v.blush} opacity="0.52" />
          <Eyes lx={41} rx={59} y={52} />
          {/* 부리 (웃어도 그대로 — 병아리는 눈만 웃음) */}
          {sad ? (
            <path d="M47,61 L53,61 L50,58 Z" fill={v.beak} />
          ) : (
            <path d="M46,60 L54,60 L50,65 Z" fill={v.beak} />
          )}
        </>
      )}
      {/* 꾸미기는 맨 위에 — 안경이 눈 뒤로 가면 안 보인다. */}
      <Accessory id={accessory} />
    </svg>
  );
}
