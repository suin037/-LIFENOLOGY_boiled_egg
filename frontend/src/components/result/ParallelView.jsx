import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { Card, Caption } from "../ui.jsx";
import { A_COLOR, B_COLOR } from "../../data/result.js";
import { labelOf } from "../../data/prediction.js";

// 평행우주 — A/B 두 갈래의 소득 중앙값 궤적을 한 차트에 겹침.
export default function ParallelView({ a, b }) {
  const la = labelOf(a.choice);
  const lb = labelOf(b.choice);
  const data = a.trajectory.map((p, i) => ({
    year: `${p.year}년`,
    [la]: p.income_p50,
    [lb]: b.trajectory[i]?.income_p50,
    sample_n: p.sample_n,
  }));
  const bothChange = a.choice !== "유지" && b.choice !== "유지";

  return (
    <Card>
      <h2 className="mb-1 text-base font-semibold">평행우주 · 소득 궤적</h2>
      <div className="mt-2 h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, left: -14, bottom: 0 }}>
            <CartesianGrid stroke="#1E2740" vertical={false} />
            <XAxis dataKey="year" tick={{ fill: "#7E8DAB", fontSize: 11 }} axisLine={{ stroke: "#2A3550" }} tickLine={false} />
            <YAxis tick={{ fill: "#7E8DAB", fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: "#141B2E", border: "1px solid #28324D", borderRadius: 10, fontSize: 12, color: "#EAF0FB" }}
              formatter={(v) => [`${v}만원`, ""]}
              labelFormatter={(l, p) => `${l} · 추적 ${p?.[0]?.payload?.sample_n}명`}
            />
            <Legend wrapperStyle={{ fontSize: 11, color: "#9FB0CE" }} iconType="plainline" />
            <Line type="monotone" dataKey={la} stroke={A_COLOR} strokeWidth={2} dot={{ r: 2.5 }} />
            <Line type="monotone" dataKey={lb} stroke={B_COLOR} strokeWidth={2} strokeDasharray={lb === la ? "0" : "4 3"} dot={{ r: 2.5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <Caption>
        비슷한 사람들이 각 갈래에서 걸어간 소득 중앙값(만원). 예측이 아니라 관찰된 분포이며, 뒤
        연차일수록 추적 표본이 줄어 불확실합니다.
        {bothChange && " 두 갈래 모두 변화라, 직접 인과비교가 아닌 각각의 거울입니다."}
      </Caption>
    </Card>
  );
}
