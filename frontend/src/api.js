const BASE_URL = "http://localhost:8000";

export async function predict(input) {
  const res = await fetch(`${BASE_URL}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

/**
 * SVG 아바타를 구운 PNG 를 참조 이미지로 넘겨 실사 아바타를 생성한다.
 * @param {string} referencePng  "data:image/png;base64,..." (svgElementToPng 결과)
 * @param {string} prompt        buildAvatarPrompt 결과
 * @returns {Promise<string>}    생성된 이미지의 dataURL
 */
export async function generateAvatarPhoto(referencePng, prompt) {
  const res = await fetch(`${BASE_URL}/avatar/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reference_png: referencePng, prompt }),
  });
  if (!res.ok) {
    // 백엔드가 이유를 알려주면 그대로 보여준다(키 미설정 등).
    let detail = `API error: ${res.status}`;
    try {
      const body = await res.json();
      if (body.detail) detail = body.detail;
    } catch { /* 본문이 JSON 이 아니면 상태코드만 */ }
    throw new Error(detail);
  }
  const { image } = await res.json();
  return image;
}
