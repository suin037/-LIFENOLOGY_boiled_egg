import { Card, Caption } from "../ui.jsx";
import { LIFE_DIMENSIONS, labelOf } from "../../data/prediction.js";

// 생활지표(L1) — 공통 지표는 한 번, 선택지별 지표는 A/B 태그로.
export default function LifeView({ a, b }) {
  const key = (it) => it.indicator;
  const bKeys = new Set(b.life_indicators.map(key));
  const aKeys = new Set(a.life_indicators.map(key));

  const shared = a.life_indicators.filter((it) => bKeys.has(key(it)));
  const extraA = a.life_indicators.filter((it) => !bKeys.has(key(it)));
  const extraB = b.life_indicators.filter((it) => !aKeys.has(key(it)));

  return (
    <div>
      <h2 className="mb-1 mt-1 text-base font-semibold">생활지표 패널</h2>
      <Caption>당신 또래 집단의 실측 지표입니다. 선택과 무관하게 항상 제공됩니다.</Caption>

      <div className="mt-3 space-y-2.5">
        {shared.map((it, i) => <Indicator key={`s${i}`} it={it} />)}
        {extraA.map((it, i) => <Indicator key={`a${i}`} it={it} tag={`A · ${labelOf(a.choice)}`} tagColor="#7FD4FF" />)}
        {extraB.map((it, i) => <Indicator key={`b${i}`} it={it} tag={`B · ${labelOf(b.choice)}`} tagColor="#F5C86B" />)}
      </div>
    </div>
  );
}

function Indicator({ it, tag, tagColor }) {
  const meta = LIFE_DIMENSIONS[it.dimension] || { icon: "•", color: "#9FB0CE" };
  return (
    <div className="rounded-2xl border border-line bg-card p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-base">{meta.icon}</span>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px]" style={{ color: meta.color }}>{it.dimension}</span>
              {tag && (
                <span className="rounded px-1 py-0.5 text-[9px] font-bold" style={{ color: tagColor, background: "#0E1424" }}>
                  {tag}
                </span>
              )}
            </div>
            <div className="text-[13px] text-ink">{it.indicator}</div>
          </div>
        </div>
        <div className="whitespace-nowrap text-right">
          <span className="text-lg font-bold text-ink">{it.value}</span>
          <span className="ml-0.5 text-[11px] text-sub">{it.unit}</span>
        </div>
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[10px] text-mut">
        <span>{it.group}</span>
        <span>{it.source}{it.n ? ` · n=${it.n.toLocaleString()}` : ""}</span>
      </div>
    </div>
  );
}
