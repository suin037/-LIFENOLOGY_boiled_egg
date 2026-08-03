import { useNavigate } from "react-router-dom";
import { useResult } from "../data/ResultContext.jsx";
import { Card, Button, Row } from "../components/ui.jsx";
import { MY_UNIVERSE, MASCOTS } from "../data/result.js";
import { labelOf } from "../data/prediction.js";
import DiaryToday from "../components/DiaryToday.jsx";
import MoodTrend from "../components/MoodTrend.jsx";
import { universeSummary } from "../data/myUniverse.js";

// 홈 = 진입 허브. 인사 + 마스코트 + 새 시뮬 CTA + 최근 결과 요약 + 미니 통계.
export default function HomeHub() {
  const navigate = useNavigate();
  const { profile, result } = useResult();
  const { a, b } = result;
  const guide = MASCOTS.cosmo;
  const universe = universeSummary();

  return (
    <div>
      <div className="mb-1 mt-2 text-[13px] text-sub">
        안녕하세요, {profile.name?.trim() ? `${profile.name.trim()}님` : "탐험가님"} 👋
      </div>
      <h1 className="text-[24px] font-bold leading-[1.2]">
        오늘도 어떤 갈림길을
        <br />
        비춰볼까요?
      </h1>

      {/* 오늘 기록(일기) + 최근 감정 흐름 */}
      <div className="mt-3">
        <DiaryToday />
        <MoodTrend />
      </div>

      {/* 새 시뮬 CTA */}
      <Button className="mt-4" onClick={() => navigate("/input")}>
        새 시뮬레이션 시작 ✦
      </Button>

      {/* 미니 통계 */}
      <div className="mt-4 grid grid-cols-3 gap-2.5">
        <Stat label="시뮬레이션" value={universe.stats.simulations} />
        <Stat label="수집한 별" value={universe.stats.stars} />
        <Stat label="탐험한 우주" value={universe.stats.universes} />
      </div>
      <button
        onClick={() => navigate("/my")}
        className="tap mt-3 w-full rounded-2xl border border-line bg-[#0E1424] py-3 text-[13px] text-sub"
      >
        🪐 나의 우주 열기
      </button>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl border border-line bg-card px-2 py-3 text-center">
      <div className="text-[19px] font-bold text-ink">{value}</div>
      <div className="mt-0.5 text-[10px] text-mut">{label}</div>
    </div>
  );
}
