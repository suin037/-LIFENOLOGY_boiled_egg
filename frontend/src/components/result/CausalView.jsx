import { Card, Caption } from "../ui.jsx";
import { labelOf } from "../../data/prediction.js";

// 인과(L3) — 개인단위(이직)만. A/B 중 해당 쪽 렌더.
export default function CausalView({ a, b }) {
  const sides = [a, b].filter((s) => s.causal_effect != null);
  if (!sides.length) {
    return <Card><Caption>선택한 두 갈래 모두 인과효과(EconML) 데이터가 없습니다.</Caption></Card>;
  }
  return <div>{sides.map((s, i) => <SideCausal key={i} result={s} />)}</div>;
}

function SideCausal({ result }) {
  const effect = result.causal_effect;
  const descriptive = result.descriptive_effect;
  const ci = result.confidence?.causal_effect_ci;
  const signed = (v) => `${v > 0 ? "+" : ""}${Number(v).toFixed(1)}만원`;
  const includesZero = ci?.ci95_low != null && ci?.ci95_high != null
    && ci.ci95_low <= 0 && ci.ci95_high >= 0;

  return (
    <>
      <Card highlight>
        <div className="text-[11px] font-bold tracking-[2px] text-cyan">
          {labelOf(result.choice)} · 단순 비교 vs 보정 추정치 (만원)
        </div>
        {descriptive != null && (
          <div className="mt-2.5 flex items-center justify-between rounded-lg bg-[#16203A] px-3 py-2 text-xs">
            <span className="text-sub">겉보기 단순 비교</span>
            <b className="text-ink">{signed(descriptive)}</b>
          </div>
        )}
        <div className="mt-2.5 text-xs text-sub">조건을 보정한 추정치</div>
        <div className="mt-1 text-right text-base font-bold text-ink">{signed(effect)}</div>
        {ci?.ci95_low != null && ci?.ci95_high != null && (
          <div className="mt-2 rounded-lg border border-line px-3 py-2 text-[11px] text-sub">
            95% 불확실성 범위: {signed(ci.ci95_low)} ~ {signed(ci.ci95_high)}
            {includesZero && <p className="mt-1 text-gold">0을 포함하므로 증가·감소를 확정할 수 없습니다.</p>}
          </div>
        )}
        <Caption className="mt-2.5">
          관측 가능한 조건을 일부 보정한 추정치이며 확정된 미래값이 아닙니다.
        </Caption>
      </Card>
      <Caption>나이·소득·학력 등 관측 가능한 조건을 보정한 추정치이며, 측정되지 않은 차이까지 제거한 확정 효과는 아닙니다.</Caption>
    </>
  );
}
