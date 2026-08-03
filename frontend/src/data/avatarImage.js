import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import NiceAvatar from "react-nice-avatar";
import { normalizeAvatar } from "./avatarOptions.js";

// 설정의 SVG 아바타를 Cloudflare 참고 이미지용 512px PNG로 변환한다.
export async function avatarToPngBlob(config) {
  const normalized = normalizeAvatar(config);
  // Avatar 컴포넌트의 바깥 div가 아니라 실제 SVG만 직렬화해야 이미지로 읽을 수 있다.
  let svg = renderToStaticMarkup(createElement(NiceAvatar, {
    ...normalized,
    shape: "circle",
    style: { width: "512px", height: "512px" },
  }));
  if (!svg.includes("xmlns=")) {
    svg = svg.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  const source = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(source);
  try {
    const image = await loadImage(url);
    // Send a face crop, not the avatar card. This prevents the image model from
    // copying the circular frame, clothing, centered pose, and background.
    const rendered = document.createElement("canvas");
    rendered.width = 512;
    rendered.height = 512;
    rendered.getContext("2d").drawImage(image, 0, 0, 512, 512);
    const canvas = document.createElement("canvas");
    // Cloudflare reference input은 512x512보다 작아야 한다.
    canvas.width = 480;
    canvas.height = 480;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#f3f0ea";
    ctx.fillRect(0, 0, 480, 480);
    ctx.drawImage(rendered, 112, 64, 288, 288, 30, 30, 420, 420);
    return await new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error("아바타 PNG 변환 실패")),
        "image/png",
      );
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("아바타 SVG 로드 실패"));
    image.src = url;
  });
}
