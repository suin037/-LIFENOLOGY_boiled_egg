import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Orbit, ChevronRight, GitCompareArrows, BookOpen, Sparkles } from "lucide-react";
import { useResult } from "../data/ResultContext.jsx";
import DiaryToday from "../components/DiaryToday.jsx";
import DailySuggest from "../components/DailySuggest.jsx";
import ExpeditionBoard from "../components/ExpeditionBoard.jsx";
import ApiStatus from "../components/ApiStatus.jsx";
import { loadUniverse, universeSummary } from "../data/myUniverse.js";
import { domainRumination } from "../data/diarySignals.js";

// 홈 = 진입 허브. 인사 + 마스코트 + 오늘 기록 + 새 시뮬 + 나의 우주 요약.
export default function HomeHub() {
  const navigate = useNavigate();
  const { profile, setChoices, setScenarioTexts } = useResult();
  const universe = universeSummary();
  const [universeState, setUniverseState] = useState(loadUniverse);
  const [rumination, setRumination] = useState(() => domainRumination({ windowDays: 28, threshold: 4 }));

  useEffect(() => {
    const refresh = () => {
      setRumination(domainRumination({ windowDays: 28, threshold: 4 }));
      setUniverseState(loadUniverse());
    };
    window.addEventListener("pm:universe", refresh);
    return () => window.removeEventListener("pm:universe", refresh);
  }, []);

  function startSuggestedCompare() {
    if (!rumination.compare) return;
    // 입력칸까지 채워야 넘어간 화면이 비어 보이지 않는다(choices 만 넣으면 빈 칸으로 뜬다).
    setChoices({ a: rumination.compare.a, b: rumination.compare.b });
    setScenarioTexts({ a: rumination.compare.a, b: rumination.compare.b });
    navigate("/input");
  }

  const recentActivity = [
    ...(universeState.scenarios || []).map((item) => ({ type: "simulation", date: item.date, title: item.title || "새로운 미래를 비교했어요" })),
    ...(universeState.checkins || []).filter((item) => !item.empty).map((item) => ({ type: "record", date: item.date, title: item.text || item.note || "오늘의 기록을 남겼어요" })),
  ].filter((item) => item.date).sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 4);

  return (
    <div className="pb-2 lg:min-h-full lg:pb-10">
      {/* 가이드 캐러셀 + 이번 주 기록 + 오늘 체크인 */}
      <div className="lg:grid lg:grid-cols-[minmax(0,1.8fr)_minmax(360px,.8fr)] lg:items-stretch lg:gap-8 xl:gap-12">
        <section className="min-w-0 lg:flex lg:flex-col">
          <div className="mb-0.5 mt-1 text-[13px] text-sub lg:text-[15px]">안녕하세요, {profile.name?.trim() ? `${profile.name.trim()}님` : "탐험가님"} 👋</div>
          <h1 className="text-[25px] font-bold leading-[1.22] tracking-[-.02em] lg:text-[42px] xl:text-[48px]">오늘도 어떤 갈림길을<br />비춰볼까요?</h1>
          <div className="mt-5 lg:flex lg:flex-1 lg:mt-7"><DiaryToday /></div>
        </section>
        <aside className="lg:flex lg:h-full lg:flex-col lg:border-l lg:border-white/[.08] lg:pl-8 xl:pl-10">

      {/* 반복 고민 넛지 — 일기에서 잡힌 '지금 비교해볼 것'이라 시뮬 버튼보다 먼저 온다.
          버튼은 빈 시작이고, 이건 이미 이유가 있는 시작이다. */}
      {rumination.prompt && (
        <button
          onClick={startSuggestedCompare}
          className="tap mb-4 flex w-full items-center gap-3 rounded-[18px] border border-violet-400/40 bg-[#1D1730] px-4 py-3.5 text-left transition-colors hover:bg-[#241B3C]"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-violet-300">
            <GitCompareArrows size={18} strokeWidth={2} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-semibold text-violet-200">
              최근 {rumination.windowDays}일 동안 {rumination.domain.label} 이야기가 {rumination.count}일 나타났어요
            </span>
            <span className="block text-[11px] text-sub">{rumination.compare.action}, 지금 비교해볼까요? · 키워드 기반</span>
          </span>
          <ChevronRight size={18} className="text-violet-400" />
        </button>
      )}

      {/* 나의 우주 요약 */}
      <div className="mb-2 mt-4 flex items-center justify-between px-1 lg:mt-0">
        <span className="text-[15px] font-bold text-ink">나의 우주</span>
        <button
          onClick={() => navigate("/my")}
          className="tap flex items-center gap-0.5 text-[12px] text-mut"
        >
          전체 보기 <ChevronRight size={14} className="text-violet-400" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Stat label="시뮬레이션" value={universe.stats.simulations} />
        <Stat label="수집한 별" value={universe.stats.stars} />
        <Stat label="탐험한 우주" value={universe.stats.universes} />
      </div>

      <button
        onClick={() => navigate("/my")}
        className="tap mt-2 flex w-full items-center gap-3 rounded-[18px] bg-card px-4 py-3.5 text-left transition-colors hover:bg-card2 lg:mt-3 lg:py-5"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-500/15 text-violet-400">
          <Orbit size={18} strokeWidth={2} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-semibold text-ink">나의 우주 열기</span>
          <span className="block text-[11px] text-mut">별자리·행성·저장한 평행우주</span>
        </span>
        <ChevronRight size={18} className="text-violet-400/70" />
      </button>

      {/* AI 서버가 안 잡히면 조용히 사라지지 않고 알려준다 */}
      <ApiStatus />

      {/* 떠나 있는 작은 탐험 — 나의 우주에서 고른 길을 잊지 않게 여기 걸어둔다 */}
      <ExpeditionBoard />

      {/* 오늘 해볼 만한 것 — 인생 갈림길(기회 카드)보다 작은, 오늘 크기의 제안 */}
      <DailySuggest />

      <div className="mb-2 mt-7 flex items-center justify-between border-t border-white/[.08] px-1 pt-5">
        <span className="text-[15px] font-bold text-ink">최근 활동</span>
        <button onClick={() => navigate("/archive")} className="tap text-[11px] text-mut">전체 보기</button>
      </div>
      <div className="overflow-hidden rounded-[18px] border border-white/[.07] bg-card/70 lg:flex-1">
        {recentActivity.length ? recentActivity.map((item, index) => {
          const Icon = item.type === "simulation" ? Sparkles : BookOpen;
          return <button key={`${item.type}-${item.date}-${index}`} onClick={() => navigate(item.type === "simulation" ? "/archive" : "/my")} className="tap flex w-full items-center gap-3 border-b border-white/[.06] px-4 py-3 text-left last:border-0 hover:bg-white/[.03]"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-500/15"><Icon size={15}/></span><span className="min-w-0 flex-1"><span className="block truncate text-[12px] font-semibold text-ink">{item.title}</span><span className="mt-0.5 block text-[10px] text-mut">{item.type === "simulation" ? "미래 비교" : "오늘의 기록"}</span></span><span className="shrink-0 text-[10px] text-mut">{String(item.date).slice(5).replace("-", ".")}</span></button>;
        }) : <p className="px-4 py-6 text-center text-[11px] text-mut">기록이나 시뮬레이션을 시작하면 최근 활동이 표시돼요.</p>}
      </div>

        </aside>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-[18px] border border-white/[.04] bg-card px-2 py-3.5 text-center lg:py-7">
      <div className="text-[20px] font-bold text-ink lg:text-[24px]">{value}</div>
      <div className="mt-0.5 text-[10px] text-mut">{label}</div>
    </div>
  );
}
