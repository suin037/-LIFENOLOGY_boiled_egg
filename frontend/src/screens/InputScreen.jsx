import { useNavigate } from "react-router-dom";
import { useResult } from "../data/ResultContext.jsx";
import { Eyebrow, Card, Button, Caption } from "../components/ui.jsx";

export default function InputScreen() {
  const navigate = useNavigate();
  const { profile } = useResult();

  const valueLabel = profile.values.includes("성장 가능성")
    ? "성장 지향"
    : profile.values[0] || "—";

  return (
    <div>
      <Eyebrow>NEW SIMULATION · 갈림길 입력</Eyebrow>
      <h1 className="text-[22px] font-bold leading-[1.25]">
        지금 어떤 선택을
        <br />
        고민하고 있나요?
      </h1>
      <Caption>두 갈래를 넣으면, 각 길을 걸어간 실제 사람들을 찾아 비교합니다.</Caption>

      {/* UNIVERSE A(이직) / B(잔류) — 둘 다 항상 시뮬레이션 */}
      <div className="mt-5 flex gap-2.5">
        <div className="flex-1 rounded-[14px] border-[1.5px] border-cyan bg-[#12203a] p-3.5">
          <div className="text-[11px] font-bold tracking-wide text-cyan">UNIVERSE A</div>
          <div className="mt-2 text-[15px] text-cyan">이직한다</div>
        </div>
        <div className="flex-1 rounded-[14px] border-[1.5px] border-gold bg-[#241d10] p-3.5">
          <div className="text-[11px] font-bold tracking-wide text-gold">UNIVERSE B</div>
          <div className="mt-2 text-[15px] text-gold">현직 유지</div>
        </div>
      </div>
      <Caption className="mt-3.5">두 우주를 모두 시뮬레이션해서 나란히 비교합니다.</Caption>

      <Card className="mt-5">
        <div className="mb-1.5 text-xs text-sub">이번 시뮬레이션 요약</div>
        <div className="text-sm">
          {profile.age}세 · {profile.occupation} · {valueLabel} → 이직 vs 잔류
        </div>
      </Card>

      <Button className="mt-5" onClick={() => navigate("/simulate")}>
        평행우주 열기 ✦
      </Button>
    </div>
  );
}
