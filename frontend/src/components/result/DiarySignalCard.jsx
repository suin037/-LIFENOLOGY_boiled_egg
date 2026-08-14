import { useMemo } from "react";
import { useResult } from "../../data/ResultContext.jsx";
import { computeDiarySignals, valueGap, interpretSignals, domainAnalysis, domainReport, detectRelationSubtype } from "../../data/diarySignals.js";
import { domainLabel } from "../../data/choices.js";
import { PLANETS } from "../../data/result.js";

// 입력 분야(LIFE_DOMAINS 9종) → 일기 태깅 행성(5종) 매핑. 일기는 domain_tag 로 5개 키로만 태깅됨.
const LIFE_TO_PLANET = {
  career: "career", finance: "career", business: "career",
  education: "growth", long_term_values: "growth",
  relationship: "relation", health: "health",
  housing: "life", lifestyle: "life",
};

// ── 결과 화면 "내 기록 기반 상태" (3층 중 2층) ──
// 입력 시 자동 감지된 분야(scenarioDomains)를 기준으로, 그 분야 일기를 분석해 보여준다.
//  · 진로(career) 분야  → 이직 고민 신호 + 개인화 해석 (통계 예측과 짝)
//  · 그 외 분야(관계 등) → 그 분야 일기의 흐름·감정·대표 기록
// 정직선: 예측 '숫자'를 바꾸지 않는다. 최근 일기에서 "드러난" 상태만 보여준다.
export default function DiarySignalCard() {
  const { profile, scenarioDomains, choices, scenarioTexts } = useResult();

  // 입력에서 자동 감지된 분야 → 대표 분야 1개 → 행성 키
  const inputKeys = useMemo(
    () => [...new Set([...(scenarioDomains?.a || []), ...(scenarioDomains?.b || [])])],
    [scenarioDomains],
  );
  const primaryLife = inputKeys[0] || "career";
  const planetKey = LIFE_TO_PLANET[primaryLife] || "career";
  const isCareer = planetKey === "career";
  // 관계면 입력 텍스트에서 하위유형(연인/가족/친구/직장) 감지 → 그 유형만 분석
  const subtype = useMemo(() => {
    if (planetKey !== "relation") return null;
    const txt = `${choices?.a || ""} ${choices?.b || ""} ${scenarioTexts?.a || ""} ${scenarioTexts?.b || ""}`;
    return detectRelationSubtype(txt);
  }, [planetKey, choices, scenarioTexts]);
  const fieldLabel = subtype ? `관계 · ${subtype}` : domainLabel(primaryLife);

  const sig = useMemo(() => computeDiarySignals({ windowDays: 28 }), []);
  const gap = useMemo(() => valueGap(profile, sig), [profile, sig]);
  const shown = (sig.signals || []).filter((x) => x.days > 0).slice(0, 4);
  const hasJobSignal = sig.ok && (sig.jobChangeDays > 0 || shown.length > 0);
  const interp = useMemo(() => (isCareer && hasJobSignal ? interpretSignals(sig, gap) : null), [isCareer, hasJobSignal, sig, gap]);
  const toneColor = { caution: "#F0C36B", go: "#5DCAA5", mid: "#8B6CCF" };

  // 그 분야 일기 분석(그래프·감정·대표 기록). 관계면 하위유형만 필터.
  const anal = useMemo(() => domainAnalysis(planetKey, undefined, subtype), [planetKey, subtype]);

  return (
    <div className="mb-3 rounded-2xl border border-line bg-[#101827] p-3.5">
      <div className="flex items-center justify-between">
        <div className="text-[13px] font-bold text-ink">🗒 내 기록 기반 상태 · {fieldLabel}</div>
        {anal.ok && <span className="text-[10px] text-mut">{fieldLabel} 기록 {anal.n}개</span>}
      </div>
      <p className="mt-1 text-[10.5px] leading-relaxed text-mut">
        {subtype
          ? <>이 갈림길을 <b className="text-sub">{subtype} 관계</b>로 보고, <b className="text-sub">{subtype}</b> 관련 일기만 골라 분석했어요.</>
          : <>이 갈림길을 <b className="text-sub">{fieldLabel}</b> 분야로 보고, 그 분야 일기를 분석했어요.</>}
      </p>

      {!anal.ok ? (
        <p className="mt-2 text-[11px] leading-relaxed text-mut">
          아직 <b className="text-sub">{fieldLabel}</b> 분야 일기가 없어요. 홈에서 이 분야 기록을 남기면
          여기에 흐름·고민이 정리돼 이 예측을 내 기준으로 읽을 수 있어요.
        </p>
      ) : (
        <>
          {/* 진로 분야일 때만 — 이직 고민 신호(그 분야의 구체적 고민) */}
          {isCareer && hasJobSignal && (
            <>
              {sig.jobChangeDays >= 1 && (
                <p className="mt-2 text-[11.5px] leading-relaxed text-sub">
                  최근 {sig.windowDays}일 동안 <b className="text-cyan">이직 고민이 {sig.jobChangeDays}일</b> 나타났어요.
                  {sig.jobChangeDays >= 3 && " 지금 이 비교가 마침 필요한 시점 같아요."}
                </p>
              )}
              {shown.length > 0 && (
                <div className="mt-2.5 space-y-1.5">
                  {shown.map((s) => (
                    <div key={s.key} className="flex items-center gap-2">
                      <span className="w-[68px] shrink-0 text-[11px] text-sub">{s.label}</span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#223047]">
                        <div className="h-full rounded-full bg-[#8B6CCF]"
                          style={{ width: `${Math.min(100, Math.round(s.intensity * 100))}%` }} />
                      </div>
                      <span className="w-[34px] shrink-0 text-right text-[10px] tabular-nums text-mut">{s.days}일</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* 그 분야 일기 요약 + 그래프 (모든 분야 공통) */}
          <p className="mt-2.5 text-[11.5px] leading-relaxed text-sub">{domainReport(anal, fieldLabel)}</p>
          {anal.topEmotions.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {anal.topEmotions.map((e) => (
                <span key={e} className="rounded-full border border-line px-2 py-0.5 text-[10px] text-sub">{e}</span>
              ))}
            </div>
          )}
          <Sparkline series={anal.series} trend={anal.trend} />
          {anal.best.text && (
            <div className="mt-2 rounded-lg bg-[#1D1730] px-2.5 py-1.5">
              <div className="text-[9.5px] text-[#5DCAA5]">🌟 가장 좋았던 날 · {anal.best.date.slice(5)}</div>
              <div className="mt-0.5 text-[11px] leading-relaxed text-sub">“{anal.best.text}”</div>
            </div>
          )}
          {anal.worst.text && anal.worst.date !== anal.best.date && (
            <div className="mt-1.5 rounded-lg bg-[#241a1a] px-2.5 py-1.5">
              <div className="text-[9.5px] text-[#F0A0A0]">🌧 힘들었던 날 · {anal.worst.date.slice(5)}</div>
              <div className="mt-0.5 text-[11px] leading-relaxed text-sub">“{anal.worst.text}”</div>
            </div>
          )}

          {/* 진로 분야 개인화 해석 */}
          {isCareer && interp && (
            <div className="mt-3 border-t border-line pt-2.5">
              <div className="text-[11px] font-bold text-ink">🧭 그래서 — 내 기록으로 본 해석</div>
              <p className="mt-1.5 text-[11.5px] leading-relaxed text-sub">
                <b style={{ color: toneColor[interp.readiness.tone] }}>준비 상태 · </b>{interp.readiness.text}
              </p>
              <div className="mt-1.5 text-[11px] text-sub">
                <b className="text-mut">우선 확인할 조건</b>
                <ul className="mt-1 space-y-0.5">
                  {interp.conditions.map((c, i) => (
                    <li key={i} className="flex gap-1.5 leading-relaxed"><span className="text-mut">·</span><span>{c}</span></li>
                  ))}
                </ul>
              </div>
              {interp.valueNote && <p className="mt-1.5 text-[10px] leading-relaxed text-mut">{interp.valueNote}</p>}
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

// 연속 기분 흐름 그래프 — 기록 순서대로 이어지는 SVG polyline (이미지 아님, 데이터로 그림).
function Sparkline({ series = [], trend }) {
  if (!series.length) return null;
  const W = 260, H = 40, PAD = 4;
  const xs = (i) => (series.length === 1 ? W / 2 : PAD + (i * (W - 2 * PAD)) / (series.length - 1));
  const ys = (v) => H - PAD - ((v + 1) / 2) * (H - 2 * PAD);
  const pts = series.map((p, i) => `${xs(i).toFixed(1)},${ys(p.v).toFixed(1)}`).join(" ");
  const col = trend == null ? "#8B6CCF" : trend > 0.1 ? "#5DCAA5" : trend < -0.1 ? "#F0736F" : "#8B6CCF";
  return (
    <div className="mt-2.5">
      <div className="mb-1 text-[9.5px] text-mut">기분 흐름 (기록 순서대로 이어짐)</div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 44 }}>
        <line x1={PAD} y1={H / 2} x2={W - PAD} y2={H / 2} stroke="#28324D" strokeWidth="0.5" strokeDasharray="2 3" />
        {series.length > 1 && <polyline points={pts} fill="none" stroke={col} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />}
        {series.map((p, i) => <circle key={i} cx={xs(i)} cy={ys(p.v)} r="1.6" fill={col} />)}
      </svg>
    </div>
  );
}
