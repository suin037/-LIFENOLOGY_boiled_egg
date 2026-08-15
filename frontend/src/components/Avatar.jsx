import { useMemo } from "react";
import { avatarDataUri, normalizeAvatar } from "../data/avatarOptions.js";

export default function Avatar({ config, size = 96, ring = true }) {
  const c = normalizeAvatar(config);
  // SVG 생성은 순수 계산이라 설정이 바뀔 때만 다시 만든다.
  const src = useMemo(() => avatarDataUri(c), [JSON.stringify(c)]);
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        overflow: "hidden",
        flexShrink: 0,
        boxShadow: ring ? "0 0 0 2px rgba(76,145,255,0.45)" : "none",
      }}
    >
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        draggable={false}
        style={{ display: "block", width: "100%", height: "100%" }}
      />
    </div>
  );
}
