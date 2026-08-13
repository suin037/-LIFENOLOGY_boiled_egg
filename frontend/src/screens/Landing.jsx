import { useNavigate } from "react-router-dom";
import { Card, Button } from "../components/ui.jsx";

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="relative -mx-5 -mt-1 flex min-h-full flex-col overflow-hidden sm:mx-0 sm:mt-0 sm:rounded-[28px]">
      <div className="absolute inset-0 bg-[#050914]">
        <video
          className="h-full w-full object-cover"
          src="/space-intro.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-label="별과 행성이 펼쳐지는 우주 인트로"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#030712]/10 via-[#050914]/30 to-[#07101E]" />
      </div>

      <div className="relative z-10 flex min-h-full flex-1 flex-col justify-end px-5 pb-7 pt-20 sm:px-8 sm:pb-8">
        <p className="mb-3 text-[11px] font-bold tracking-[.18em] text-cyan">PARALLEL ME</p>
        <h1 className="mb-2 text-[32px] font-bold leading-[1.16] tracking-[-.04em] text-white">
          고민되는 두 선택,
          <br />조금 더 선명하게
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-white/75">
          나와 비슷한 실제 사람들의 데이터로
          <br />두 선택 이후의 가능성을 살펴봅니다.
        </p>

      <Card className="mt-7 !border-white/10 !bg-[#091322]/80 backdrop-blur-xl">
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
    </div>
  );
}
