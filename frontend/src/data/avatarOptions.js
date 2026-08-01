// 아바타 빌더 옵션 세트 + 기본값. (직접 SVG 합성 — 라이브러리 불필요 · 치비/귀여운 톤)
export const SKINS = ["#F6D3AE", "#EBB98F", "#D19A6B", "#A06E49", "#7E4E31"];
export const HAIR_COLORS = ["#33291F", "#141118", "#6B4326", "#B4652F", "#9A8AA6"];

// faceR 로 머리 드러나는 정도 조절. back=긴머리 패널(backH=바닥 y), bun=묶음, bald=민머리.
export const HAIR_STYLES = [
  { id: "short", label: "짧은머리", faceR: 20 },
  { id: "bob", label: "단발", faceR: 19, back: true, backH: 66 },
  { id: "long", label: "긴머리", faceR: 19, back: true, backH: 82 },
  { id: "bun", label: "묶음", faceR: 20, bun: true },
  { id: "crop", label: "아주 짧게", faceR: 21.2 },
  { id: "bald", label: "민머리", faceR: 21, bald: true },
];

export const GLASSES = [
  { id: "none", label: "없음" },
  { id: "round", label: "동글" },
  { id: "square", label: "각진" },
];

// stops=배경 그라디언트, cloth=옷(어깨) 색
export const BACKGROUNDS = [
  { id: "cyan", label: "시안", stops: ["#15324e", "#0a1524"], cloth: "#3D6FA0" },
  { id: "violet", label: "보라", stops: ["#2a1f4d", "#120a24"], cloth: "#6B4FA0" },
  { id: "teal", label: "청록", stops: ["#123f39", "#08201d"], cloth: "#2F8F83" },
  { id: "rose", label: "로즈", stops: ["#4a1f33", "#220a16"], cloth: "#A85878" },
];

export const DEFAULT_AVATAR = {
  skin: SKINS[1],
  hair: "short",
  hairColor: HAIR_COLORS[0],
  glasses: "none",
  bg: "cyan",
};
