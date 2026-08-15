import { avatarDataUri } from "../lib/renderAvatar.js";
import { normalizeAvatar } from "../data/avatarOptions.js";

// 기존 화면들이 쓰던 그대로의 API: <Avatar config={...} size={96} ring />
// 속을 react-nice-avatar 에서 toonHead 로 갈아끼운 것뿐이라 호출부는 손댈 필요가 없다.
export default function Avatar({ config, size = 96, ring = true }) {
  const c = normalizeAvatar(config);
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        overflow: "hidden",
        flexShrink: 0,
        boxShadow: ring ? "0 0 0 2px rgba(139,108,207,0.45)" : "none",
      }}
    >
      <img
        src={avatarDataUri(c, { size })}
        alt=""
        width={size}
        height={size}
        style={{ display: "block", width: "100%", height: "100%" }}
      />
    </div>
  );
}
