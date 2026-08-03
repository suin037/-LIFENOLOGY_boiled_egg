import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";
import { Card } from "../components/ui.jsx";
import { MY_UNIVERSE, PLANETS, SAVED_UNIVERSES } from "../data/result.js";
import { useDiary, moodEmoji } from "../data/DiaryContext.jsx";
import { weeklyConstellations } from "../data/constellation.js";
import Constellation, { shapeFor, starColor } from "../components/Constellation.jsx";
import { WEEKLY_REPORTS } from "../data/weeklyReports.js";
import { questionText } from "../data/questions.js";
import { useResult } from "../data/ResultContext.jsx";
import { analyzeDisposition } from "../data/api.js";
import { setPlanet as persistPlanet, universeSummary } from "../data/myUniverse.js";

// 나의 우주 = 개인화 대시보드. 레벨/XP · 별자리 · 행성 · 평행우주 저장 · 통계.
export default function MyUniverse() {
  const navigate = useNavigate();
  const u = MY_UNIVERSE;
  const activity = universeSummary();
  const [planet, setPlanet] = useState(activity.state.planet || "career");
  const [slot, setSlot] = useState("A");

  // 별자리 = 일기로 생성(주별). 각 일기 = 별, 주마다 모양 변화.
  const { entries } = useDiary();
  const weeks = useMemo(() => weeklyConstellations(entries), [entries]);
  const [wIdx, setWIdx] = useState(Math.max(0, weeks.length - 1));
  const [showReport, setShowReport] = useState(false);
  const [selIdx, setSelIdx] = useState(null); // 선택한 별(일기) 인덱스
  const { profile } = useResult();
  const [live, setLive] = useState(null);   // 실시간 분석 결과
  const [busy, setBusy] = useState(false);
  const [apiErr, setApiErr] = useState(null);
  const week = weeks[wIdx] || null;

  async function runAnalyze() {
    if (!week) return;
    setBusy(true); setApiErr(null); setLive(null);
    try {
      // 누적: 가장 오래된 주 ~ 선택한 주 까지 전체(성향 빌드업이 보이게)
      const cum = weeks.slice(0, wIdx + 1).flatMap((w) => w.stars);
      const entries = cum.map((s) => ({
        date: s.date, mood: s.v, text: s.text, answers: s.answers || {},
      }));
      const r = await analyzeDisposition({
        ranked_cards: profile.values, mbti: profile.mbti, entries,
      });
      setLive(r);
    } catch (e) {
      setApiErr(e.message);
    } finally {
      setBusy(false);
    }
  }
  const sel = week && selIdx != null && week.slots[selIdx]?.filled ? week.slots[selIdx] : null;
  const realReport = week ? WEEKLY_REPORTS[week.weeksAgo] : null;
  function goWeek(delta) {
    setWIdx((i) => Math.min(weeks.length - 1, Math.max(0, i + delta)));
    setShowReport(false);
    setSelIdx(null);
    setLive(null);
    setApiErr(null);
  }

  const selectedPlanet = PLANETS.find((p) => p.key === planet);

  function choosePlanet(key) {
    setPlanet(key);
    persistPlanet(key);
  }

  return (
    <div>
      <h1 className="mb-1 mt-2 text-[24px] font-bold leading-[1.2]">나의 우주</h1>
      <p className="mb-3 text-[13px] text-sub">
        별자리, 행성, 유성 이벤트로 나만의 평행우주를 만들어보세요
      </p>

      {/* 레벨 / XP */}
      <Card className="flex items-center gap-3">
        <div className="h-11 w-11 shrink-0 rounded-full bg-gradient-to-br from-cyan to-[#8B5CF6]" />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-bold">
              {activity.title} · Lv. {activity.level}
            </span>
            <span className="text-[11px] text-mut">
              {activity.xpInLevel.toLocaleString()} / {activity.xpMax.toLocaleString()} XP
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#1E2740]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan to-[#8B5CF6]"
              style={{ width: `${activity.xpPct}%` }}
            />
          </div>
        </div>
      </Card>

      {/* 별자리 = 이번 주 일기 (각 일기 = 별, 주마다 모양 변화) */}
      <Card>
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-base font-semibold">✦ 이번 주 별자리</div>
          {weeks.length > 1 && (
            <div className="flex items-center gap-2 text-[11px] text-sub">
              <button disabled={wIdx === 0} onClick={() => goWeek(-1)}
                className="tap px-1 text-mut disabled:opacity-30">◀</button>
              <span className="min-w-[44px] text-center font-bold text-cyan">{week?.label}</span>
              <button disabled={wIdx >= weeks.length - 1} onClick={() => goWeek(1)}
                className="tap px-1 text-mut disabled:opacity-30">▶</button>
            </div>
          )}
        </div>

        {!week ? (
          <p className="py-6 text-center text-[12px] text-mut">
            일기를 쓰면 그날의 별이 하나씩 떠요. 첫 별을 남겨보세요 ✦
          </p>
        ) : (
          <>
            <span className="inline-block rounded-lg border border-line px-2.5 py-1 text-[11px] text-sub">
              ✦ {shapeFor(week.weeksAgo).name} · 별 {week.n}개
            </span>

            <div className="mt-2">
              <Constellation
                slots={week.slots}
                weeksAgo={week.weeksAgo}
                selectedIdx={selIdx}
                onSelect={setSelIdx}
              />
              <div className="mt-1 flex items-center justify-center gap-1 text-[9px] text-mut">
                <span>힘듦</span>
                {[1, 2, 3, 4, 5].map((v) => (
                  <span key={v} className="inline-block h-2 w-2 rounded-full"
                    style={{ background: starColor(v) }} />
                ))}
                <span>좋음 · 별 색·크기 = 그날 기분</span>
              </div>
            </div>

            {/* 별 클릭 → 그날 일기 밑에 */}
            {sel ? (
              <div className="rounded-xl border border-cyan bg-[#12203a] px-3.5 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{moodEmoji(sel.v)}</span>
                  <span className="shrink-0 text-[11px] text-mut">{sel.date.slice(5)}</span>
                  <span className="flex-1 text-[12px] text-sub">{sel.text || "(한 줄 없음)"}</span>
                </div>
                {sel.answers &&
                  Object.entries(sel.answers).filter(([, v]) => (v || "").trim()).length > 0 && (
                    <div className="mt-2 flex flex-col gap-1 border-t border-line pt-2">
                      {Object.entries(sel.answers)
                        .filter(([, v]) => (v || "").trim())
                        .map(([qid, v]) => (
                          <div key={qid}>
                            <p className="text-[10px] leading-snug text-mut">{questionText(qid)}</p>
                            <p className="text-[11px] leading-snug text-sub">{v}</p>
                          </div>
                        ))}
                    </div>
                  )}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-line py-2.5 text-center text-[11px] text-mut">
                ✦ 별을 눌러 그날 일기를 봐요
              </p>
            )}

            <div className="mt-3 grid grid-cols-2 gap-2.5">
              <MiniStat label={`${week.label} 별`} value={`${week.n}개`} />
              <MiniStat label="기분 평균" value={`${moodEmoji(Math.round(week.avg))} ${week.avg}`} />
            </div>

            {/* 모든 주 = 그 주까지 '누적' 라이브 분석 → 확신도·성향이 쌓이며 변하는 걸 봄 */}
            <button
              onClick={() => {
                const next = !showReport;
                setShowReport(next);
                if (next && !live && !busy) runAnalyze();
              }}
              className="tap mt-3 w-full rounded-2xl border border-cyan bg-[#12203a] py-2.5 text-[12px] font-bold text-cyan"
            >
              {showReport ? "리포트 접기 ▴" : `🔮 ${week.label}까지 누적 분석 (내 모델) ▾`}
            </button>

            {showReport && (
              <div className="mt-2 rounded-xl border border-line bg-[#0E1424] px-3.5 py-3">
                {busy ? (
                  <p className="text-[12px] text-mut">분석 중… 내 모델이 {week.label}까지 읽고 있어요</p>
                ) : apiErr ? (
                  <p className="text-[11px] leading-relaxed text-[#F0736F]">
                    API 연결 실패 — 로컬 서버(python diary_module/qmode/api.py) 켜졌나요?{" "}
                    <button onClick={runAnalyze} className="tap underline">다시 시도</button>
                  </p>
                ) : live ? (
                  <>
                    <div className="flex items-baseline justify-between">
                      <div className="text-[12px] font-bold text-cyan">🔮 {week.label}까지 누적</div>
                      <div className="text-[10px] text-mut">
                        {live.disposition.n_answers}일 · 확신 {live.disposition.confidence?.level}
                      </div>
                    </div>
                    <p className="mt-1 text-[11px] text-sub">
                      대처 <b className="text-ink">{live.disposition.coping || "—"}</b> · 위험감수{" "}
                      <b className="text-ink">{live.disposition.risk_tolerance ?? "—"}</b>
                      {live.disposition.decision_style ? ` · 결정 ${live.disposition.decision_style}` : ""}
                    </p>
                    <div className="mt-2 whitespace-pre-line border-t border-line pt-2 text-[12px] leading-relaxed text-sub">
                      {live.report}
                    </div>
                  </>
                ) : (
                  <button onClick={runAnalyze} className="tap text-[12px] text-cyan">분석 시작하기 →</button>
                )}
              </div>
            )}
          </>
        )}
      </Card>

      {/* 행성 선택 */}
      <Card>
        <div className="mb-1 text-base font-semibold">🪐 행성 선택</div>
        <p className="mb-3 text-[11px] text-mut">행성은 당신의 삶의 영역을 나타냅니다</p>
        <div className="flex justify-between gap-2">
          {PLANETS.map((p) => {
            const on = p.key === planet;
            return (
              <button
                key={p.key}
                onClick={() => choosePlanet(p.key)}
                className="tap flex flex-1 flex-col items-center gap-1.5"
              >
                <span
                  className="relative h-11 w-11 rounded-full transition-transform"
                  style={{
                    background: `radial-gradient(circle at 35% 30%, ${p.to}, ${p.from})`,
                    boxShadow: on ? `0 0 0 2px ${p.to}, 0 0 12px ${p.from}` : "none",
                    transform: on ? "scale(1.06)" : "scale(1)",
                  }}
                >
                  {on && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-cyan text-[9px] text-[#04203a]">
                      ✓
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-3 rounded-xl border border-line bg-[#0E1424] px-3 py-2.5 text-[12px] text-sub">
          선택된 행성: <span className="font-bold text-ink">{selectedPlanet.label}</span> — 이 영역의
          갈림길을 시뮬레이션합니다.
        </p>
      </Card>

      {/* 내 평행우주 저장 */}
      <Card>
        <div className="mb-1 text-base font-semibold">💾 내 평행우주 저장</div>
        <p className="mb-3 text-[11px] text-mut">완성한 우주를 저장하고, 언제든 다시 탐험하세요</p>
        <div className="flex gap-2.5">
          {SAVED_UNIVERSES.map((s) => {
            const on = s.id === slot;
            return (
              <button
                key={s.id}
                onClick={() => setSlot(s.id)}
                className="tap relative flex-1 overflow-hidden rounded-xl p-3 text-left"
                style={{
                  background: `linear-gradient(135deg, ${s.from}, ${s.to})`,
                  outline: on ? "2px solid #7FD4FF" : "1px solid #28324D",
                }}
              >
                {s.current && (
                  <span className="absolute right-1.5 top-1.5 rounded-md bg-[#5B6CE0] px-1.5 py-0.5 text-[9px] font-bold text-white">
                    현재
                  </span>
                )}
                <div className="text-[13px] font-bold text-white">{s.label}</div>
                <div className="text-[10px] text-white/70">{s.sub}</div>
              </button>
            );
          })}
        </div>
        <button
          onClick={() => navigate("/input")}
          className="tap mt-3 w-full rounded-[26px] bg-gradient-to-r from-[#5B6CE0] to-cyan py-3.5 text-sm font-bold text-[#04203a]"
        >
          🪐 내 평행우주 저장하기
        </button>
      </Card>

      {/* 은하수 아카이브 통계 */}
      <Card>
        <div className="mb-3 flex items-center gap-1.5 text-base font-semibold">🌌 은하수 아카이브</div>
        <div className="grid grid-cols-3 gap-2.5">
          <MiniStat label="시뮬레이션" value={activity.stats.simulations} center />
          <MiniStat label="수집한 별" value={activity.stats.stars} center />
          <MiniStat label="탐험한 우주" value={activity.stats.universes} center />
        </div>
        <button
          onClick={() => navigate("/archive")}
          className="tap mt-3 w-full rounded-2xl border border-line bg-[#0E1424] py-3 text-[13px] text-sub"
        >
          기록 아카이브 보기 →
        </button>
      </Card>

      <p className="mb-2 mt-1 text-center text-[10px] leading-relaxed text-mut">
        레벨·별·XP는 앱 참여 지표이며, 실측 데이터 결과가 아닙니다.
      </p>
    </div>
  );
}

function MiniStat({ label, value, center = false }) {
  return (
    <div
      className={`rounded-xl border border-line bg-[#0E1424] px-2 py-3 ${
        center ? "text-center" : ""
      }`}
    >
      <div className="text-[10px] text-mut">{label}</div>
      <div className="mt-0.5 text-lg font-bold text-ink">{value}</div>
    </div>
  );
}

// 별 하나 = 그날 일기. 질문에 답한 날은 눌러서 답변까지 펼침.
function StarRow({ star }) {
  const [open, setOpen] = useState(false);
  const answers = star.answers
    ? Object.entries(star.answers).filter(([, v]) => (v || "").trim())
    : [];
  const hasAnswers = answers.length > 0;
  return (
    <div className="rounded-xl border border-line bg-[#0E1424] px-3 py-2">
      <button
        onClick={() => hasAnswers && setOpen((o) => !o)}
        className={`flex w-full items-center gap-2 text-left ${hasAnswers ? "tap" : "cursor-default"}`}
      >
        <span className="text-base">{moodEmoji(star.v)}</span>
        <span className="w-[36px] shrink-0 text-[10px] text-mut">{star.date.slice(5)}</span>
        <span className="flex-1 truncate text-[12px] text-sub">{star.text || "(한 줄 없음)"}</span>
        {hasAnswers && <span className="shrink-0 text-[10px] text-cyan">✍️{open ? "▴" : "▾"}</span>}
      </button>
      {open && hasAnswers && (
        <div className="mt-1.5 flex flex-col gap-1 border-t border-line pt-1.5">
          {answers.map(([qid, v]) => (
            <p key={qid} className="text-[11px] leading-snug text-sub">
              <b className="mr-1 text-cyan">{qid}</b>
              {v}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
