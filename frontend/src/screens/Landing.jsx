import { useNavigate } from "react-router-dom";
import { Eyebrow, Card, Button } from "../components/ui.jsx";

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div>
      <div className="h-[70px]" />
      <Eyebrow>PARALLEL ME</Eyebrow>
      <h1 className="mb-2 text-2xl font-bold leading-[1.25] tracking-tight">
        선택이 만드는
        <br />두 개의 평행우주
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-sub">
        이직할까, 남을까 — 고민되는 갈림길에서
        <br />
        <span className="font-bold text-cyan">나와 비슷한 실제 사람들</span>이 각 선택에서
        <br />
        어떻게 됐는지 데이터로 보여줍니다.
      </p>

      <Card className="mt-6">
        <div className="mb-2 text-xs font-bold text-gold">예측이 아니라 거울입니다</div>
        <div className="text-[13px] leading-relaxed text-sub">
          미래를 지어내지 않습니다. 한국 패널 데이터(GOMS·YP)에서 실제 응답자를 찾아 보여줍니다.
        </div>
      </Card>

      <Button className="mt-5" onClick={() => navigate("/onboarding")}>
        시작하기
      </Button>
      <Button variant="ghost" className="mt-3" onClick={() => navigate("/onboarding")}>
        이미 계정이 있어요
      </Button>
    </div>
  );
}
