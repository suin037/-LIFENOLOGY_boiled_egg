import { useNavigate } from "react-router-dom";
import { Orbit, ChevronRight, Sparkles } from "lucide-react";
import { useResult } from "../data/ResultContext.jsx";
import { Button } from "../components/ui.jsx";
import DiaryToday from "../components/DiaryToday.jsx";
import { universeSummary } from "../data/myUniverse.js";

// 홈 = 진입 허브. 인사 + 마스코트 + 오늘 기록 + 새 시뮬 + 나의 우주 요약.
export default function HomeHub() {
  const navigate = useNavigate();
  const { profile } = useResult();
  const universe = universeSummary();

  return (
    <div className="pb-2">
      {/* 인사 */}
      <div className="mb-0.5 mt-1 text-[13px] text-sub">
        안녕하세요, {profile.name?.trim() ? `${profile.name.trim()}님` : "탐험가님"} 👋
      </div>
      <h1 className="text-[25px] font-bold leading-[1.22] tracking-[-.02em]">
        오늘도 어떤 갈림길을
        <br />
        비춰볼까요?
      </h1>

      {/* 가이드 캐러셀 + 이번 주 기록 + 오늘 체크인 */}
      <DiaryToday />

      {/* 새 시뮬 CTA */}
      <Button className="mt-4 flex items-center justify-center gap-1.5" onClick={() => navigate("/input")}>
        <Sparkles size={18} strokeWidth={2.2} />
        새 시뮬레이션 시작
      </Button>

      {/* 나의 우주 요약 */}
      <div className="mb-2 mt-7 flex items-center justify-between px-1">
        <span className="text-[15px] font-bold text-ink">나의 우주</span>
        <button
          onClick={() => navigate("/my")}
          className="tap flex items-center gap-0.5 text-[12px] text-mut"
        >
          전체 보기 <ChevronRight size={14} />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Stat label="시뮬레이션" value={universe.stats.simulations} />
        <Stat label="수집한 별" value={universe.stats.stars} />
        <Stat label="탐험한 우주" value={universe.stats.universes} />
      </div>

      <button
        onClick={() => navigate("/my")}
        className="tap mt-2 flex w-full items-center gap-3 rounded-[18px] bg-card px-4 py-3.5 text-left transition-colors hover:bg-card2"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan/15 text-cyan">
          <Orbit size={18} strokeWidth={2} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-semibold text-ink">나의 우주 열기</span>
          <span className="block text-[11px] text-mut">별자리·행성·저장한 평행우주</span>
        </span>
        <ChevronRight size={18} className="text-mut" />
      </button>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-[18px] bg-card px-2 py-3.5 text-center">
      <div className="text-[20px] font-bold text-ink">{value}</div>
      <div className="mt-0.5 text-[10px] text-mut">{label}</div>
    </div>
  );
}
