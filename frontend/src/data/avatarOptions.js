// 아바타 = DiceBear toonHead (Johan Melin, CC BY 4.0) + 직접 그린 파츠.
// @dicebear/core + @dicebear/collection 을 번들에 포함해 자체 렌더한다. 외부 API 를
// 호출하지 않으므로 오프라인에서 동작하고, 사용자 외모 선택이 서드파티로 나가지 않는다
// — 이 앱의 PII 마스킹·암호화 설계와 같은 방향.
//
// 파츠 정의(헤어스타일·얼굴형·안경·눈썹)는 jy-model 브랜치에서 가져온
// toonHeadOptions.js / customParts.js 를 그대로 쓴다. 이 파일은 그 데이터를
// 앱이 쓰는 형태(축 목록·정규화·SVG 생성·PNG 변환)로 잇는 어댑터다.
//
// 파츠를 추가·수정할 일이 생기면 이 파일이 아니라 위 두 파일을 고칠 것.

import { createAvatar } from "@dicebear/core";
import { toonHead } from "@dicebear/collection";
import {
  BEARD, CLOTHES, CLOTHES_COLORS, DEFAULT_TOONHEAD, EYES, HAIR_COLORS,
  HAIR_STYLES, MOUTH, SKIN_COLORS, TOONHEAD_CREDIT,
  hairStyleById, toDicebearOptions,
} from "./toonHeadOptions.js";
import {
  BROW_SHAPE_ITEMS, BROW_THICKNESS, FACE_SHAPES, GLASSES_OPTIONS,
  overlayCustomHair, overlayEars, overlayGlasses, replaceBrows, replaceFaceShape,
} from "./customParts.js";

export { TOONHEAD_CREDIT };

const NONE = "none"; // 빌더에서 "없음"을 고른 상태
const items = (obj) => Object.entries(obj).map(([id, v]) => ({ id, label: v.label }));

// 빌더가 순서대로 그리는 축. label 은 한글, values 는 {id,label}.
export const AXES = [
  { key: "hairStyle", label: "머리", values: HAIR_STYLES.map((h) => ({ id: h.id, label: h.label })) },
  { key: "face", label: "얼굴형", values: items(FACE_SHAPES) },
  { key: "eyes", label: "눈", values: EYES },
  { key: "eyebrows", label: "눈썹", values: BROW_SHAPE_ITEMS, avoidInRandom: ["angry", "sad"] },
  { key: "browThickness", label: "눈썹 두께", values: BROW_THICKNESS.map((t) => ({ id: t.id, label: t.label })) },
  { key: "glasses", label: "안경", values: GLASSES_OPTIONS },
  { key: "mouth", label: "입", values: MOUTH, avoidInRandom: ["sad", "angry", "agape"] },
  { key: "beard", label: "수염", values: BEARD, nullable: true },
  { key: "clothes", label: "의상", values: CLOTHES },
];

export const COLOR_AXES = [
  { key: "skinColor", label: "피부", values: SKIN_COLORS },
  { key: "hairColor", label: "머리색", values: HAIR_COLORS },
  { key: "clothesColor", label: "옷색", values: CLOTHES_COLORS },
];

export const DEFAULT_AVATAR = { ...DEFAULT_TOONHEAD };

// 저장된 설정이 목록에 없는 값이면 기본값으로 떨어뜨린다.
// 예전 아바타(react-nice-avatar·Figma 3D·avataaars)의 설정이 남아 있어도
// 키가 하나도 안 맞으므로 전부 기본값이 된다 — 크래시 없이 조용히 초기화된다.
export function normalizeAvatar(config) {
  const c = (config && typeof config === "object") ? config : {};
  const out = {};
  for (const axis of AXES) {
    const ok = axis.values.some((v) => v.id === c[axis.key]);
    if (ok) out[axis.key] = c[axis.key];
    else if (axis.nullable && (c[axis.key] === null || c[axis.key] === NONE)) out[axis.key] = null;
    else out[axis.key] = DEFAULT_AVATAR[axis.key];
  }
  for (const axis of COLOR_AXES) {
    out[axis.key] = axis.values.includes(c[axis.key]) ? c[axis.key] : DEFAULT_AVATAR[axis.key];
  }
  return out;
}

export function avatarSvg(config) {
  const c = normalizeAvatar(config);
  const style = hairStyleById(c.hairStyle);

  // scale 80: toonHead 은 기본 배율에서 인물이 캔버스를 꽉 채워, 원형으로 자르면
  // 머리 위쪽(특히 번머리·뾰족머리)이 잘린다. 70 은 인물이 작고 92 부터 다시 잘린다.
  let svg = createAvatar(toonHead, {
    seed: "me", size: 256, scale: 80, ...toDicebearOptions(c),
  }).toString();

  // 순서가 중요하다: 얼굴형·눈썹은 생성된 SVG 를 '교체'하고,
  // 커스텀 앞머리·귀·안경은 그 위에 '덧그린다'.
  svg = replaceFaceShape(svg, c.face);
  svg = replaceBrows(svg, c.eyebrows, c.browThickness, `#${c.hairColor}`);
  if (style.custom) {
    svg = overlayCustomHair(svg, style.hair, {
      hair: `#${c.hairColor}`, skin: `#${c.skinColor}`, clothes: `#${c.clothesColor}`,
    });
    // 커스텀 앞머리가 귀를 덮으므로 귀만 다시 위에 그려 앞으로 빼낸다.
    svg = overlayEars(svg, `#${c.skinColor}`);
  }
  return overlayGlasses(svg, c.glasses);
}

export function avatarDataUri(config) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(avatarSvg(config))}`;
}

// 랜덤 조합 — "다시 뽑기" 버튼용. 수염·안경은 가끔만, 화난·슬픈 표정은 제외한다.
const NONE_CHANCE = { beard: 0.75, glasses: 0.6 };

export function randomAvatar() {
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const out = {};
  for (const axis of AXES) {
    if (axis.nullable && Math.random() < (NONE_CHANCE[axis.key] ?? 0.5)) {
      out[axis.key] = null;
      continue;
    }
    let pool = axis.values.filter((v) => !(axis.avoidInRandom ?? []).includes(v.id));
    // 안경은 nullable 축이 아니라 목록 안에 "없음"이 들어 있다.
    if (axis.key === "glasses" && Math.random() < NONE_CHANCE.glasses) {
      out[axis.key] = NONE;
      continue;
    }
    if (axis.key === "glasses") pool = pool.filter((v) => v.id !== NONE);
    out[axis.key] = pick(pool.length ? pool : axis.values).id;
  }
  for (const axis of COLOR_AXES) out[axis.key] = pick(axis.values);
  return out;
}

export { NONE };
