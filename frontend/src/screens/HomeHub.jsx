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
import { domainAlerts } from "../data/diarySignals.js";
import { toChoiceDomains } from "../data/choices.js";

// 홈 = 진입 허브. 인사 + 마스코트 + 오늘 기록 + 새 시뮬 + 나의 우주 요약.
export default function HomeHub() {
  const navigate = useNavigate();
  const { profile, setChoices, setScenarioTexts, setScenarioDomains } = useResult();
  const universe = universeSummary();
  // 삶의 영역별 알림 — 그 영역 일기가 무겁거나 신호어가 잦으면 각각 띄운다.
  // (전에는 이직 하나만 봐서, 관계·건강이 힘들어도 같은 카드만 떴다.)
  const alerts = useMemo(() => domainAlerts({ windowDays: 28 }).slice(0, 3), []);

  // 알림 → 그 영역의 갈림길로 시뮬레이션을 연다. 영역도 함께 넘겨 결과가 그 행성에 쌓이게.
  function startCompare(alert) {
    setChoices({ a: alert.choiceA, b: alert.choiceB });
    setScenarioTexts({ a: alert.choiceA, b: alert.choiceB });
    // 결과 화면의 지표 필터는 선택지 영역 어휘를 쓴다 — 행성 key 를 그대로 주면 걸러진다.
    const ds = toChoiceDomains(alert.domain);
    setScenarioDomains({ a: ds, b: ds });
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

      {/* 영역별 알림 — 일기에서 문제가 드러난 영역마다 하나씩. 근거(무거웠던 날·신호 일수)를
          카드에 그대로 적는다. 넘겨짚은 말이 아니라 기록에서 나온 말이어야 한다. */}
      {alerts.map((alert) => (
        <button
          key={alert.domain}
          onClick={() => startCompare(alert)}
          className="tap mt-2.5 flex w-full items-center gap-3 rounded-[18px] border border-cyan/40 bg-[#1D1730] px-4 py-3.5 text-left transition-colors hover:bg-[#16264a] lg:max-w-[560px]"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-violet-400">
            <GitCompareArrows size={18} strokeWidth={2} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-semibold text-cyan">
              {alert.domainLabel} · 최근 {alert.windowDays}일 {alert.reason}
            </span>
            <span className="block text-[11px] text-sub">{alert.ask}</span>
          </span>
          <ChevronRight size={18} className="text-violet-400" />
        </button>
      ))}

      {/* 새 시뮬 CTA — 이 앱이 하는 일이 첫 화면에 보이도록 그리드 위에 둔다. */}
      <Button
        className="mt-3 flex items-center justify-center gap-1.5 lg:max-w-[420px] lg:py-4"
        onClick={() => navigate("/input")}
      >
        <Sparkles size={18} strokeWidth={2.2} className="text-violet-200" />
        새 시뮬레이션 시작
      </Button>

      {/* 왼쪽: 오늘의 기록 → 나의 우주 요약 / 오른쪽: 서버 상태·탐험·오늘의 제안 */}
      <div className="lg:mt-6 lg:grid lg:grid-cols-[minmax(0,1.45fr)_minmax(300px,.75fr)] lg:items-start lg:gap-7 xl:grid-cols-[minmax(0,1.5fr)_minmax(340px,.82fr)] xl:gap-9">
        <div>
          <DiaryToday />

          {/* 나의 우주 요약 — 오늘 기록한 것이 어디에 쌓이는지 바로 밑에서 보이게 한다. */}
          <div className="mb-2 mt-7 flex items-center justify-between px-1">
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
        </div>

        <aside className="lg:sticky lg:top-0">
          {/* AI 서버가 안 잡히면 조용히 사라지지 않고 알려준다 */}
          <ApiStatus />

          {/* 떠나 있는 작은 탐험 — 나의 우주에서 고른 길을 잊지 않게 여기 걸어둔다 */}
          <ExpeditionBoard />

          {/* 오늘 해볼 만한 것 — 인생 갈림길(기회 카드)보다 작은, 오늘 크기의 제안 */}
          <DailySuggest />
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
