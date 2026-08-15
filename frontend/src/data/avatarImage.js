import { createElement } from "react";
import { createRoot } from "react-dom/client";
import html2canvas from "html2canvas";
import { normalizeAvatar } from "./avatarOptions.js";
import { AvatarVisual } from "../components/Avatar.jsx";

// 설정의 조합형 아바타 DOM을 Cloudflare 참고 이미지용 PNG로 변환한다.
// foreignObject SVG를 canvas에 그리면 브라우저가 canvas를 taint하므로,
// html2canvas로 실제 DOM 레이어를 직접 캡처한다.
export async function avatarToPngBlob(config) {
  const normalized = normalizeAvatar(config);
  const host = document.createElement("div");
  host.style.cssText = [
    "position:fixed",
    "left:-10000px",
    "top:0",
    "width:512px",
    "height:512px",
    "overflow:hidden",
    "pointer-events:none",
  ].join(";");
  document.body.appendChild(host);

  const root = createRoot(host);
  try {
    root.render(createElement(AvatarVisual, { config: normalized, size: 512 }));
    // React 렌더와 SVG 레이아웃이 모두 반영된 다음 캡처한다.
    await nextFrame();
    await nextFrame();

    const rendered = await html2canvas(host, {
      backgroundColor: null,
      width: 512,
      height: 512,
      scale: 1,
      logging: false,
      useCORS: false,
    });

    // 얼굴과 머리 전체가 함께 들어오도록 자른다. 너무 좁게 자르면 긴 머리·모자·안경이
    // 사라져 생성 모델이 사용자를 다른 인물로 해석하기 쉽다.
    // Cloudflare reference input 제한에 맞춰 결과는 512px보다 작게 유지한다.
    const canvas = document.createElement("canvas");
    canvas.width = 480;
    canvas.height = 480;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#f3f0ea";
    ctx.fillRect(0, 0, 480, 480);
    ctx.drawImage(rendered, 64, 24, 384, 384, 20, 20, 440, 440);

    return await canvasToBlob(canvas);
  } finally {
    root.unmount();
    host.remove();
  }
}

function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("아바타 PNG 변환 실패")),
      "image/png",
    );
  });
}
