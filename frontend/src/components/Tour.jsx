import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { TOUR_STEPS, markTourSeen } from "../data/tour.js";

// 첫 사용 안내 — 화면을 어둡게 덮고 그 버튼만 뚫어 보여주고, 다음 화면으로 데려간다.
//
// Layout 에 마운트한다. 화면 안에 두면 라우트가 바뀔 때 같이 사라져 안내가 끊긴다.
//
// 구멍은 큰 box-shadow 로 낸다(캔버스·클립패스 없이 됨): 작은 사각형에 화면보다 큰
// 그림자를 주면 그 사각형만 빼고 전부 어두워진다.
export default function Tour() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [at, setAt] = useState(0);
  const [box, setBox] = useState(null);
  const [ready, setReady] = useState(false);   // 이번 단계의 대상을 찾았나
  const timers = useRef([]);

  const clearTimers = () => { timers.current.forEach(clearInterval); timers.current = []; };

  // 스스로 시작하지 않는다 — 온보딩을 마쳤을 때나 설정에서 눌렀을 때만 열린다.
  // (자동으로 띄우면 '이미 계정이 있어요'로 들어온 사람에게도 뜬다.)
  useEffect(() => {
    const start = () => { setAt(0); setOpen(true); };
    window.addEventListener("pm:tour-start", start);
    return () => { window.removeEventListener("pm:tour-start", start); clearTimers(); };
  }, []);

  const step = open ? TOUR_STEPS[at] : null;

  // 단계가 바뀌면 그 화면으로 데려간 뒤, 대상이 나타날 때까지 기다린다.
  useEffect(() => {
    if (!step) return;
    setReady(false);
    setBox(null);
    if (step.route && step.route !== pathname) { navigate(step.route); return; }

    let waited = 0;
    const find = setInterval(() => {
      const el = document.querySelector(`[data-tour="${step.id}"]`);
      if (el) {
        clearInterval(find);
        el.scrollIntoView({ block: "center", behavior: "smooth" });
        setReady(true);
        return;
      }
      waited += 120;
      // 3초를 기다려도 없으면 그 단계는 이 화면에 없는 것 — 조용히 넘긴다.
      if (waited > 3000) {
        clearInterval(find);
        setAt((i) => (i + 1 < TOUR_STEPS.length ? i + 1 : i));
        if (at + 1 >= TOUR_STEPS.length) finish();
      }
    }, 120);
    timers.current.push(find);
    return () => clearInterval(find);
  }, [step, pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // 대상 위치 추적 — 스크롤·리사이즈에도 구멍이 따라간다.
  useEffect(() => {
    if (!ready || !step) return;
    const measure = () => {
      const el = document.querySelector(`[data-tour="${step.id}"]`);
      if (!el) return;
      const r = el.getBoundingClientRect();
      setBox({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    measure();
    const id = setInterval(measure, 200);
    window.addEventListener("resize", measure);
    timers.current.push(id);
    return () => { clearInterval(id); window.removeEventListener("resize", measure); };
  }, [ready, step]);

  function finish() {
    markTourSeen();
    clearTimers();
    setOpen(false);
    setBox(null);
  }
  const next = () => (at + 1 < TOUR_STEPS.length ? setAt(at + 1) : finish());

  if (!open || !step) return null;

  const pad = 8;
  const hole = box && {
    top: box.top - pad, left: box.left - pad,
    width: box.width + pad * 2, height: box.height + pad * 2,
  };
  // 말풍선은 대상 아래에, 아래가 좁으면 위에 붙인다.
  const below = box ? box.top + box.height + 210 < window.innerHeight : true;
  const W = 300;

  return (
    <div className="fixed inset-0 z-[200]" role="dialog" aria-label="사용 안내">
      {/* 대상을 아직 못 찾았으면 화면만 덮어 둔다(빈 구멍이 번쩍이지 않게) */}
      {!hole && <div className="absolute inset-0 bg-[#030712]/82" />}
      {hole && (
        <div
          className="pointer-events-none absolute rounded-[14px] transition-all duration-300"
          style={{
            top: hole.top, left: hole.left, width: hole.width, height: hole.height,
            boxShadow: "0 0 0 9999px rgba(3,7,18,.82)",
            outline: "2px solid rgba(139,108,207,.9)",
          }}
        />
      )}

      {/* 배경 아무 데나 눌러도 다음으로 */}
      <button onClick={next} className="absolute inset-0 h-full w-full cursor-default" aria-label="다음" />

      <div
        className="absolute w-[min(300px,calc(100vw-32px))] rounded-[18px] border border-[#8B6CCF]/40 bg-[#111A2C] p-4 shadow-[0_20px_60px_rgba(0,0,0,.6)]"
        style={hole ? {
          top: below ? hole.top + hole.height + 12 : undefined,
          bottom: below ? undefined : window.innerHeight - hole.top + 12,
          left: Math.max(16, Math.min(window.innerWidth - W - 16, hole.left)),
        } : { top: "50%", left: "50%", transform: "translate(-50%,-50%)" }}
      >
        <p className="text-[10px] text-[#A88BE8]">{at + 1} / {TOUR_STEPS.length}</p>
        <h3 className="mt-1 text-[14px] font-bold text-ink">{step.title}</h3>
        <p className="mt-1.5 text-[11.5px] leading-relaxed text-sub">{step.body}</p>

        <div className="mt-3 flex items-center gap-2">
          <button onClick={finish} className="tap text-[11px] text-mut">건너뛰기</button>
          <div className="flex-1" />
          {at > 0 && (
            <button onClick={() => setAt(at - 1)} className="tap rounded-lg border border-white/[.12] px-3 py-1.5 text-[11px] text-sub">
              이전
            </button>
          )}
          <button onClick={next} className="tap rounded-lg bg-[#8B6CCF] px-3.5 py-1.5 text-[11px] font-bold text-white">
            {at + 1 < TOUR_STEPS.length ? "다음" : "시작하기"}
          </button>
        </div>
      </div>
    </div>
  );
}
