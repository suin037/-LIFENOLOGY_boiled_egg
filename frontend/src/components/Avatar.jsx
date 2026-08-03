import NiceAvatar from "react-nice-avatar";
import { normalizeAvatar } from "../data/avatarOptions.js";

// react-nice-avatar 를 앱의 원형 프레임(우주 링)에 감싼다.
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
        boxShadow: ring ? "0 0 0 2px rgba(127,212,255,0.45)" : "none",
      }}
    >
      <NiceAvatar style={{ width: `${size}px`, height: `${size}px` }} {...c} shape="circle" />
    </div>
  );
}
