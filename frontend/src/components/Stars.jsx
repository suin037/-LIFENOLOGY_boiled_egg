import { useMemo } from "react";

// 배경 별. 주인공은 숫자이므로 은은하게(opacity 낮게). 한 번만 생성.
export default function Stars({ count = 26 }) {
  const stars = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        left: Math.random() * 100,
        top: Math.random() * 100,
        opacity: Math.random() * 0.45 + 0.12,
        scale: Math.random() * 1.3 + 0.5,
      })),
    [count],
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {stars.map((s, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-white"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: 2,
            height: 2,
            opacity: s.opacity,
            transform: `scale(${s.scale})`,
          }}
        />
      ))}
    </div>
  );
}
