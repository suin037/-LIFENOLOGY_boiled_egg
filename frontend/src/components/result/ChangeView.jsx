import { Card, Caption } from "../ui.jsx";
import ParallelView from "./ParallelView.jsx";
import RiskView from "./RiskView.jsx";
import CareerTrajectoryView from "./CareerTrajectoryView.jsx";

export default function ChangeView({ a, b, domains = { a: [], b: [] }, dataMode = "demo" }) {
  const selected = new Set([...(domains.a || []), ...(domains.b || [])]);
  const incomeRelevant = selected.has("career") || selected.has("finance");
  const businessRelevant = selected.has("business");
  const hasIncome = incomeRelevant && a.trajectory?.length && b.trajectory?.length;
  const hasBusinessRisk = businessRelevant && [a, b].some((s) => Object.keys(s.risk_timeline || {}).length);
  const hasCareerTrajectory = [a, b].some((s) => s.parallel_trajectory?.status === "available");
  const isJobComparison = [a.choice, b.choice].some((choice) => ["이직", "유지"].includes(choice));

  // API/모델 연결 실패 시 만들어지는 고정 데모 궤적을 실제 분석처럼 그리지 않는다.
  if (dataMode !== "model") {
    return (
      <Card>
        <h2 className="text-base font-semibold">변화 흐름</h2>
        <div className="mt-3 rounded-xl border border-[#D97882]/35 bg-[#2A1420] px-4 py-5 text-center">
          <div className="text-[12px] font-semibold text-[#FF9EAC]">실제 모델 결과를 불러오지 못했어요</div>
          <Caption className="mx-auto max-w-[320px] text-center">
            고정 데모값으로 소득선을 대신 그리지 않았습니다. 백엔드와 모델 파일이 연결되면 유사 집단의 1·3·5년 관측 경로가 표시됩니다.
          </Caption>
        </div>
      </Card>
    );
  }

  if (!hasIncome && !hasBusinessRisk && !hasCareerTrajectory) {
    return <Card><h2 className="text-base font-semibold">변화 흐름</h2><Caption>이 선택에 대해 시간에 따른 변화를 계산할 수 있는 데이터가 아직 없습니다. 관련 없는 소득 그래프는 표시하지 않았어요.</Caption></Card>;
  }
  return (
    <div>
      {hasCareerTrajectory && <CareerTrajectoryView a={a} b={b} />}
      {isJobComparison && !hasCareerTrajectory && (
        <Card>
          <h2 className="text-base font-semibold">1·3·5년 평행 경로</h2>
          <Caption>현재 조건에 맞는 유사 집단 관측 경로를 만들 수 없어 소득 그래프를 표시하지 않았어요.</Caption>
        </Card>
      )}
      {/* 이직·유지는 새 유사집단 경로를 정본으로 사용한다. 구 인과효과 가산 그래프는 숨긴다. */}
      {!isJobComparison && hasIncome && <ParallelView a={a} b={b} />}
      {hasBusinessRisk && <RiskView a={a} b={b} />}
    </div>
  );
}
