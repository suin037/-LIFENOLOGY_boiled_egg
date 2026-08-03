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
  const descriptive = result.descriptive_effect ?? result.causal_effect;
  const effect = result.causal_effect;
  const gap = +(descriptive - effect).toFixed(1);
  const scale = descriptive * 1.14;
  const w = (v) => `${(v / scale) * 100}%`;

  return (
    <>
      <Card highlight>
        <div className="text-[11px] font-bold tracking-[2px] text-cyan">
          {labelOf(result.choice)} · 겉보기 vs 진짜 효과 (만원)
        </div>
        <div className="mt-2.5 text-xs text-sub">겉보기 (그냥 비교)</div>
        <div className="relative my-1.5 h-3.5 rounded-[7px] bg-[#16203A]">
          <span className="absolute inset-y-0 left-0 rounded-[7px] bg-gradient-to-r from-cyan to-cyan-deep opacity-60" style={{ width: w(descriptive) }} />
        </div>
        <div className="flex justify-end text-xs font-bold text-ink">+{descriptive}만원</div>
        <div className="mt-2.5 text-xs text-sub">순수 효과 (선택편향 제거)</div>
        <div className="relative my-1.5 h-3.5 rounded-[7px] bg-[#16203A]">
          <span className="absolute inset-y-0 left-0 rounded-[7px] bg-cyan" style={{ width: w(effect) }} />
        </div>
        <div className="flex justify-end text-xs font-bold text-ink">+{effect}만원</div>
        <Caption className="mt-2.5">
          차이 {gap}만원 = ‘원래 조건이 좋은 사람이 이직도 많이 한’ 선택편향. 이걸 걷어낸 게 진짜
          이직 효과입니다.
        </Caption>
      </Card>
      <Caption>겉보기 수치를 그대로 믿지 않도록 인과추론(EconML)으로 편향을 덜어낸 값입니다.</Caption>
    </>
  );
}
