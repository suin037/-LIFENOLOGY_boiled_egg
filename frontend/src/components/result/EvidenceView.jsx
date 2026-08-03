import { Card, Caption } from "../ui.jsx";
import PeopleView from "./PeopleView.jsx";
import CausalView from "./CausalView.jsx";
import RiskView from "./RiskView.jsx";

export default function EvidenceView({ a, b, dataMode }) {
  const hasPeople = [a, b].some((s) => s.neighbors?.length);
  const hasCausal = [a, b].some((s) => s.causal_effect != null);
  const hasRisk = [a, b].some((s) => Object.keys(s.risk_timeline || {}).length);
  return (
    <div>
      <h2 className="mb-1 text-base font-semibold">분석 상세</h2>
      <Caption>원하면 비슷한 사례와 효과 추정을 더 자세히 볼 수 있어요.</Caption>
      {dataMode === "demo" && <Card className="border-danger/40"><p className="text-[12px] font-semibold text-danger">현재 숫자와 그래프는 데모 데이터입니다.</p><Caption>로컬 예측모델 파일이 연결되기 전에는 실제 개인 예측으로 해석하면 안 됩니다.</Caption></Card>}
      <DomainStats a={a} b={b} />
      {hasPeople && <Disclosure title="비슷한 사례 보기"><PeopleView a={a} b={b} /></Disclosure>}
      {hasCausal && <Disclosure title="이직의 소득 효과 추정 보기"><CausalView a={a} b={b} /></Disclosure>}
      {hasRisk && <Disclosure title="지속 가능성·이탈 가능성 보기"><RiskView a={a} b={b} /></Disclosure>}
      {!hasPeople && !hasCausal && !hasRisk && <Card><Caption>현재 추가로 보여드릴 상세 분석이 없습니다.</Caption></Card>}
    </div>
  );
}

function Disclosure({ title, children }) {
  return <details className="my-2 rounded-xl border border-line bg-[#0E1424] px-3 py-2.5"><summary className="cursor-pointer text-[12px] font-semibold text-sub">{title}</summary><div className="mt-2">{children}</div></details>;
}

// 삶의 영역 참고지표(항목3) — 각 선택이 건드리는 영역의 실측 집단통계.
function DomainStats({ a, b }) {
  const sides = [["A", a], ["B", b]];
  const rows = [];
  for (const [tag, s] of sides) {
    for (const dom of Object.values(s.domain_stats || {})) {
      if (dom.indicators?.length) rows.push({ tag, ...dom });
    }
  }
  if (!rows.length) return null;
  return (
    <Card>
      <p className="text-[11px] font-bold text-cyan">삶의 영역 참고지표 <span className="text-mut">(집단통계 · 개인 예측 아님)</span></p>
      <div className="mt-2 space-y-2.5">
        {rows.map((r, i) => (
          <div key={i}>
            <div className="text-[11px] font-semibold text-ink">{r.tag} · {r.label}
              <span className="ml-1 text-[9px] text-mut">{r.indicators[0]?.source || ""}</span>
            </div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {r.indicators.map((ind, j) => (
                <span key={j} className="rounded-lg border border-line bg-[#0E1424] px-2 py-1 text-[11px] text-sub">
                  {ind.name} <span className="font-bold text-ink">{ind.value}{ind.unit}</span>
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <Caption>비슷한 조건의 사람들 집단 수치입니다. 이 선택의 개인 예측이 아니라 참고 맥락입니다.</Caption>
    </Card>
  );
}
