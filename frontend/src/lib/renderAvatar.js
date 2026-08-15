// 아바타 렌더링. UI 와 분리돼 있어서 어떤 화면에서든 쓸 수 있다.
//
// 쓰는 법:
//   import { avatarDataUri, DEFAULT_AVATAR } from ".../renderAvatar.js";
//   <img src={avatarDataUri(config)} width={96} height={96} />
//
// config 는 DEFAULT_AVATAR 모양의 평범한 객체다. 일부만 넘겨도 나머지는 기본값으로 채워진다.
// 선택지 목록(HAIR_STYLES, EYES, ...)이 필요하면 data/avatarOptions.js 에서 가져다 쓰면 된다.

import { createAvatar } from "@dicebear/core";
import { toonHead } from "@dicebear/collection";
import {
  DEFAULT_AVATAR,
  hairStyleById,
  toDicebearOptions,
} from "../data/avatarOptions.js";
import {
  fitBeard,
  overlayCustomHair,
  overlayEars,
  overlayGlasses,
  replaceBrows,
  replaceFaceShape,
} from "../data/customParts.js";

export { DEFAULT_AVATAR };

/**
 * config → SVG 문자열.
 *
 * @param {object} config  아바타 설정(DEFAULT_AVATAR 참고). 일부만 넘겨도 된다.
 * @param {object} options DiceBear 옵션을 그대로 덧붙인다.
 *                         size / scale / translateX / translateY / flip / radius 등 전부 쓸 수 있고,
 *                         커스텀 파츠도 같이 변환된다(customParts.insertIntoBody 참고).
 */
export function renderAvatarSvg(config, options = {}) {
  const c = { ...DEFAULT_AVATAR, ...(config || {}) };
  const style = hairStyleById(c.hairStyle);

  let svg = createAvatar(toonHead, {
    seed: "me", // 우리가 모든 파츠를 지정하므로 시드는 고정해도 된다
    size: 200,
    ...toDicebearOptions(c),
    ...options,
  }).toString();

  // 순서가 중요하다.
  //   1) 얼굴형·눈썹은 원본 조각을 '교체'
  //   2) 수염은 바뀐 턱에 맞춰 늘림
  //   3) 커스텀 앞머리 → 그 위에 귀 → 안경 순으로 '덧그림'
  svg = replaceFaceShape(svg, c.face);
  svg = replaceBrows(svg, c.eyebrows, c.browThickness, "#" + c.hairColor);
  svg = fitBeard(svg, c.beard, c.eyes, c.face);
  if (style.custom) {
    svg = overlayCustomHair(svg, style.hair, {
      hair: "#" + c.hairColor,
      skin: "#" + c.skinColor,
      clothes: "#" + c.clothesColor,
    });
    // 커스텀 앞머리가 귀를 덮으므로 귀만 다시 위에 그려 앞으로 빼낸다.
    svg = overlayEars(svg, "#" + c.skinColor);
  }
  svg = overlayGlasses(svg, c.glasses);
  return svg;
}

/** config → <img src> 에 바로 넣을 수 있는 dataURI. */
export function avatarDataUri(config, options = {}) {
  return "data:image/svg+xml;utf8," + encodeURIComponent(renderAvatarSvg(config, options));
}
