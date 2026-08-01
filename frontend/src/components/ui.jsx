// 화면 전반에서 재사용하는 작은 프리미티브들.

export function Eyebrow({ children }) {
  return (
    <div className="mb-2 mt-1.5 text-[11px] font-semibold tracking-[3px] text-mut">{children}</div>
  );
}

export function Card({ children, highlight = false, className = "" }) {
  return (
    <div
      className={`my-3 rounded-2xl border p-4 ${
        highlight ? "border-[#33507d] bg-card2" : "border-line bg-card"
      } ${className}`}
    >
      {children}
    </div>
  );
}

// 수치 옆 표본 수 표시 — 데이터 정직성 규칙: 항상 "(n명)"을 붙인다.
export function Sample({ n }) {
  return <span className="text-sub">({n}명)</span>;
}

export function Row({ label, children }) {
  return (
    <div className="mt-1.5 flex items-center justify-between text-xs text-sub">
      <span>{label}</span>
      <span className="text-ink">{children}</span>
    </div>
  );
}

export function Caption({ children, className = "" }) {
  return <p className={`mt-1.5 text-[11px] leading-relaxed text-mut ${className}`}>{children}</p>;
}

// 하단 출처·표본·관찰기간 고지 — 결과/유사 화면에 항상.
export function SourceFootnote({ meta }) {
  return (
    <div className="mt-3.5 text-center text-[10px] leading-relaxed text-mut">
      {meta.source} / 25~30세 {meta.n_sample}명 / 관찰 {meta.observe_years}년
      <br />
      모든 수치는 중앙값이며, 표본 수를 함께 표시합니다.
    </div>
  );
}

// 큰 CTA 버튼
export function Button({ children, onClick, variant = "primary", type = "button", className = "" }) {
  const base =
    "tap block w-full rounded-[26px] px-4 py-4 text-base font-bold transition-transform active:scale-[.98]";
  const styles =
    variant === "ghost"
      ? "border border-line bg-transparent font-semibold text-sub"
      : "border-none bg-gradient-to-r from-cyan to-cyan-deep text-[#04203a]";
  return (
    <button type={type} onClick={onClick} className={`${base} ${styles} ${className}`}>
      {children}
    </button>
  );
}
