import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useResult } from "../data/ResultContext.jsx";
import { Eyebrow, SourceFootnote, Button } from "../components/ui.jsx";
import SummaryView from "../components/result/SummaryView.jsx";
import RadarView from "../components/result/RadarView.jsx";
import PeopleView from "../components/result/PeopleView.jsx";
import CausalView from "../components/result/CausalView.jsx";
import CurveView from "../components/result/CurveView.jsx";

const TABS = [
  { key: "sum", label: "요약", View: SummaryView },
  { key: "radar", label: "비교", View: RadarView },
  { key: "people", label: "유사인물", View: PeopleView },
  { key: "causal", label: "인과", View: CausalView },
  { key: "curve", label: "곡선", View: CurveView },
];

export default function Result() {
  const navigate = useNavigate();
  const { result } = useResult();
  const [tab, setTab] = useState("sum");

  const { meta } = result;
  const Active = TABS.find((t) => t.key === tab).View;

  return (
    <div>
      <Eyebrow>결과 · CHART No.0427</Eyebrow>
      <h1 className="text-[21px] font-bold leading-[1.2]">
        {meta.age}세 · {meta.occupation}
      </h1>

      {/* 서브뷰 전환 칩 */}
      <div className="no-scrollbar my-2.5 flex gap-1.5 overflow-x-auto pb-1">
        {TABS.map((t) => {
          const on = t.key === tab;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`tap whitespace-nowrap rounded-2xl border px-3.5 py-2 text-xs transition-colors ${
                on
                  ? "border-[#3a4a70] bg-[#2b3859] text-white"
                  : "border-line bg-[#0E1424] text-sub"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* 활성 서브뷰 */}
      <div key={tab} className="animate-fade">
        <Active result={result} />
      </div>

      <SourceFootnote meta={meta} />

      <Button variant="ghost" className="mt-4" onClick={() => navigate("/input")}>
        다른 선택으로 다시 해보기
      </Button>
    </div>
  );
}
