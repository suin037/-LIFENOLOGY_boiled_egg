import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Card, Caption } from "../ui.jsx";
import { labelOf } from "../../data/prediction.js";

// 리스크 — risk_timeline. 이직=재이직 확률 / 창업=폐업 확률 / 진학=없음.
export default function RiskView({ a, b }) {
  const sides = [a, b].filter((s) => Object.keys(s.risk_timeline || {}).length > 0);
  if (!sides.length) {
    return <Card><Caption>선택한 두 갈래 모두 리스크 타임라인 데이터가 없습니다.</Caption></Card>;
  }
  return <div>{sides.map((s, i) => <SideRisk key={i} result={s} />)}</div>;
}

function SideRisk({ result }) {
  const data = Object.entries(result.risk_timeline)
    .map(([y, p]) => ({ year: `${y}년`, pct: Math.round(p * 100) }))
    .sort((x, y) => parseInt(x.year) - parseInt(y.year));

  return (
    <Card>
      <h2 className="mb-1 flex items-center gap-2 text-base font-semibold">
        {labelOf(result.choice)} · {result.risk_label}
      </h2>
      <div className="mt-2 h-[160px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, left: -14, bottom: 0 }}>
            <CartesianGrid stroke="#1E2740" vertical={false} />
            <XAxis dataKey="year" tick={{ fill: "#7E8DAB", fontSize: 11 }} axisLine={{ stroke: "#2A3550" }} tickLine={false} />
            <YAxis domain={[0, 80]} tickFormatter={(v) => `${v}%`} tick={{ fill: "#7E8DAB", fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: "#141B2E", border: "1px solid #28324D", borderRadius: 10, fontSize: 12, color: "#EAF0FB" }} formatter={(v) => [`${v}%`, result.risk_label]} />
            <Line type="monotone" dataKey="pct" stroke="#EE8888" strokeWidth={2} dot={{ r: 3, fill: "#EE8888" }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <Caption>
        {result.choice === "이직"
          ? "이직한 사람들 중 해당 연차까지 다시 옮긴 비율(관찰값)입니다."
          : "창업한 사업체 중 해당 연차까지 폐업한 비율(1−생존율)입니다."}{" "}
        예측이 아니라 관찰된 비율입니다.
      </Caption>
    </Card>
  );
}
