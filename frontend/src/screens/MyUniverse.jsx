import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";
import { Card } from "../components/ui.jsx";
import { MY_UNIVERSE, PLANETS, SAVED_UNIVERSES } from "../data/result.js";

// 나의 우주 = 개인화 대시보드. 레벨/XP · 별자리 · 행성 · 평행우주 저장 · 통계.
export default function MyUniverse() {
  const navigate = useNavigate();
  const u = MY_UNIVERSE;
  const [planet, setPlanet] = useState("career");
  const [slot, setSlot] = useState("A");

  const xpPct = Math.min(100, (u.xp / u.xpMax) * 100);
  const selectedPlanet = PLANETS.find((p) => p.key === planet);

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
              {u.title} · Lv. {u.level}
            </span>
            <span className="text-[11px] text-mut">{u.xp.toLocaleString()} XP</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#1E2740]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan to-[#8B5CF6]"
              style={{ width: `${xpPct}%` }}
            />
          </div>
        </div>
      </Card>

      {/* 별자리 만들기 */}
      <Card>
        <div className="mb-1 flex items-center gap-1.5 text-base font-semibold">✦ 별자리 만들기</div>
        <span className="inline-block rounded-lg border border-line px-2.5 py-1 text-[11px] text-sub">
          ✏️ 도전형 성장 별자리
        </span>
        <div className="mt-3 h-[110px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={u.constellation} margin={{ top: 12, right: 8, left: 8, bottom: 4 }}>
              <YAxis hide domain={[0, 6]} />
              <Line
                type="monotone"
                dataKey="v"
                stroke="#9FB0CE"
                strokeWidth={1.5}
                dot={{ r: 3.5, fill: "#EAF0FB", stroke: "#7FD4FF", strokeWidth: 1 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2.5">
          <MiniStat label="오늘 수집한 별" value={`${u.starsToday}개`} />
          <MiniStat label="누적 체크인" value={`${u.checkinDays}일`} />
        </div>
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
                onClick={() => setPlanet(p.key)}
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
                <span className={`text-[10px] ${on ? "text-ink" : "text-mut"}`}>{p.label}</span>
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
          <MiniStat label="시뮬레이션" value={u.stats.simulations} center />
          <MiniStat label="수집한 별" value={u.stats.stars} center />
          <MiniStat label="탐험한 우주" value={u.stats.universes} center />
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
