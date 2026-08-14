import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui.jsx";

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="relative flex min-h-full flex-col overflow-hidden">
      <div className="absolute inset-0 bg-[#050914]">
        <video
          className="absolute inset-0 h-full w-full object-cover"
          src="/space-intro.mp4"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          aria-label="별과 행성이 펼쳐지는 우주 인트로"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#030712]/15 via-[#050914]/25 to-[#07101E]/95" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_68%_38%,transparent_0%,rgba(3,7,18,.08)_35%,rgba(3,7,18,.48)_100%)]" />
      </div>

      <div className="relative z-10 flex min-h-full flex-1 flex-col justify-end px-5 pb-7 pt-20 sm:px-8 sm:pb-8 lg:flex-row lg:items-end lg:justify-between lg:gap-16 lg:px-14 lg:pb-14 xl:px-20 xl:pb-16 2xl:px-24">
        <div className="max-w-[620px] lg:pb-1">
          <p className="mb-3 text-[11px] font-bold tracking-[.18em] text-violet-300 lg:text-[13px]">✦ PARALLEL ME</p>
          <h1 className="mb-2 text-[32px] font-bold leading-[1.16] tracking-[-.04em] text-white lg:text-[52px] xl:text-[60px]">
            고민되는 두 선택,
            <br />조금 더 선명하게
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-white/75 lg:text-[16px] lg:leading-7">
            나와 비슷한 실제 사람들의 데이터로
            <br />두 선택 이후의 가능성을 살펴봅니다.
          </p>
        </div>

        <div className="mt-5 flex flex-col gap-3 lg:mt-0 lg:w-auto lg:min-w-[380px] lg:flex-row-reverse lg:items-center lg:justify-end lg:gap-3">
          <Button className="lg:min-w-[150px] lg:px-7 lg:py-4" onClick={() => navigate("/onboarding")}> 
            시작하기
          </Button>
          <Button variant="ghost" className="whitespace-nowrap lg:min-w-[190px] lg:bg-white/10 lg:px-7 lg:py-4 lg:backdrop-blur-md" onClick={() => navigate("/onboarding")}> 
            이미 계정이 있어요
          </Button>
        </div>
      </div>
    </div>
  );
}
