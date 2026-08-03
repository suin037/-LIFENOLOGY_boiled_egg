import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import Avatar from "../components/Avatar.jsx";

// 설정의 아바타(react-nice-avatar)를 Cloudflare 참고 이미지용 512px PNG로 변환한다.
// react-nice-avatar 는 <div><svg>..</div> 구조라 그대로는 SVG 로 못 쓴다 →
// foreignObject 로 감싸 하나의 SVG 로 만든 뒤 캔버스에 래스터라이즈한다.
export async function avatarToPngBlob(config) {
  const inner = renderToStaticMarkup(createElement(Avatar, { config, size: 512, ring: false }));
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">' +
    '<foreignObject x="0" y="0" width="512" height="512">' +
    '<div xmlns="http://www.w3.org/1999/xhtml" style="width:512px;height:512px">' +
    inner +
    "</div></foreignObject></svg>";
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
