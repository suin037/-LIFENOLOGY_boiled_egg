import { useNavigate } from "react-router-dom";
import { useResult } from "../data/ResultContext.jsx";
import { Card, Button, Row } from "../components/ui.jsx";
import { MY_UNIVERSE, MASCOTS, totalNeighbors } from "../data/result.js";

// 홈 = 진입 허브. 인사 + 마스코트 + 새 시뮬 CTA + 최근 결과 요약 + 미니 통계.
export default function HomeHub() {
  const navigate = useNavigate();
  const { profile, result } = useResult();
  const { option_a: a } = result;
  const total = totalNeighbors(result);
  const guide = MASCOTS.cosmo;

  return (
    <div>
      <div className="mb-1 mt-2 text-[13px] text-sub">안녕하세요, 탐험가님 👋</div>
      <h1 className="text-[24px] font-bold leading-[1.2]">
        오늘도 어떤 갈림길을
        <br />
        비춰볼까요?
      </h1>

      {/* 마스코트 한마디 */}
      <Card highlight className="flex items-center gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl"
          style={{ background: "#12203a", border: `1.5px solid ${guide.color}` }}
        >
          {guide.emoji}
        </div>
        <div>
          <div className="text-[11px] font-bold" style={{ color: guide.color }}>
            {guide.name} · {guide.role}
          </div>
          <p className="mt-0.5 text-[13px] leading-relaxed text-sub">
            미래를 지어내지 않아요. 데이터에서 비슷한 사람들을 찾아 그대로 비춰드릴게요.
          </p>
        </div>
      </Card>

      {/* 새 시뮬 CTA */}
      <Button className="mt-4" onClick={() => navigate("/input")}>
        새 시뮬레이션 시작 ✦
      </Button>

      {/* 최근 결과 요약 */}
      <div className="mb-2 mt-6 text-xs font-semibold tracking-wide text-mut">최근 결과</div>
      <Card className="cursor-pointer" >
        <button className="tap w-full text-left" onClick={() => navigate("/result")}>
          <div className="flex items-center justify-between">
            <div className="text-[15px] font-semibold">
              {profile.age}세 · {profile.occupation}
            </div>
            <span className="text-[11px] text-cyan">자세히 →</span>
          </div>
          <Row label="이직한 사람들">
            소득 중앙값 <span className="font-bold text-cyan">+{a.income_change_med}%</span>
            <span className="text-sub"> ({a.n}명)</span>
          </Row>
          <Row label="다만 소득 감소">
            <span className="font-bold text-danger">{a.income_down_pct}%</span>
            <span className="text-sub"> · 비슷한 {total}명 기준</span>
          </Row>
        </button>
      </Card>

      {/* 미니 통계 */}
      <div className="mt-4 grid grid-cols-3 gap-2.5">
        <Stat label="시뮬레이션" value={MY_UNIVERSE.stats.simulations} />
        <Stat label="수집한 별" value={MY_UNIVERSE.stats.stars} />
        <Stat label="탐험한 우주" value={MY_UNIVERSE.stats.universes} />
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
