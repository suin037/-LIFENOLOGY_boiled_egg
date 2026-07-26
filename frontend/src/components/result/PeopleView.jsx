import { Card, Row, Caption } from "../ui.jsx";
import { A_COLOR, B_COLOR } from "../../data/result.js";
import { labelOf } from "../../data/prediction.js";

// 유사인물(L2) — 개인단위 데이터가 있는 쪽(이직)만. A/B 중 해당되는 쪽 렌더.
export default function PeopleView({ a, b }) {
  const sides = [a, b].filter((s) => s.neighbors?.length > 0);
  if (!sides.length) {
    return <Card><Caption>선택한 두 갈래 모두 개인단위 유사인물 데이터가 없습니다.</Caption></Card>;
  }
  return (
    <div>
      {sides.map((s, i) => <SidePeople key={i} result={s} />)}
    </div>
  );
}

function SidePeople({ result }) {
  const list = result.neighbors;
  const nSim = result.trajectory?.[0]?.sample_n || list.length;
  const changed = Math.round((result.neighbor_changed_ratio || 0) * 100);
  const goms = list.filter((n) => n.source === "GOMS").length;
  const yp = list.length - goms;

  return (
    <>
      <Card>
        <h2 className="mb-1 text-base font-semibold">{labelOf(result.choice)} · 비슷한 사람들</h2>
        <Row label="유사 사례 규모">약 {nSim}명</Row>
        <Row label="그중 실제 이직 경험"><span className="font-bold text-cyan">{changed}%</span></Row>
        <Row label="출처">
          <span style={{ color: A_COLOR }}>GOMS {goms}</span> / <span style={{ color: B_COLOR }}>YP {yp}</span>
        </Row>
        <Caption>GOMS=전공 매칭 졸업자, YP=청년패널. 유사도는 출처가 다르면 직접 비교하지 않습니다.</Caption>
      </Card>
      <Card>
        <div className="mb-2 text-xs font-semibold text-mut">대표 유사 사례</div>
        <div className="space-y-2">
          {list.slice(0, 8).map((n, i) => (
            <div key={i} className="flex items-center justify-between border-b border-line/50 pb-2 text-[12px] last:border-0">
              <div className="flex items-center gap-2">
                <span className="rounded px-1.5 py-0.5 text-[10px] font-bold"
                  style={{ background: n.source === "GOMS" ? "#12203a" : "#241d10", color: n.source === "GOMS" ? A_COLOR : B_COLOR }}>
                  {n.source}
                </span>
                <span className="text-sub">{n.job_category || "청년패널"}</span>
              </div>
              <div className="text-right text-sub">
                {n.monthly_wage ? `${n.monthly_wage}만원` : "-"}
                <span className="ml-2 text-mut">유사도 {n.similarity}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
