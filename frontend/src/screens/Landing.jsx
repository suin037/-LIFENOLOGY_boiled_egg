import { useNavigate } from "react-router-dom";
import { Card, Button } from "../components/ui.jsx";

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div>
      <div className="h-[64px]" />
      <p className="mb-3 text-sm font-semibold text-cyan">내 선택을 데이터로 미리 살펴보세요</p>
      <h1 className="mb-2 text-[30px] font-bold leading-[1.22] tracking-[-.04em]">
        고민되는 두 선택,
        <br />조금 더 선명하게
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-sub">
        이직할까, 남을까 — 고민되는 갈림길에서
        <br />
        <span className="font-semibold text-ink">나와 비슷한 실제 사람들</span>이 각 선택에서
        <br />
        어떻게 됐는지 데이터로 보여줍니다.
      </p>

      <Card className="mt-8">
        <div className="mb-2 text-sm font-semibold text-ink">예측이 아닌 비교 정보예요</div>
        <div className="text-[13px] leading-[1.6] text-sub">
          미래를 지어내지 않습니다. 한국 패널 데이터에서 실제 응답자를 찾아 보여줍니다.
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
