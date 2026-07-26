import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useResult } from "../data/ResultContext.jsx";
import { labelOf } from "../data/prediction.js";
import { Eyebrow, SourceFootnote, Button } from "../components/ui.jsx";
import SummaryView from "../components/result/SummaryView.jsx";
import ParallelView from "../components/result/ParallelView.jsx";
import LifeView from "../components/result/LifeView.jsx";
import PeopleView from "../components/result/PeopleView.jsx";
import CausalView from "../components/result/CausalView.jsx";
import TrajectoryView from "../components/result/TrajectoryView.jsx";
import RiskView from "../components/result/RiskView.jsx";
import ActionView from "../components/result/ActionView.jsx";

export default function Result() {
  const navigate = useNavigate();
  const { result } = useResult();
  const { a, b } = result;

  // coverage 기반 서브뷰 구성
  const hasCausal = a.causal_effect != null || b.causal_effect != null;
  const hasNeighbors = a.neighbors?.length > 0 || b.neighbors?.length > 0;
  const hasRisk = Object.keys(a.risk_timeline || {}).length > 0 || Object.keys(b.risk_timeline || {}).length > 0;

  const tabs = [
    { key: "sum", label: "요약", View: SummaryView },
    { key: "parallel", label: "평행우주", View: ParallelView },
    { key: "life", label: "생활지표", View: LifeView },
    { key: "traj", label: "궤적", View: TrajectoryView },
    hasNeighbors && { key: "people", label: "유사인물", View: PeopleView },
    hasCausal && { key: "causal", label: "인과", View: CausalView },
    hasRisk && { key: "risk", label: "리스크", View: RiskView },
    { key: "action", label: "행동", View: ActionView },
  ].filter(Boolean);

  const [tab, setTab] = useState("sum");
  const Active = (tabs.find((t) => t.key === tab) || tabs[0]).View;

  return (
    <div>
      <Eyebrow>결과 · CHART No.0427</Eyebrow>
      <h1 className="text-[21px] font-bold leading-[1.2]">
        {a.meta.age}세 · {a.meta.occupation}
      </h1>
      <p className="mt-1 text-[13px]">
        <span className="font-bold text-cyan">{labelOf(a.choice)}</span>
        <span className="text-mut"> vs </span>
        <span className="font-bold text-gold">{labelOf(b.choice)}</span>
      </p>

      {/* 서브뷰 칩 */}
      <div className="no-scrollbar my-2.5 flex gap-1.5 overflow-x-auto pb-1">
        {tabs.map((t) => {
          const on = t.key === tab;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`tap whitespace-nowrap rounded-2xl border px-3.5 py-2 text-xs transition-colors ${
                on ? "border-[#3a4a70] bg-[#2b3859] text-white" : "border-line bg-[#0E1424] text-sub"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div key={tab} className="animate-fade">
        <Active a={a} b={b} />
      </div>

      <SourceFootnote meta={a.meta} />

      <Button variant="ghost" className="mt-4" onClick={() => navigate("/input")}>
        다른 갈림길로 다시 해보기
      </Button>
    </div>
  );
}
