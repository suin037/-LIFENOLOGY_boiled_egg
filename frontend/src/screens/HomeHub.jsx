import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Orbit, ChevronRight, Sparkles, GitCompareArrows } from "lucide-react";
import { useResult } from "../data/ResultContext.jsx";
import { Button } from "../components/ui.jsx";
import DiaryToday from "../components/DiaryToday.jsx";
import DailySuggest from "../components/DailySuggest.jsx";
import ExpeditionBoard from "../components/ExpeditionBoard.jsx";
import ApiStatus from "../components/ApiStatus.jsx";
import { universeSummary } from "../data/myUniverse.js";
import { jobChangeRumination } from "../data/diarySignals.js";

// 홈 = 진입 허브. 인사 + 마스코트 + 오늘 기록 + 새 시뮬 + 나의 우주 요약.
export default function HomeHub() {
  const navigate = useNavigate();
  const { profile, setChoices } = useResult();
  const universe = universeSummary();
  // 반복되는 이직 고민을 일기에서 감지하면 → 비교를 먼저 제안(정직: 숫자 아님, 비교 제안일 뿐).
  // 결과 카드(28일)와 창을 맞춰 숫자가 어긋나 보이지 않게 한다.
  const rumination = useMemo(() => jobChangeRumination({ windowDays: 28, threshold: 4 }), []);

  function startJobCompare() {
    setChoices({ a: "이직", b: "유지" });
    navigate("/input");
  }

  return (
    <div className="pb-2">
      {/* 인사 */}
      <div className="mb-0.5 mt-1 text-[13px] text-sub lg:text-[15px]">
        안녕하세요, {profile.name?.trim() ? `${profile.name.trim()}님` : "탐험가님"} 👋
      </div>
      <h1 className="text-[25px] font-bold leading-[1.22] tracking-[-.02em] lg:text-[34px]">
        오늘도 어떤 갈림길을
        <br />
        비춰볼까요?
      </h1>

      {/* 새 시뮬 CTA — 이 앱이 하는 일이 제목 바로 아래 오게 한다.
          좁은 화면·넓은 화면 모두에서 첫 화면에 보이도록 그리드 위에 둔다. */}
      <Button
        className="mt-4 flex items-center justify-center gap-1.5 lg:mt-5 lg:max-w-[420px] lg:py-4"
        onClick={() => navigate("/input")}
      >
        <Sparkles size={18} strokeWidth={2.2} className="text-violet-200" />
        새 시뮬레이션 시작
      </Button>

      {/* 가이드 캐러셀 + 이번 주 기록 + 오늘 체크인 */}
      <div className="lg:mt-6 lg:grid lg:grid-cols-[minmax(0,1.45fr)_minmax(300px,.75fr)] lg:items-start lg:gap-7">
        <DiaryToday />
        <aside className="lg:sticky lg:top-0">

      {/* AI 서버가 안 잡히면 조용히 사라지지 않고 알려준다 */}
      <ApiStatus />

      {/* 떠나 있는 작은 탐험 — 나의 우주에서 고른 길을 잊지 않게 여기 걸어둔다 */}
      <ExpeditionBoard />

      {/* 오늘 해볼 만한 것 — 인생 갈림길(기회 카드)보다 작은, 오늘 크기의 제안 */}
      <DailySuggest />

      {/* 반복 고민 넛지 — 최근 2주 이직 고민이 잦으면 비교를 먼저 제안 */}
      {rumination.prompt && (
        <button
          onClick={startJobCompare}
          className="tap mt-4 flex w-full items-center gap-3 rounded-[18px] border border-cyan/40 bg-[#1D1730] px-4 py-3.5 text-left transition-colors hover:bg-[#16264a]"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-violet-400">
            <GitCompareArrows size={18} strokeWidth={2} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-semibold text-cyan">
              최근 {rumination.windowDays}일 동안 이직 고민이 {rumination.count}일 나타났어요
            </span>
            <span className="block text-[11px] text-sub">이직 vs 현상 유지, 지금 비교해볼까요?</span>
          </span>
          <ChevronRight size={18} className="text-violet-400" />
        </button>
      )}

      {/* 나의 우주 요약 */}
      <div className="mb-2 mt-7 flex items-center justify-between px-1 lg:mt-6">
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

        </aside>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-[18px] bg-card px-2 py-3.5 text-center lg:py-5">
      <div className="text-[20px] font-bold text-ink lg:text-[24px]">{value}</div>
      <div className="mt-0.5 text-[10px] text-mut">{label}</div>
    </div>
  );
}
