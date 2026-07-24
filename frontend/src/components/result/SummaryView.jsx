import { Card, Row, Sample, Caption } from "../ui.jsx";
import { totalNeighbors } from "../../data/result.js";

// 요약: 한 줄 결론 + Claude 서사 3블록.
// 규칙: 상승(+11%)과 감소(26%)를 같은 시각적 비중으로. 단정 금지, 관찰형.
export default function SummaryView({ result }) {
  const { option_a: a, option_b: b, scenario } = result;
  const total = totalNeighbors(result);
  const downCount = Math.round((a.income_down_pct / 100) * a.n); // 26% of 43 ≈ 11명

  return (
    <div>
      {/* 한 줄 결론 — 화면에서 가장 크게. 상승/감소 동일 비중. */}
      <p className="text-[15px] leading-relaxed">
        비슷한 별 <span className="font-bold text-cyan">{total}명</span> 중 이직한{" "}
        <span className="font-bold text-cyan">{a.n}명</span>은 소득 중앙값{" "}
        <span className="font-bold text-cyan">+{a.income_change_med}%</span>,
        <br />
        다만 <span className="font-bold text-danger">{a.income_down_pct}%({downCount}명)</span>는{" "}
        <span className="text-danger">오히려 줄었습니다</span>.
      </p>

      <Card>
        <h2 className="mb-1 text-base font-semibold">이직(A) vs 잔류(B), 실제 결과</h2>
        <Row label="소득 변화 (중앙값)">
          <span className="font-bold text-cyan">+{a.income_change_med}%</span> <Sample n={a.n} /> vs{" "}
          <span className="font-bold text-gold">{b.income_change_med}%</span> <Sample n={b.n} />
        </Row>
        <Row label="소득 감소한 비율">
          <span className="font-bold text-danger">{a.income_down_pct}%</span> vs{" "}
          <span className="text-sub">{b.income_down_pct}%</span>
        </Row>
        <Row label="표본">
          이직 {a.n}명 / 잔류 {b.n}명
        </Row>
      </Card>

      {/* Claude 서사 3블록 */}
      <Card highlight>
        <div className="mb-1.5 text-xs font-bold text-cyan">UNIVERSE A · 이직한 사람들</div>
        <p className="text-[13px] leading-relaxed text-sub">{scenario.a}</p>
      </Card>
      <Card highlight>
        <div className="mb-1.5 text-xs font-bold text-gold">UNIVERSE B · 현직에 남은 사람들</div>
        <p className="text-[13px] leading-relaxed text-sub">{scenario.b}</p>
      </Card>
      <Card>
        <div className="mb-1.5 text-xs font-bold text-mut">두 우주를 나란히 두면</div>
        <p className="text-[13px] leading-relaxed text-sub">{scenario.comparison}</p>
        <Caption>이직이 상승을 ‘보장’하진 않습니다. 판단은 당신의 몫입니다.</Caption>
      </Card>
    </div>
  );
}
