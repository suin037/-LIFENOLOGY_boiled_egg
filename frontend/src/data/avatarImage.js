import { avatarSvg, normalizeAvatar } from "./avatarOptions.js";

// 선택한 아바타를 Cloudflare 참고 이미지용 PNG로 변환한다.
// DiceBear 가 만든 SVG 는 외부 리소스를 참조하지 않고 Blob URL 로 읽으므로
// canvas 가 taint 되지 않는다 — toBlob 이 그대로 성공한다.
const SIZE = 480;

export async function avatarToPngBlob(config) {
  const c = normalizeAvatar(config);
  const svg = avatarSvg(c);
  const img = await loadSvg(svg);

  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");

  // 생성 모델이 인물을 잘라 해석하지 않도록 배경을 채우고 여백을 남긴다.
  // 아바타 자체는 배경이 투명하다(빌더에 배경색 축이 없다). 참조 이미지로 보낼 때만
  // 중립적인 밝은 회색을 깔아 인물 윤곽이 배경과 뭉개지지 않게 한다.
  ctx.fillStyle = "#f3f0ea";
  ctx.fillRect(0, 0, SIZE, SIZE);
  const pad = Math.round(SIZE * 0.05);
  ctx.drawImage(img, pad, pad, SIZE - pad * 2, SIZE - pad * 2);

  return canvasToBlob(canvas);
}

function loadSvg(svg) {
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("아바타 SVG 렌더 실패")); };
    img.src = url;
  });
}

function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("아바타 PNG 변환 실패")),
      "image/png",
    );
  });
}
