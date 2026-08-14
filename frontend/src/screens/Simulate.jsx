import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, GitCompareArrows, Search, Sparkles, TrendingUp } from "lucide-react";
import { useResult } from "../data/ResultContext.jsx";
import { labelOf } from "../data/prediction.js";

const STEPS = [
  { label: "입력한 선택 이해하기", icon: Search },
  { label: "관련 데이터 연결하기", icon: TrendingUp },
  { label: "두 선택 비교하기", icon: GitCompareArrows },
  { label: "결과 화면 준비하기", icon: Sparkles },
];

export default function Simulate() {
  const navigate = useNavigate();
  const { runSimulation, choices, scenarioTexts } = useResult();
  const [done, setDone] = useState(0);

  useEffect(() => {
    let cancelled = false;
    // 백엔드 /simulate 호출 — 결과가 준비된 뒤 결과 화면으로 이동(레이스 방지).
    const sim = runSimulation();
    let i = 0;
    const tick = setInterval(() => {
      i += 1;
      setDone(Math.min(i, STEPS.length));
      if (i >= STEPS.length) clearInterval(tick);
    }, 520);
    // 애니메이션(최소 표시시간)과 실제 호출이 모두 끝나면 이동.
    Promise.all([sim, new Promise((r) => setTimeout(r, STEPS.length * 520))]).finally(() => {
      if (!cancelled) setTimeout(() => navigate("/result", { replace: true }), 180);
    });
    return () => {
      cancelled = true;
      clearInterval(tick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const progress = Math.max(8, Math.round((done / STEPS.length) * 100));

  return (
    <div className="flex min-h-full flex-col pb-3 pt-5">
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan/10 px-3 py-1.5 text-[11px] font-semibold text-cyan">
          <Sparkles size={13} strokeWidth={2.2} />
          미래 비교 중
        </span>
        <h1 className="mt-4 text-[23px] font-bold leading-tight tracking-[-.025em] text-ink">
          두 선택의 가능성을<br />차분히 살펴보고 있어요
        </h1>
        <p className="mt-2 text-[12px] leading-relaxed text-mut">
          입력한 조건과 관련 데이터를 연결해 결과를 준비합니다.
        </p>
      </div>

      <div className="relative mx-auto my-7 h-[150px] w-[250px]" role="img" aria-label="두 선택 주위를 도는 혜성 로딩 애니메이션">
        <i className="absolute left-[34px] top-[22px] h-1 w-1 animate-pulse rounded-full bg-white/60" />
        <i className="absolute right-[38px] top-[28px] h-1.5 w-1.5 animate-pulse rounded-full bg-violet-300/70 [animation-delay:400ms]" />
        <i className="absolute bottom-[22px] left-[62px] h-1 w-1 animate-pulse rounded-full bg-white/40 [animation-delay:700ms]" />
        <div className="absolute left-1/2 top-1/2 h-[104px] w-[206px] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border border-cyan/20 shadow-[inset_0_0_24px_rgba(139,108,207,.04)]" />
        <div className="absolute left-1/2 top-1/2 h-[104px] w-[206px] animate-comet-orbit rounded-[50%]">
          <span className="absolute right-[-5px] top-1/2 h-[11px] w-[11px] -translate-y-1/2 animate-comet-glow rounded-full bg-[#E9DEFF] shadow-[0_0_9px_3px_rgba(187,164,237,.9),0_0_24px_8px_rgba(139,108,207,.45)]" />
          <span className="absolute right-[3px] top-1/2 h-[5px] w-[42px] origin-right -translate-y-1/2 rounded-full bg-gradient-to-l from-[#D8C8FF]/90 via-[#8B6CCF]/45 to-transparent blur-[1px]" />
        </div>
        <div className="absolute left-1/2 top-1/2 h-[132px] w-[132px] -translate-x-1/2 -translate-y-1/2 animate-spin-slow rounded-full border border-dashed border-white/10" />
        <div className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#8B6CCF] shadow-[0_0_38px_rgba(139,108,207,.28)]">
          <GitCompareArrows size={25} className="text-white" strokeWidth={1.8} />
        </div>
        <ChoiceOrb side="A" className="left-0 top-[53px]" />
        <ChoiceOrb side="B" className="right-0 top-[53px]" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <ChoiceCard side="A" choice={choices.a} detail={scenarioTexts.a} />
        <ChoiceCard side="B" choice={choices.b} detail={scenarioTexts.b} />
      </div>

      <div className="mt-4 rounded-[18px] bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[13px] font-semibold text-ink">분석 진행</span>
          <span className="text-[11px] font-semibold tabular-nums text-cyan">{progress}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-[#223047]">
          <div
            className="h-full rounded-full bg-[#8B6CCF] transition-[width] duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="mt-4 space-y-1">
          {STEPS.map(({ label, icon: Icon }, i) => {
            const isDone = i < done;
            const isActive = i === done;
            return (
              <div
                key={label}
                className={`flex min-h-9 items-center gap-2.5 rounded-xl px-2.5 text-[12px] transition-colors ${
                  isActive ? "bg-card2 text-ink" : isDone ? "text-sub" : "text-mut"
                }`}
              >
                <span className={`flex h-6 w-6 items-center justify-center rounded-full ${isDone ? "bg-violet-500/15 text-violet-400" : isActive ? "bg-violet-500/10 text-violet-300" : "text-violet-400/50"}`}>
                  {isDone ? <Check size={14} strokeWidth={2.5} /> : <Icon size={14} strokeWidth={1.8} />}
                </span>
                <span>{label}</span>
                {isActive && <span className="ml-auto flex gap-1"><i className="h-1 w-1 animate-pulse rounded-full bg-cyan" /><i className="h-1 w-1 animate-pulse rounded-full bg-cyan [animation-delay:150ms]" /><i className="h-1 w-1 animate-pulse rounded-full bg-cyan [animation-delay:300ms]" /></span>}
              </div>
            );
          })}
        </div>
      </div>

      <p className="mt-3 text-center text-[10px] text-mut">잠시만 기다려주세요. 곧 결과 화면으로 이동합니다.</p>
    </div>
  );
}

function ChoiceOrb({ side, className }) {
  const isA = side === "A";
  return (
    <div className={`absolute flex h-11 w-11 items-center justify-center rounded-full border font-bold shadow-lg ${className} ${
      isA ? "border-cyan/50 bg-[#132849] text-cyan" : "border-gold/50 bg-[#302313] text-gold"
    }`}>
      {side}
    </div>
  );
}

function ChoiceCard({ side, choice, detail }) {
  const isA = side === "A";
  return (
    <div className={`min-w-0 rounded-[16px] border bg-card px-3 py-3 ${isA ? "border-cyan/25" : "border-gold/25"}`}>
      <div className={`text-[10px] font-bold ${isA ? "text-cyan" : "text-gold"}`}>선택 {side}</div>
      <div className="mt-1 truncate text-[13px] font-semibold text-ink">{labelOf(choice)}</div>
      {detail?.trim() && <p className="mt-1 truncate text-[10px] text-mut">{detail.trim()}</p>}
    </div>
  );
}
