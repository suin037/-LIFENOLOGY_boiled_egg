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
      <h2 className="mb-1 text-base font-semibold">근거와 한계</h2>
      <Caption>결과를 만드는 데 사용한 집단·계산 방식·적용 범위를 확인할 수 있어요.</Caption>
      {dataMode === "demo" && <Card className="border-danger/40"><p className="text-[12px] font-semibold text-danger">현재 숫자와 그래프는 데모 데이터입니다.</p><Caption>로컬 예측모델 파일이 연결되기 전에는 실제 개인 예측으로 해석하면 안 됩니다.</Caption></Card>}
      <Card>
        <p className="text-[11px] font-bold text-cyan">적용 범위</p>
        <p className="mt-1 text-[11px] leading-relaxed text-sub">A · {a.coverage}</p>
        <p className="mt-1 text-[11px] leading-relaxed text-sub">B · {b.coverage}</p>
      </Card>
      {hasPeople && <Disclosure title="비슷한 사례 보기"><PeopleView a={a} b={b} /></Disclosure>}
      {hasCausal && <Disclosure title="이직의 소득 효과 추정 보기"><CausalView a={a} b={b} /></Disclosure>}
      {hasRisk && <Disclosure title="지속 가능성·이탈 가능성 보기"><RiskView a={a} b={b} /></Disclosure>}
      {!hasPeople && !hasCausal && !hasRisk && <Card><Caption>이 선택에 적용할 수 있는 개인단위 유사 사례·효과·지속 가능성 모델이 없습니다. 집단 통계와 RAG 서사만 참고하세요.</Caption></Card>}
    </div>
  );
}

function Disclosure({ title, children }) {
  return <details className="my-2 rounded-xl border border-line bg-[#0E1424] px-3 py-2.5"><summary className="cursor-pointer text-[12px] font-semibold text-sub">{title}</summary><div className="mt-2">{children}</div></details>;
}
