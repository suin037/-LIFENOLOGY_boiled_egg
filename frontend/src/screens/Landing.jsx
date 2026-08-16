import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Button } from "../components/ui.jsx";
import { markTourSeen, resetTour } from "../data/tour.js";

export default function Landing() {
  const navigate = useNavigate();
  const forwardVideoRef = useRef(null);
  const reverseVideoRef = useRef(null);
  const [videoDirection, setVideoDirection] = useState("forward");

  const switchVideo = (direction) => {
    const target = direction === "forward" ? forwardVideoRef.current : reverseVideoRef.current;
    if (!target) return;
    target.currentTime = 0;
    const showWhenPlaying = () => {
      target.play().then(() => setVideoDirection(direction)).catch(() => {});
    };
    if (target.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) showWhenPlaying();
    else target.addEventListener("canplay", showWhenPlaying, { once: true });
  };

  return (
    <div className="relative -mx-5 -mt-1 flex min-h-full flex-col overflow-hidden sm:mx-0 sm:mt-0 sm:rounded-[28px]">
      <div className="absolute inset-0 bg-[#050914]">
        <video
          ref={forwardVideoRef}
          className={`absolute inset-0 h-full w-full object-cover ${videoDirection === "forward" ? "opacity-100" : "opacity-0"}`}
          src="/space-intro.mp4"
          autoPlay
          muted
          playsInline
          preload="auto"
          onEnded={() => switchVideo("reverse")}
          aria-label="별과 행성이 펼쳐지는 우주 인트로"
        />
        <video
          ref={reverseVideoRef}
          className={`absolute inset-0 h-full w-full object-cover ${videoDirection === "reverse" ? "opacity-100" : "opacity-0"}`}
          src="/space-intro-reverse.mp4"
          muted
          playsInline
          preload="auto"
          onEnded={() => switchVideo("forward")}
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#030712]/10 via-[#050914]/30 to-[#07101E]" />
      </div>

      <div className="relative z-10 flex min-h-full flex-1 flex-col justify-end px-5 pb-7 pt-20 sm:px-8 sm:pb-8 lg:flex-row lg:items-end lg:justify-between lg:gap-10 lg:px-11 lg:pb-11">
        <div className="max-w-[430px] lg:pb-1">
          <p className="mb-3 text-[11px] font-bold tracking-[.18em] text-cyan">PARALLEL ME</p>
          <h1 className="mb-2 text-[32px] font-bold leading-[1.16] tracking-[-.04em] text-white lg:text-[38px]">
            고민되는 두 선택,
            <br />조금 더 선명하게
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-white/75">
            나와 비슷한 실제 사람들의 데이터로
            <br />두 선택 이후의 가능성을 살펴봅니다.
          </p>
        </div>

        <div className="mt-5 flex flex-col gap-3 lg:mt-0 lg:w-auto lg:min-w-[300px] lg:flex-row-reverse lg:items-center lg:justify-end lg:gap-3">
          {/* 처음 만드는 계정에만 사용 안내를 띄운다 — 쓰던 사람에게 다시 띄우면 방해다. */}
          <Button className="lg:min-w-[120px] lg:px-6" onClick={() => { resetTour(); navigate("/onboarding"); }}>
            시작하기
          </Button>
          <Button variant="ghost" className="whitespace-nowrap lg:min-w-[168px] lg:px-7" onClick={() => { markTourSeen(); navigate("/onboarding"); }}>
            이미 계정이 있어요
          </Button>
        </div>
      </div>
    </div>
  );
}
