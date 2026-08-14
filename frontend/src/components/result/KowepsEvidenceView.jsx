import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, Caption } from "../ui.jsx";

const LABELS = {
  disposable_income: "가처분소득",
  health_satisfaction: "건강 만족도",
  family_satisfaction: "가족관계 만족도",
  social_satisfaction: "사회관계 만족도",
  job_satisfaction: "직업 만족도",
  leisure_satisfaction: "여가 만족도",
  housing_satisfaction: "주거 만족도",
  overall_satisfaction: "전반적 생활 만족도",
  depressive_feeling: "우울감",
};

const PRIORITY = ["disposable_income", "family_satisfaction", "overall_satisfaction"];

function value(cell) {
  return typeof cell?.mean === "number" ? Number(cell.mean.toFixed(2)) : null;
}

function chartRows(outcome, evidence) {
  return (outcome?.trajectory || []).map((point) => ({
    wave: `${point.wave}차 후`,
    A: value(evidence.event_side === "A" ? point.event : point.comparison),
    B: value(evidence.event_side === "B" ? point.event : point.comparison),
    nA: (evidence.event_side === "A" ? point.event : point.comparison)?.n,
    nB: (evidence.event_side === "B" ? point.event : point.comparison)?.n,
  }));
}

function unitOf(outcome) {
  if (outcome?.unit === "annual_10k_krw") return "만원/년";
  if (outcome?.scale) return `${outcome.scale[0]}–${outcome.scale[1]}점`;
  return "평균";
}

export default function KowepsTrajectoryView({ a, b }) {
  const evidence = a.koweps_evidence || b.koweps_evidence;
  if (!evidence?.available) return null;
  const outcomes = PRIORITY.map((key) => evidence.outcomes?.find((o) => o.key === key)).filter(Boolean);
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">1·3·5·10차 관측 변화</h2>
          <Caption>{evidence.label} · KOWEPS 25~35세 종단 관측</Caption>
        </div>
        <span className="shrink-0 rounded-full bg-violet-500/10 px-2 py-1 text-[9px] font-semibold text-violet-300">집단 관측</span>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {outcomes.map((outcome) => (
          <div key={outcome.key} className="rounded-xl border border-line bg-[#0E1424] p-3">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-ink">{LABELS[outcome.key] || outcome.key}</span>
              <span className="text-mut">{unitOf(outcome)}</span>
            </div>
            <div className="mt-2 h-32">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartRows(outcome, evidence)} margin={{ top: 5, right: 8, left: -18, bottom: 0 }}>
                  <XAxis dataKey="wave" tick={{ fill: "#7F8AA3", fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#7F8AA3", fontSize: 9 }} axisLine={false} tickLine={false} domain={["auto", "auto"]} />
                  <Tooltip contentStyle={{ background: "#11182A", border: "1px solid #28324A", borderRadius: 10, fontSize: 11 }} />
                  <Line type="monotone" dataKey="A" name={`A · ${a.choice}`} stroke="#9B7AE5" strokeWidth={2.2} dot={{ r: 2.5 }} connectNulls />
                  <Line type="monotone" dataKey="B" name={`B · ${b.choice}`} stroke="#F2C56B" strokeWidth={2.2} dot={{ r: 2.5 }} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-4 text-[10px] text-sub">
        <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-[#9B7AE5]" />A · {a.choice}</span>
        <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-[#F2C56B]" />B · {b.choice}</span>
      </div>
      <Caption>‘차 후’는 사건 기준 다음 조사 차수입니다. 두 집단의 관측 평균이며 결혼의 인과효과나 개인의 확정 미래를 뜻하지 않습니다.</Caption>
    </Card>
  );
}

export function KowepsDetailView({ a, b }) {
  const evidence = a.koweps_evidence || b.koweps_evidence;
  if (!evidence?.available) return null;
  const shown = (evidence.outcomes || []).filter((o) => PRIORITY.includes(o.key));
  return (
    <Card>
      <p className="text-[11px] font-bold text-violet-300">KOWEPS 비교 집단 구성</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Sample label={evidence.event_side === "A" ? `A · ${a.choice}` : `B · ${b.choice}`} value={evidence.event_people} note="사건 발생군" />
        <Sample label={evidence.comparison_side === "A" ? `A · ${a.choice}` : `B · ${b.choice}`} value={evidence.comparison_people} note="미발생 비교군" />
      </div>
      <div className="mt-3 space-y-2">
        {shown.map((outcome) => {
          const last = outcome.trajectory?.at(-1) || {};
          return <div key={outcome.key} className="flex items-center justify-between border-t border-line/70 pt-2 text-[11px]">
            <span className="text-sub">10차 후 {LABELS[outcome.key]}</span>
            <span className="font-semibold text-ink">사건군 {value(last.event)} · 유지군 {value(last.comparison)} <small className="font-normal text-mut">{unitOf(outcome)}</small></span>
          </div>;
        })}
      </div>
      <Caption>{evidence.claim_limit || "집단 관측 비교이며 개인 예측 또는 인과효과가 아닙니다."}</Caption>
    </Card>
  );
}

function Sample({ label, value: count, note }) {
  return <div className="rounded-xl border border-line bg-[#0E1424] p-3"><div className="text-[10px] text-mut">{note}</div><div className="mt-1 text-xs font-semibold text-ink">{label}</div><div className="mt-1 text-lg font-bold text-violet-300">{Number(count || 0).toLocaleString()}명</div></div>;
}
