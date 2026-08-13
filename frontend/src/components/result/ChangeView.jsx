import { Card, Caption } from "../ui.jsx";
import ParallelView from "./ParallelView.jsx";
import RiskView from "./RiskView.jsx";
import CareerTrajectoryView from "./CareerTrajectoryView.jsx";

export default function ChangeView({ a, b, domains = { a: [], b: [] } }) {
  const selected = new Set([...(domains.a || []), ...(domains.b || [])]);
  const incomeRelevant = selected.has("career") || selected.has("finance");
  const businessRelevant = selected.has("business");
  const hasIncome = incomeRelevant && a.trajectory?.length && b.trajectory?.length;
  const hasBusinessRisk = businessRelevant && [a, b].some((s) => Object.keys(s.risk_timeline || {}).length);
  const hasCareerTrajectory = [a, b].some((s) => s.parallel_trajectory?.status === "available");

  if (!hasIncome && !hasBusinessRisk && !hasCareerTrajectory) {
    return <Card><h2 className="text-base font-semibold">변화 흐름</h2><Caption>이 선택에 대해 시간에 따른 변화를 계산할 수 있는 데이터가 아직 없습니다. 관련 없는 소득 그래프는 표시하지 않았어요.</Caption></Card>;
  }
  return <div>{hasCareerTrajectory && <CareerTrajectoryView a={a} b={b} />}{hasIncome && <ParallelView a={a} b={b} />}{hasBusinessRisk && <RiskView a={a} b={b} />}</div>;
}
