import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useResult } from "../data/ResultContext.jsx";
import { Eyebrow } from "../components/ui.jsx";

const STEPS = [
  "유사인물 200명 탐색",
  "소득 변화 집계",
  "이직 인과효과 추정",
  "재이직 리스크 계산",
  "Claude 서사 생성",
  "아바타 기반 A/B 장면 생성",
];

export default function Simulate() {
  const navigate = useNavigate();
  const { runSimulation } = useResult();
  const [done, setDone] = useState(0);

  useEffect(() => {
    let cancelled = false;
    // 백엔드 /simulate 호출 — 결과가 준비된 뒤 결과 화면으로 이동(레이스 방지).
    const sim = runSimulation();
    let i = 0;
    const tick = setInterval(() => {
      i += 1;
      setDone(Math.min(i, STEPS.length));
      if (i >= STEPS.length) clearInterval(tick);
    }, 440);
    // 애니메이션(최소 표시시간)과 실제 호출이 모두 끝나면 이동.
    Promise.all([sim, new Promise((r) => setTimeout(r, STEPS.length * 440))]).finally(() => {
      if (!cancelled) setTimeout(() => navigate("/result", { replace: true }), 300);
    });
    return () => {
      cancelled = true;
      clearInterval(tick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <Eyebrow>SIMULATE</Eyebrow>

      {/* 블랙홀 → 두 행성(A/B) 분열 */}
      <div
        className="relative mx-auto my-3 mb-8 h-[150px] w-[150px] animate-spin-slow rounded-full"
        style={{
          background: "radial-gradient(circle, #05070F 52%, #4A90E2 74%, #05070F 100%)",
        }}
      >
        <div className="absolute -left-3.5 top-[55px] flex h-11 w-11 animate-driftA items-center justify-center rounded-full border-[1.5px] border-cyan bg-[#12203a] font-bold text-cyan">
          A
        </div>
        <div className="absolute -right-3.5 top-[55px] flex h-11 w-11 animate-driftB items-center justify-center rounded-full border-[1.5px] border-gold bg-[#241d10] font-bold text-gold">
          B
        </div>
      </div>

      <h2 className="mb-1 text-base font-semibold">두 개의 미래를 계산하는 중</h2>
      <p className="text-[11px] text-mut">RAG 서사와 내 아바타로 두 장면을 만들어요</p>

      <div className="mt-3 w-[220px] text-left">
        {STEPS.map((s, i) => {
          const isDone = i < done;
          return (
            <div
              key={s}
              className={`my-2 text-xs transition-colors ${isDone ? "text-sub" : "text-mut"}`}
            >
              <span className={isDone ? "text-cyan" : "text-mut"}>{isDone ? "● " : "○ "}</span>
              {s}
            </div>
          );
        })}
      </div>
    </div>
  );
}
