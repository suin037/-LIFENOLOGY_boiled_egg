import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useResult } from "../data/ResultContext.jsx";
import { labelOf } from "../data/prediction.js";
import { Eyebrow, SourceFootnote, Button } from "../components/ui.jsx";
import LifeView from "../components/result/LifeView.jsx";
import ChangeView from "../components/result/ChangeView.jsx";
import EvidenceView from "../components/result/EvidenceView.jsx";
import ActionView from "../components/result/ActionView.jsx";
import AvatarComparison from "../components/result/AvatarComparison.jsx";

export default function Result() {
  const navigate = useNavigate();
  const { result, profile, scenarioDomains } = useResult();
  const { a, b } = result;

  const tabs = [
    { key: "indicators", label: "핵심 지표", View: LifeView },
    { key: "change", label: "변화 흐름", View: ChangeView },
    { key: "evidence", label: "근거와 한계", View: EvidenceView },
    { key: "next", label: "다음 단계", View: ActionView },
  ];

  const [tab, setTab] = useState("indicators");
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

      <AvatarComparison
        avatar={profile.avatarConfig}
        a={a}
        b={b}
        visuals={result.visuals}
        narrative={result.narrative}
        error={result.visualError || result.narrativeError}
      />

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
        <Active a={a} b={b} domains={result.domains || scenarioDomains} dataMode={result.dataMode || "demo"} />
      </div>

      <SourceFootnote meta={a.meta} />

      <Button variant="ghost" className="mt-4" onClick={() => navigate("/input")}>
        다른 갈림길로 다시 해보기
      </Button>
    </div>
  );
}
