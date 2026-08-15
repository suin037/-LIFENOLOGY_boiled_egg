import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, GitCompareArrows, Search, Sparkles, TrendingUp } from "lucide-react";
import { useResult } from "../data/ResultContext.jsx";
import { labelOf } from "../data/prediction.js";
import Stars from "../components/Stars.jsx";

const STEPS = [
  { label: "입력한 선택 이해하기", icon: Search },
  { label: "관련 데이터 연결하기", icon: TrendingUp },
  { label: "두 선택 비교하기", icon: GitCompareArrows },
  { label: "결과 화면 준비하기", icon: Sparkles },
];

// 단계당 표시 시간. 4단계 × 1400ms = 최소 5.6초 — 체크되는 항목을 읽을 수 있을 만큼 머문다.
const STEP_MS = 1400;

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
    }, STEP_MS);
    // 애니메이션(최소 표시시간)과 실제 호출이 모두 끝나면 이동.
    Promise.all([sim, new Promise((r) => setTimeout(r, STEPS.length * STEP_MS))]).finally(() => {
      if (!cancelled) setTimeout(() => navigate("/result", { replace: true }), 400);
    });
    return () => {
      cancelled = true;
      clearInterval(tick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const progress = Math.max(8, Math.round((done / STEPS.length) * 100));

  return (
    <div className="relative mx-auto flex min-h-full max-w-[1180px] flex-col pb-3 pt-5 lg:min-h-[calc(100vh-40px)] lg:flex-row lg:items-center lg:px-10 lg:py-10">
      {/* 우주 배경. 음수 inset으로 main의 패딩까지 덮고, app-shell의 overflow-hidden이 잘라준다. */}
      <div className="pointer-events-none absolute -inset-x-6 -inset-y-5 -z-10 overflow-hidden" aria-hidden="true">
        <div className="absolute left-[-10%] top-[-15%] h-[70%] w-[75%] animate-nebula-drift rounded-full bg-[#8B6CCF] opacity-[.13] blur-[90px]" />
        <div className="absolute bottom-[-20%] right-[-12%] h-[65%] w-[70%] animate-nebula-drift rounded-full bg-[#FF9F32] opacity-[.09] blur-[100px] [animation-delay:-7s]" />
        <div className="absolute left-1/2 top-1/2 h-[45%] w-[55%] -translate-x-1/2 -translate-y-1/2 animate-nebula-drift rounded-full bg-[#3E7BD4] opacity-[.10] blur-[80px] [animation-delay:-3.5s]" />
        <Stars count={54} twinkle glow />
      </div>

      {/* 모바일에선 display:contents로 기존 세로 스택을 그대로 두고, lg부터 좌/우 2단으로 나눈다. */}
      <div className="contents lg:block lg:w-[45%] lg:shrink-0 lg:pr-8">
      <div className="text-center lg:text-left">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan/10 px-3 py-1.5 text-[11px] font-semibold text-cyan">
          <Sparkles size={13} strokeWidth={2.2} />
          미래 비교 중
        </span>
        <h1 className="mt-4 text-[23px] font-bold leading-tight tracking-[-.025em] text-ink lg:text-[38px]">
          두 선택의 가능성을<br className="hidden lg:block" /> 차분히 살펴보고 있어요
        </h1>
        <p className="mt-2 text-[12px] leading-relaxed text-mut">
          입력한 조건과 관련 데이터를 연결해 결과를 준비합니다.
        </p>
      </div>

      {/* 궤도는 정원(正圓). inset-[20px]는 구체(40px) 반지름과 같아서 구체가 박스 밖으로 나가지 않는다. */}
      <div className="relative mx-auto my-6 h-[190px] w-[190px] lg:my-10 lg:scale-[1.25]" role="img" aria-label="선택 A와 B 구체가 중심을 도는 로딩 애니메이션">
        <i className="absolute left-[26px] top-[18px] h-1 w-1 animate-pulse rounded-full bg-white/60" />
        <i className="absolute right-[30px] top-[24px] h-1.5 w-1.5 animate-pulse rounded-full bg-violet-300/70 [animation-delay:400ms]" />
        <i className="absolute bottom-[18px] left-[54px] h-1 w-1 animate-pulse rounded-full bg-white/40 [animation-delay:700ms]" />
        {/* 중심에서 번지는 빛 — 궤도가 별 주위를 도는 것처럼 보이게 한다. */}
        <div className="absolute left-1/2 top-1/2 h-[150px] w-[150px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#8B6CCF] opacity-20 blur-[38px]" />
        <div className="absolute inset-[20px] rounded-full border border-white/[.06]" />
        <div className="absolute inset-[20px] rounded-full shadow-[inset_0_0_26px_rgba(139,108,207,.14)]" />
        <div className="absolute inset-[20px] animate-orbit rounded-full">
          <ChoiceOrb side="A" className="left-0 top-1/2 -translate-x-1/2 -translate-y-1/2" />
          <ChoiceOrb side="B" className="right-0 top-1/2 translate-x-1/2 -translate-y-1/2" />
        </div>
        <div className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#171128] shadow-[0_0_34px_rgba(139,108,207,.22)]">
          <GitCompareArrows size={25} className="text-white" strokeWidth={1.8} />
        </div>
      </div>

      </div>

      <div className="contents lg:block lg:w-[55%]">
      <div className="grid grid-cols-2 gap-2 lg:gap-4">
        <ChoiceCard side="A" choice={choices.a} detail={scenarioTexts.a} />
        <ChoiceCard side="B" choice={choices.b} detail={scenarioTexts.b} />
      </div>

      <div className="mt-4 rounded-[18px] bg-card p-4 lg:rounded-[24px] lg:border lg:border-white/10 lg:p-6">
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
    </div>
  );
}

function ChoiceOrb({ side, className }) {
  const isA = side === "A";
  // 바깥 div = 궤도 위 위치(transform은 translate 전용), 안쪽 div = 역회전(글자 수평 유지).
  return (
    <div className={`absolute h-10 w-10 ${className}`}>
      <div
        className={`flex h-full w-full animate-orbit-counter items-center justify-center rounded-full border text-[15px] font-bold shadow-lg ${
          isA
            ? "border-cyan/50 bg-[#132849] text-cyan shadow-[0_0_18px_5px_rgba(139,108,207,.28)]"
            : "border-gold/50 bg-[#302313] text-gold shadow-[0_0_18px_5px_rgba(243,154,74,.24)]"
        }`}
      >
        {side}
      </div>
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
