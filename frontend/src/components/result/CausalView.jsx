import { Card, Caption } from "../ui.jsx";

// 인과: 겉보기 소득변화 vs 이직 자체의 순수 효과. 차이 = 선택편향.
export default function CausalView({ result }) {
  const { descriptive, effect, ci } = result.causal;
  const gap = +(descriptive - effect).toFixed(1); // 4.9%p
  const scale = descriptive * 1.14; // 막대 스케일 (헤드룸)
  const w = (v) => `${(v / scale) * 100}%`;

  return (
    <div>
      <Card highlight>
        <div className="text-[11px] font-bold tracking-[2px] text-cyan">겉보기 vs 진짜 효과</div>

        {/* 겉보기 */}
        <div className="mt-2.5 text-xs text-sub">겉보기 (그냥 비교)</div>
        <div className="relative my-1.5 h-3.5 rounded-[7px] bg-[#16203A]">
          <span
            className="absolute inset-y-0 left-0 rounded-[7px] bg-gradient-to-r from-cyan to-cyan-deep opacity-60"
            style={{ width: w(descriptive) }}
          />
        </div>
        <div className="flex justify-end text-xs font-bold text-ink">+{descriptive}%</div>

        {/* 순수 효과 */}
        <div className="mt-2.5 text-xs text-sub">순수 효과 (선택편향 제거)</div>
        <div className="relative my-1.5 h-3.5 rounded-[7px] bg-[#16203A]">
          <span
            className="absolute inset-y-0 left-0 rounded-[7px] bg-cyan"
            style={{ width: w(effect) }}
          />
        </div>
        <div className="flex items-center justify-end gap-1.5 text-xs">
          <span className="text-mut">신뢰구간 {ci[0]}~{ci[1]}%</span>
          <span className="font-bold text-ink">+{effect}%</span>
        </div>

        <Caption className="mt-2.5">
          차이 {gap}%p = ‘원래 잘하던 사람이 이직도 많이 한’ 선택편향. 이걸 걷어낸 게 진짜 이직
          효과입니다.
        </Caption>
      </Card>
      <Caption>겉보기 수치를 그대로 믿지 않도록, 인과추론(EconML)으로 편향을 덜어낸 값입니다.</Caption>
    </div>
  );
}
