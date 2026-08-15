// 직접 그린 파츠를 여기에 추가한다.
//
// toonHead 는 768x768 좌표계를 쓴다. 머리 중심은 대략 (384, 312), 반지름 약 213.
// 얼굴 맨 위는 y≈98, 눈은 y≈330~390 근처다. 이 좌표에 맞춰 그리면 된다.
//
// 각 파츠는 (colors) => SVG 문자열 을 반환하는 함수다.
// colors.hair / colors.skin / colors.clothes 에 현재 선택된 색이 '#RRGGBB' 로 들어온다.
//
// 원본 toonHead 는 CC BY 4.0 이라 개작(2차 창작)이 허용된다. 다만 원저자 표기는 유지해야 한다.
// 같은 화풍으로 제대로 그리고 싶으면 아래 '정공법'을 참고:
//   1. 원본 Figma 파일을 복제  https://www.figma.com/community/file/1589627891082866389
//   2. 거기서 같은 스타일로 파츠를 그린다
//   3. "DiceBear Exporter" 플러그인으로 내보낸다
//      https://www.figma.com/community/plugin/1005765655729342787
// 그러면 이 파일에 손으로 SVG 를 붙이는 대신 스타일 패키지째 교체할 수 있다.

/**
 * 커스텀 앞머리(hair 자리). z-order 상 맨 위에 얹힌다.
 * key 가 그대로 id 가 되고, label 이 빌더에 표시된다.
 */
export const CUSTOM_HAIR = {
  // 여기에 항목을 추가하면 헤어스타일 목록에 자동으로 붙는다.
  // 형식: id: { label: "이름", svg: (colors) => `<g>...</g>` }

  // 이마를 덮는 앞머리(뱅). toonHead 빌트인 앞머리 4종(옆가르마·언더컷·뾰족머리·번머리)은
  // 전부 이마가 드러나는 스타일이라 '앞머리 있음'을 표현할 수가 없어서 새로 그렸다.
  // 두개골 윤곽(y140 꼭대기, 양옆 x225/x543)은 원본 얼굴선과 같은 곡선을 쓴다.
  bangs: {
    label: "앞머리",
    // 밑단은 일자로 뚝 자른다(y=338, 눈썹 바로 위). 둥글게 파면 어색하다.
    // 양옆은 관자놀이를 따라 내려서 뒷머리와 맞물리게 하되, 귀(y≈410~480) 바로 위인
    // y=400 에서 끊는다. 더 내리면 귀를 덮어버리고, 덜 내리면 앞머리가 모자처럼 따로 논다.
    // 두상에 딱 붙이면 머리카락 부피가 없어 보인다. 정수리를 y=110 까지(두상보다 30px 위)
    // 올리고 옆도 바깥으로 벌려서 머리카락이 얹힌 부피감을 준다.
    svg: (colors) => `
      <path d="M196 448C170 268 198 110 384 110C570 110 598 268 572 448
               L518 338L250 338Z"
            fill="${colors.hair}" stroke="black" stroke-width="6" stroke-linejoin="round"/>`,
  },
};

/** 커스텀 파츠 id 인지 판별 (빌트인 id 와 구분하려고) */
export function isCustomHair(id) {
  return Object.prototype.hasOwnProperty.call(CUSTOM_HAIR, id);
}

// 교체 방식의 함정: 대상 문자열이 한 글자라도 다르면 그냥 아무 일도 일어나지 않는다.
// 기능이 조용히 죽는 걸 막으려고 개발 중에는 콘솔에 경고를 띄운다.
// (DiceBear 패키지를 올리면 원본 문자열이 바뀔 수 있는데, 그때 여기서 바로 드러난다.)
const warned = new Set();
function warnMissing(what) {
  if (import.meta.env?.DEV && !warned.has(what)) {
    warned.add(what);
    console.warn(
      `[avatar] ${what} 교체 대상 문자열을 못 찾았습니다. ` +
        `@dicebear/toon-head 가 업데이트돼 원본이 바뀌었을 수 있습니다. customParts.js 를 확인하세요.`
    );
  }
}

// ── 얼굴형 ────────────────────────────────────────────────────────────────
// toonHead 의 head 컴포넌트는 변형이 1종뿐이고, 패키지가 내부 컴포넌트 import 를
// 막아놨다(exports 가 lib/index.js 만 허용). 그래서 '덧그리기'가 아니라
// 생성된 SVG 안의 head path 를 문자열 교체한다.
//
// 원본 path 를 통째로 새로 그리지 않고 '턱선 구간만' 바꿨다. 앞부분(귀 돌기 + 두개골)은
// 원본 그대로라 화풍과 눈·귀 위치가 어긋나지 않는다.
//
// 좌표 기준: 이마 꼭대기 y≈140, 귀 y≈400~495, 턱 끝 y≈591, 얼굴 폭 x≈191~577.

// 원본 head path 의 d 값. 이 문자열을 찾아 바꾼다.
// 패키지가 업데이트돼 이 문자열이 사라지면 교체를 건너뛰고 원본 얼굴이 나온다(조용히 실패).
const ORIGINAL_HEAD_D =
  "M191.5 452.5c-20-77.5 33.5-50 33.5-50C189.18 286.68 217 140 384 140s194.82 146.68 159 262.5c0 0 53.5-27.5 33.5 50-11.1 43-51 43-51 43C519.57 545.9 434 591 384 591s-135.57-45.1-141.5-95.5c0 0-39.9 0-51-43Z";

// 귀 돌기까지의 공통 앞부분. 여기서부터 턱선만 갈라진다.
const SKULL =
  "M191.5 452.5c-20-77.5 33.5-50 33.5-50C189.18 286.68 217 140 384 140s194.82 146.68 159 262.5c0 0 53.5-27.5 33.5 50-11.1 43-51 43-51 43";
// 왼쪽 귀 아래로 돌아와 닫는 공통 끝부분.
const TAIL = "c0 0-39.9 0-51-43Z";

// 턱선 구간은 반드시 (525.5, 495.5) 에서 시작해 (242.5, 495.5) 로 끝나야 한다.
// 이 두 점이 좌우 귀 아래 연결부다. 어긋나면 귀 밑에 각진 돌기가 튀어나온다.
// 상대좌표로 쓰면 계산이 틀어지기 쉬워서 전부 절대좌표(C)로 쓴다.
export const FACE_SHAPES = {
  original: { label: "기본형", d: null }, // null = 원본 그대로
  oval: {
    label: "계란형",
    // 볼에서 부드럽게 좁아지며 턱이 길어진다.
    d: `${SKULL}C505 560 425 606 384 606C343 606 251 560 242.5 495.5${TAIL}`,
  },
  square: {
    label: "네모형",
    // 각을 세게 주면 턱이 넓고 투박해진다. 원본 곡선을 거의 살리고
    // 턱 밑만 살짝 평평하게 깎았다(평평한 구간 x320~448, 폭 128).
    d: `${SKULL}C516 545 470 578 448 582C425 586 343 586 320 582C298 578 252 545 242.5 495.5${TAIL}`,
  },
  pointed: {
    label: "뾰족한 턱",
    // V라인: 볼 아래부터 급히 모여 턱 끝이 좁고 길다.
    d: `${SKULL}C500 540 424 616 384 620C344 616 268 540 242.5 495.5${TAIL}`,
  },
  pointedShort: {
    label: "뾰족한 턱 (짧게)",
    // 위와 같은 V라인이지만 턱 끝을 585 까지만 내린다(원본 591 보다도 짧다).
    d: `${SKULL}C502 534 428 582 384 585C340 582 266 534 242.5 495.5${TAIL}`,
  },
};

/** 생성된 SVG 안의 얼굴 path 를 교체한다. */
export function replaceFaceShape(svg, faceId) {
  const face = FACE_SHAPES[faceId];
  if (!face || !face.d) return svg;
  if (!svg.includes(ORIGINAL_HEAD_D)) return warnMissing("얼굴형"), svg;
  return svg.replace(ORIGINAL_HEAD_D, face.d);
}

// ── 눈썹 (모양 + 두께) ────────────────────────────────────────────────────
// 빌트인 눈썹은 '채워진 path' 라서 두께만 따로 조절할 수가 없다.
// 그래서 선(stroke)으로 다시 그린다. stroke-width 가 곧 눈썹 두께가 된다.
// 눈처럼 교체 방식이라, 커스텀 눈썹을 쓸 땐 항상 'neutral' 로 생성한 뒤 그 자리를 바꾼다.
// 고정 문자열로 잡으면 안 된다. 소스에는 fill="undefined" 로 적혀 있지만
// DiceBear 가 출력할 때 그 자리에 '선택된 머리색'을 넣어버린다(예: fill="#2c1b18").
// 즉 머리색을 바꿀 때마다 문자열이 달라진다. 그래서 색에 의존하지 않는 정규식으로 잡는다.
// 앵커는 눈썹 path 의 시작 좌표(M305.33) — 이건 색과 무관하게 고정이다.
const NEUTRAL_BROWS_RE = /<g fill="[^"]*"><path d="M305\.33[\s\S]*?<\/g>/;

const MIRROR = 767; // 얼굴 좌우 대칭축 x=383.5 기준. 오른쪽 x = MIRROR - 왼쪽 x

/** 왼쪽 눈썹 곡선(절대좌표). 오른쪽은 자동으로 좌우 반전한다. */
const BROW_SHAPES = {
  neutral: { label: "무표정", d: [270, 344, 312, 322, 350, 336] },
  raised: { label: "올린", d: [270, 350, 312, 316, 350, 328] },
  happy: { label: "웃는", d: [270, 342, 312, 316, 350, 342] },
  sad: { label: "처진", d: [270, 326, 312, 340, 350, 352] },
  angry: { label: "화난", d: [270, 352, 312, 334, 350, 320] },
};

export const BROW_THICKNESS = [
  { id: "thin", label: "얇게", w: 9 },
  { id: "normal", label: "보통", w: 14 },
  { id: "thick", label: "두껍게", w: 20 },
];

export const BROW_SHAPE_ITEMS = Object.entries(BROW_SHAPES).map(([id, s]) => ({
  id,
  label: s.label,
}));

function browPath([x1, y1, cx, cy, x2, y2], flip) {
  const f = (x) => (flip ? MIRROR - x : x);
  return `M${f(x1)} ${y1} Q${f(cx)} ${cy} ${f(x2)} ${y2}`;
}

export function isCustomBrowShape(id) {
  return Object.prototype.hasOwnProperty.call(BROW_SHAPES, id);
}

/** 'neutral' 로 그려진 눈썹을 지정한 모양·두께로 교체한다. */
export function replaceBrows(svg, shapeId, thicknessId, color) {
  const shape = BROW_SHAPES[shapeId];
  const thick = BROW_THICKNESS.find((t) => t.id === thicknessId) || BROW_THICKNESS[1];
  if (!shape) return svg;
  if (!NEUTRAL_BROWS_RE.test(svg)) return warnMissing("눈썹"), svg;
  const stroke = `stroke="${color}" stroke-width="${thick.w}" stroke-linecap="round" fill="none"`;
  return svg.replace(
    NEUTRAL_BROWS_RE,
    `<g ${stroke}><path d="${browPath(shape.d, false)}"/><path d="${browPath(shape.d, true)}"/></g>`
  );
}

// ── 귀 다시 그리기 ────────────────────────────────────────────────────────
// 커스텀 앞머리는 맨 위에 덧씌우는 방식이라 귀를 가려버린다.
// 그렇다고 앞머리를 귀 위에서 끊으면 그 아래 두상이 불룩해지는 구간에 빈칸이 생긴다.
// 그래서 앞머리로 빈칸을 채운 뒤, 귀만 그 위에 다시 그려 앞으로 빼낸다.
//
// 아래 좌표는 원본 head path 의 귀 구간을 그대로 뒤집어 쓴 것이라 원본과 정확히 겹친다.
//   왼쪽 귀 : (225,402.5) ↔ (191.5,452.5) ↔ (242.5,495.5)
//   오른쪽은 x' = 768 - x 로 대칭.
const EAR_L = "M225 402.5C225 402.5 171.5 375 191.5 452.5C202.6 495.5 242.5 495.5 242.5 495.5Z";
const EAR_R = "M543 402.5C543 402.5 596.5 375 576.5 452.5C565.4 495.5 525.5 495.5 525.5 495.5Z";
// 원본 head 의 귀 안쪽 음영(검정 20%). 이것까지 얹어야 원본과 똑같아 보인다.
const EAR_SHADE =
  "M202.22 410c19.81-10.14 38.7 54.5 30 69-16.5 8.5-55-56.21-30-69m363.96 0c-19.82-10.14-38.7 54.5-30 69 16.5 8.5 55-56.21 30-69";

/** 머리카락 위에 귀를 다시 그려 앞으로 빼낸다. */
export function overlayEars(svg, skinColor) {
  const close = svg.lastIndexOf("</svg>");
  if (close < 0) return svg;
  const ears =
    `<g fill="${skinColor}" stroke="black" stroke-width="4">` +
    `<path d="${EAR_L}"/><path d="${EAR_R}"/></g>` +
    `<path d="${EAR_SHADE}" fill="black" fill-opacity="0.2"/>`;
  return svg.slice(0, close) + ears + svg.slice(close);
}

// ── 안경 ──────────────────────────────────────────────────────────────────
// toonHead 에는 안경 컴포넌트가 아예 없다(beard/body/clothes/eyebrows/eyes/hair/head/mouth/rearHair 가 전부).
// 그래서 안경은 새로 그려서 맨 위에 덧씌운다. 눈 위에 얹히므로 z-order 문제도 없다.
const FRAME = "#2B2B2B";

// 원본 눈동자 중심. 안경을 여기에 맞춰야 얼굴과 어긋나지 않는다.
const EYE_L = 314;
const EYE_R = 453;
const EYE_Y = 412;

function glassesSvg(shape) {
  const lens =
    shape === "round"
      ? `<circle cx="${EYE_L}" cy="${EYE_Y}" r="52"/><circle cx="${EYE_R}" cy="${EYE_Y}" r="52"/>`
      : `<rect x="${EYE_L - 54}" y="${EYE_Y - 40}" width="108" height="80" rx="14"/>` +
        `<rect x="${EYE_R - 54}" y="${EYE_Y - 40}" width="108" height="80" rx="14"/>`;
  return `<g fill="none" stroke="${FRAME}" stroke-width="9" stroke-linecap="round">
    ${lens}
    <path d="M${EYE_L + 54} ${EYE_Y - 6}h${EYE_R - EYE_L - 108}"/>
    <path d="M${EYE_L - 54} ${EYE_Y - 10}l-46-12"/>
    <path d="M${EYE_R + 54} ${EYE_Y - 10}l46-12"/>
  </g>`;
}

export const GLASSES_OPTIONS = [
  { id: "none", label: "없음" },
  { id: "round", label: "동그란 안경" },
  { id: "square", label: "각진 안경" },
];

/** 완성된 SVG 맨 위에 안경을 덧씌운다. */
export function overlayGlasses(svg, glassesId) {
  if (!glassesId || glassesId === "none") return svg;
  const close = svg.lastIndexOf("</svg>");
  if (close < 0) return svg;
  return svg.slice(0, close) + glassesSvg(glassesId) + svg.slice(close);
}

/**
 * DiceBear 가 만든 SVG 문자열 뒤에 커스텀 파츠를 덧그린다.
 * toonHead 의 z-order 는 ... eyes → eyebrows → hair 순서라, 맨 끝에 붙이면 hair 자리와 같다.
 */
export function overlayCustomHair(svg, hairId, colors) {
  const part = CUSTOM_HAIR[hairId];
  if (!part) return svg;
  const close = svg.lastIndexOf("</svg>");
  if (close < 0) return svg;
  return svg.slice(0, close) + part.svg(colors) + svg.slice(close);
}
