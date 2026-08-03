import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import Avatar from "../components/Avatar.jsx";

// 설정의 SVG 아바타를 Cloudflare 참고 이미지용 512px PNG로 변환한다.
export async function avatarToPngBlob(config) {
  let svg = renderToStaticMarkup(createElement(Avatar, { config, size: 512 }));
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
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#f3f0ea";
    ctx.fillRect(0, 0, 512, 512);
    ctx.drawImage(rendered, 112, 64, 288, 288, 32, 32, 448, 448);
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
