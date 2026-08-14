export const BG_COLORS = [
  "#6BD9E9", "#F4D150", "#E0DDFF", "#FFB6C1", "#8B6CCF", "#D2EFF3", "#FFE0B2",
  "#B5EAD7", "#FFDAC1", "#C7CEEA", "#FF9AA2", "#A0E7E5", "#FBE7C6", "#111827",
];

const HAIRC = [
  ["갈색", "#4E3629"], ["흑발", "#2C1B18"], ["밝은갈", "#B0703C"],
  ["금발", "#D6B370"], ["핑크", "#FC909F"], ["애쉬", "#8A8D91"], ["보라", "#A56BBF"],
];
const WOMAN_HAIR = [["롱", "womanLong"], ["단발", "womanShort"], ["숏", "normal"]];
export const HAIR_PRESETS = [
  ...WOMAN_HAIR.flatMap(([hn, hs]) => HAIRC.map(([cn, cc]) => ({
    label: `${hn} ${cn}`, cfg: { sex: "woman", hairStyle: hs, hairColor: cc, eyeBrowStyle: "upWoman" },
  }))),
  ...HAIRC.slice(0, 5).map(([cn, cc]) => ({
    label: `숏 ${cn}`, cfg: { sex: "man", hairStyle: "normal", hairColor: cc, eyeBrowStyle: "up" },
  })),
  { label: "덥수룩 (검정)", cfg: { sex: "man", hairStyle: "thick", hairColor: "#2C1B18", eyeBrowStyle: "up" } },
  { label: "모히칸 (검정)", cfg: { sex: "man", hairStyle: "mohawk", hairColor: "#2C1B18", eyeBrowStyle: "up" } },
];

const SKIN = [["밝은", "#F9C9B6"], ["보통", "#F1C27D"], ["웜", "#E0AC69"], ["구릿빛", "#C68642"], ["어두운", "#8D5524"]];
const EXPR = [
  ["미소", { eyeStyle: "smile", mouthStyle: "smile", noseStyle: "short" }],
  ["활짝웃음", { eyeStyle: "smile", mouthStyle: "laugh", noseStyle: "round" }],
  ["동그란눈", { eyeStyle: "circle", mouthStyle: "smile", noseStyle: "short" }],
  ["차분", { eyeStyle: "oval", mouthStyle: "peace", noseStyle: "long" }],
  ["장난", { eyeStyle: "circle", mouthStyle: "laugh", noseStyle: "round" }],
];
export const FACE_PRESETS = SKIN.flatMap(([sn, sc]) => EXPR.map(([en, e]) => ({
  label: `${sn}·${en}`, cfg: { faceColor: sc, ...e },
})));

const HATC = [["흑", "#2C1B18"], ["갈", "#77311D"], ["보라", "#8B6CCF"], ["청록", "#6BD9E9"], ["핑크", "#FC909F"]];
export const ACC_PRESETS = [
  { label: "없음", cfg: { glassesStyle: "none", hatStyle: "none" } },
  { label: "동근안경", cfg: { glassesStyle: "round", hatStyle: "none" } },
  { label: "각진안경", cfg: { glassesStyle: "square", hatStyle: "none" } },
  ...HATC.map(([cn, cc]) => ({ label: `비니 ${cn}`, cfg: { glassesStyle: "none", hatStyle: "beanie", hatColor: cc } })),
  ...HATC.map(([cn, cc]) => ({ label: `터번 ${cn}`, cfg: { glassesStyle: "none", hatStyle: "turban", hatColor: cc } })),
  { label: "비니+안경", cfg: { glassesStyle: "round", hatStyle: "beanie", hatColor: "#2C1B18" } },
  { label: "터번+안경", cfg: { glassesStyle: "square", hatStyle: "turban", hatColor: "#8B6CCF" } },
];

const SHIRT = [["후드", "hoody"], ["티셔츠", "short"], ["폴로", "polo"]];
const SHIRTC = [
  ["보라", "#8B6CCF"], ["청록", "#6BD9E9"], ["핑크", "#FC909F"], ["노랑", "#F4D150"],
  ["갈색", "#77311D"], ["검정", "#111827"], ["연보라", "#E0DDFF"], ["크림", "#E7DBC0"], ["민트", "#B5EAD7"],
];
export const OUTFIT_PRESETS = SHIRT.flatMap(([sn, ss]) => SHIRTC.map(([cn, cc]) => ({
  label: `${cn} ${sn}`, cfg: { shirtStyle: ss, shirtColor: cc },
})));

export const DEFAULT_AVATAR = {
  ...HAIR_PRESETS[0].cfg,
  ...FACE_PRESETS[0].cfg,
  ...ACC_PRESETS[0].cfg,
  ...OUTFIT_PRESETS[0].cfg,
  bgColor: BG_COLORS[0], earSize: "small", shape: "circle",
};

export function normalizeAvatar(config) {
  if (!config || typeof config.sex === "undefined" || typeof config.faceColor === "undefined") {
    return { ...DEFAULT_AVATAR };
  }
  return { ...DEFAULT_AVATAR, ...config };
}
