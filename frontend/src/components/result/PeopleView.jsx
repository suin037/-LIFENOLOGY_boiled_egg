import { useMemo } from "react";
import { Card, Row, Caption } from "../ui.jsx";
import { A_COLOR, B_COLOR, totalNeighbors } from "../../data/result.js";

// 유사인물: 총 200개 점. 이직=시안(A), 잔류=골드(B).
export default function PeopleView({ result }) {
  const { option_a: a, option_b: b } = result;
  const total = totalNeighbors(result);

  const dots = useMemo(
    () => Array.from({ length: total }, (_, i) => i < a.n),
    [total, a.n],
  );

  return (
    <Card>
      <h2 className="mb-1 text-base font-semibold">당신과 비슷한 {total}명</h2>
      <div className="my-3 flex flex-wrap gap-[3px] leading-none">
        {dots.map((isA, i) => (
          <span
            key={i}
            className="h-[6px] w-[6px] rounded-full"
            style={{ backgroundColor: isA ? A_COLOR : "rgba(245,200,107,.55)" }}
          />
        ))}
      </div>
      <Row label={<><span className="mr-1 inline-block h-2 w-2 rounded-full align-middle" style={{ background: A_COLOR }} />이직 선택</>}>
        {a.n}명
      </Row>
      <Row label={<><span className="mr-1 inline-block h-2 w-2 rounded-full align-middle" style={{ background: B_COLOR }} />현직 유지</>}>
        {b.n}명
      </Row>
      <Caption>각 점은 GOMS·YP의 실제 응답자입니다. 지어낸 사람이 아닙니다.</Caption>
    </Card>
  );
}
