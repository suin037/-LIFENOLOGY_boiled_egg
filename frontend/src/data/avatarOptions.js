export const BG_COLORS = ["#6BD9E9", "#F4D150", "#E0DDFF", "#FFB6C1", "#8B6CCF", "#D2EFF3", "#FFE0B2", "#B5EAD7", "#FFDAC1", "#C7CEEA", "#FF9AA2", "#A0E7E5", "#FBE7C6", "#111827"];
export const HAIR_COLORS = [["갈색", "#4E3629"], ["흑발", "#2C1B18"], ["밝은 갈색", "#B0703C"], ["금발", "#D6B370"], ["핑크", "#FC909F"], ["애쉬", "#8A8D91"], ["보라", "#A56BBF"]];
export const HAIR_STYLES = [["긴 머리", "womanLong", "woman"], ["단발", "womanShort", "woman"], ["기본 숏", "normal", "woman"], ["짧은 머리", "normal", "man"], ["풍성한 머리", "thick", "man"], ["모히칸", "mohawk", "man"]];
export const SKIN_COLORS = [["밝은", "#F9C9B6"], ["보통", "#F1C27D"], ["웜", "#E0AC69"], ["구릿빛", "#C68642"], ["어두운", "#8D5524"]];
export const EYE_STYLES = [["동그란 눈", "circle"], ["차분한 눈", "oval"], ["웃는 눈", "smile"]];
export const MOUTH_STYLES = [["활짝 웃음", "laugh"], ["미소", "smile"], ["편안함", "peace"]];
export const NOSE_STYLES = [["짧은 코", "short"], ["긴 코", "long"], ["둥근 코", "round"]];
export const EAR_SIZES = [["작은 귀", "small"], ["큰 귀", "big"]];
export const GLASSES_STYLES = [["없음", "none"], ["동근 안경", "round"], ["각진 안경", "square"]];
export const HAT_STYLES = [["없음", "none"], ["비니", "beanie"], ["터번", "turban"]];
export const HAT_COLORS = [["검정", "#2C1B18"], ["갈색", "#77311D"], ["보라", "#8B6CCF"], ["청록", "#6BD9E9"], ["핑크", "#FC909F"]];
export const SHIRT_STYLES = [["후드", "hoody"], ["티셔츠", "short"], ["폴로", "polo"]];
export const SHIRT_COLORS = [["보라", "#8B6CCF"], ["청록", "#6BD9E9"], ["핑크", "#FC909F"], ["노랑", "#F4D150"], ["갈색", "#77311D"], ["검정", "#111827"], ["연보라", "#E0DDFF"], ["크림", "#E7DBC0"], ["민트", "#B5EAD7"]];

export const DEFAULT_AVATAR = {
  sex: "woman", hairStyle: "womanLong", hairColor: HAIR_COLORS[0][1], eyeBrowStyle: "upWoman",
  faceColor: SKIN_COLORS[0][1], eyeStyle: "smile", mouthStyle: "smile", noseStyle: "short", earSize: "small",
  glassesStyle: "none", hatStyle: "none", hatColor: HAT_COLORS[0][1],
  shirtStyle: "hoody", shirtColor: SHIRT_COLORS[0][1], bgColor: BG_COLORS[0], isGradient: false, shape: "circle",
};

export function normalizeAvatar(config) {
  if (!config || typeof config.sex === "undefined" || typeof config.faceColor === "undefined") return { ...DEFAULT_AVATAR };
  return { ...DEFAULT_AVATAR, ...config };
}

export function avatarGenerationSpec(config) {
  const c = normalizeAvatar(config);
  return { characterType: "gender-neutral illustrated avatar", hairStyle: c.hairStyle, hairColor: c.hairColor, skinTone: c.faceColor, eyeStyle: c.eyeStyle, eyebrowStyle: c.eyeBrowStyle, mouthStyle: c.mouthStyle, glassesStyle: c.glassesStyle, hatStyle: c.hatStyle, hatColor: c.hatColor, outfitStyle: c.shirtStyle, outfitColor: c.shirtColor, earSize: c.earSize, gradientBackground: Boolean(c.isGradient) };
}
