import { useMemo } from "react";
import { useResult } from "../../data/ResultContext.jsx";
import { computeDiarySignals, valueGap } from "../../data/diarySignals.js";

// ── 결과 화면 "내 기록 기반 상태" (3층 중 2층) ──
// 3층 구조:  ① 통계 기반 결과(기존 탭들)  ② 내 기록 기반 상태(이 카드)  ③ 개인화 해석(PersonaScenario)
// 정직선: 이 카드는 예측 '숫자'를 바꾸지 않는다. 최근 일기에서 "드러난" 상태를 보여줄 뿐이다.
export default function DiarySignalCard() {
  const { profile } = useResult();
  const sig = useMemo(() => computeDiarySignals({ windowDays: 28 }), []);
  const gap = useMemo(() => valueGap(profile, sig), [profile, sig]);

  const shown = (sig.signals || []).filter((x) => x.days > 0).slice(0, 4);

  return (
    <div className="mb-3 rounded-2xl border border-line bg-[#101827] p-3.5">
      <div className="flex items-center justify-between">
        <div className="text-[13px] font-bold text-ink">🗒 내 기록 기반 상태</div>
        {sig.ok && <span className="text-[10px] text-mut">최근 {sig.windowDays}일 · {sig.days}일 기록</span>}
      </div>

      {!sig.ok ? (
        <p className="mt-2 text-[11px] leading-relaxed text-mut">
          최근 일기가 아직 없어요. 홈에서 며칠 기록하면, 반복되는 고민·가치가 여기에 정리돼
          이 예측을 <b className="text-sub">내 기준으로</b> 읽을 수 있어요.
        </p>
      ) : (
        <>
          {sig.jobChangeDays >= 1 && (
            <p className="mt-2 text-[11.5px] leading-relaxed text-sub">
              최근 {sig.windowDays}일 동안 <b className="text-cyan">이직 고민이 {sig.jobChangeDays}일</b> 나타났어요.
              {sig.jobChangeDays >= 3 && " 지금 이 비교가 마침 필요한 시점 같아요."}
            </p>
          )}

          {/* 드러난 신호 — 며칠에 걸쳐 나타났나 (막대) */}
          {shown.length > 0 && (
            <div className="mt-2.5 space-y-1.5">
              {shown.map((s) => (
                <div key={s.key} className="flex items-center gap-2">
                  <span className="w-[68px] shrink-0 text-[11px] text-sub">{s.label}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#223047]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#2F6FE8] to-[#67A3FF]"
                      style={{ width: `${Math.min(100, Math.round(s.intensity * 100))}%` }}
                    />
                  </div>
                  <span className="w-[34px] shrink-0 text-right text-[10px] tabular-nums text-mut">{s.days}일</span>
                </div>
              ))}
            </div>
          )}

          {/* 기분 추세 */}
          {sig.moodTrend != null && (
            <div className="mt-2.5 text-[11px] text-mut">
              기분 추세{" "}
              <b className={sig.moodTrend > 0.1 ? "text-[#5DCAA5]" : sig.moodTrend < -0.1 ? "text-[#F0736F]" : "text-sub"}>
                {sig.moodTrend > 0.1 ? "↗ 회복세" : sig.moodTrend < -0.1 ? "↘ 하강세" : "→ 비슷"}
              </b>
              <span className="text-[10px]"> (창 후반이 전반보다 {Math.abs(sig.moodTrend).toFixed(2)})</span>
            </div>
          )}

          {/* 선택한 가치 vs 기록에서 드러난 가치 */}
          {gap.selectedLabel && gap.revealedAxis && (
            <div className="mt-2.5 rounded-xl border border-line bg-[#0E1424] p-2.5 text-[11px]">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-mut">선택한 가치</span>
                <b className="text-sub">{gap.selectedLabel}{gap.selectedAxis ? ` · ${gap.selectedAxis}` : ""}</b>
                <span className="text-mut">/ 기록에서 드러난 무게중심</span>
                <b className="text-sub">{gap.revealedAxis}</b>
              </div>
              <p className="mt-1 text-[10px] leading-relaxed text-mut">
                {gap.aligned
                  ? "고른 가치와 기록이 같은 방향이에요 — 선택에 확신을 실어도 될 신호."
                  : "고른 가치와 기록이 다른 방향이에요 — 무엇을 더 중요하게 여기는지 한 번 짚어볼 지점."}
              </p>
            </div>
          )}
        </>
      )}

      <p className="mt-2.5 text-[9.5px] leading-relaxed text-mut/80">
        일기에서 드러난 주제예요. 예측 <b>숫자를 바꾸지 않고</b>, 무엇을 비교할지 제안하고 통계 결과를 내 기준으로 읽는 데 씁니다.
      </p>
    </div>
  );
}
