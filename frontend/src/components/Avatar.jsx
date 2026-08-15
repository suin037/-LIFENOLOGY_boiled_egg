import NiceAvatar from "react-nice-avatar";
import { normalizeAvatar } from "../data/avatarOptions.js";

export function AvatarVisual({ config, size = 96 }) {
  const c = normalizeAvatar(config);
  const showLeft = c.earringStyle === "double";
  const showRight = c.earringStyle === "single" || c.earringStyle === "double";
  const jewel = (side) => <span aria-hidden="true" style={{
    position: "absolute", top: "58%", [side]: "11%", width: "7%", height: "10%",
    borderRadius: "999px", border: `${Math.max(1, size * .012)}px solid rgba(255,255,255,.8)`,
    background: c.earringColor, boxShadow: `0 0 ${Math.max(3, size * .04)}px ${c.earringColor}`,
  }} />;
  return <div style={{ position:"relative", width:size, height:size }}>
    <NiceAvatar style={{ width: `${size}px`, height: `${size}px` }} {...c} shape="circle" />
    {showLeft && jewel("left")}{showRight && jewel("right")}
  </div>;
}

export default function Avatar({ config, size = 96, ring = true }) {
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
      <AvatarVisual config={config} size={size} />
    </div>
  );
}
