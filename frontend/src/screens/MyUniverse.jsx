import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Caption } from "../components/ui.jsx";
import Constellation from "../components/Constellation.jsx";
import { useResult } from "../data/ResultContext.jsx";
import { PLANETS, SAVED_UNIVERSES } from "../data/result.js";
import {
  universeSummary,
  constellationGroups,
  setPlanet as persistPlanet,
  seedDemoCheckins,
  resetUniverse,
  isDemo,
  todayKey,
  STARS_PER_CONSTELLATION,
} from "../data/myUniverse.js";
import {
  classifyConstellation,
  badgeLabel,
  HONESTY_NOTE,
} from "../data/constellationRules.js";

// 나의 우주 = 개인화 대시보드. 레벨/XP · 별자리 · 행성 · 평행우주 저장 · 통계.
// 수치는 전부 localStorage 의 실제 활동 기록(pm.myuniverse.v1)에서 파생된다.
export default function MyUniverse() {
  const navigate = useNavigate();
  const { profile } = useResult();

  const [tick, setTick] = useState(0); // 저장 후 다시 읽기용
  const refresh = () => setTick((t) => t + 1);

  const u = useMemo(() => universeSummary(), [tick]);
  const [slot, setSlot] = useState("A");
  const [picked, setPicked] = useState(null); // 탭한 별
  const [weekBack, setWeekBack] = useState(0); // 0 = 이번 주, 1 = 지난주 …

  const planet = u.state.planet;
  const selectedPlanet = PLANETS.find((p) => p.key === planet) || PLANETS[0];

  const groups = useMemo(() => constellationGroups(u.state), [u.state]);
  const idx = Math.max(0, groups.length - 1 - weekBack);
  const group = groups[idx] || null;

  const constellation = useMemo(
    () => (group ? classifyConstellation(group, profile?.value_ranking) : null),
    [group, profile?.value_ranking],
  );

  function choosePlanet(key) {
    persistPlanet(key);
    refresh();
  }

  return (
    <div>
      <h1 className="mb-1 mt-2 text-[24px] font-bold leading-[1.2]">나의 우주</h1>
      <p className="mb-3 text-[13px] text-sub">
        하루에 별 하나. {STARS_PER_CONSTELLATION}개가 모이면 별자리가 됩니다.
      </p>

      {/* 예시 기록이 들어있는 동안은 항상 밝힌다 — 남의 기록을 내 기록처럼 보여주지 않는다. */}
      {isDemo(u.state) && (
        <div className="flex items-center justify-between rounded-xl border border-gold/40 bg-[#241d10] px-3 py-2">
          <span className="text-[11px] text-gold">
            예시 데이터로 둘러보는 중 — 내 기록이 아닙니다
          </span>
          <button
            onClick={() => {
              resetUniverse();
              setWeekBack(0);
              setPicked(null);
              refresh();
            }}
            className="tap shrink-0 rounded-lg border border-line px-2 py-1 text-[10px] text-sub"
          >
            비우기
          </button>
        </div>
      )}

      {/* 레벨 / XP */}
      <Card className="flex items-center gap-3">
        <div className="h-11 w-11 shrink-0 rounded-full bg-gradient-to-br from-cyan to-[#8B5CF6]" />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-bold">
              {u.title} · Lv. {u.level}
            </span>
            <span className="text-[11px] text-mut">
              {u.xpInLevel.toLocaleString()} / {u.xpMax.toLocaleString()} XP
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#1E2740]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan to-[#8B5CF6] transition-all"
              style={{ width: `${u.xpPct}%` }}
            />
          </div>
        </div>
      </Card>

      {/* 별자리 만들기 */}
      <Card>
        <div className="mb-1 flex items-center gap-1.5 text-base font-semibold">✦ 별자리 만들기</div>

        {u.stars === 0 ? (
          <EmptyConstellation
            onSeed={() => {
              seedDemoCheckins();
              setWeekBack(0);
              refresh();
            }}
          />
        ) : (
          <>
            <div className="flex items-center justify-between gap-2">
              <span className="inline-block rounded-lg border border-line px-2.5 py-1 text-[11px] text-sub">
                {badgeLabel(constellation)}
              </span>
              {groups.length > 1 && (
                <div className="flex items-center gap-1 text-[11px] text-mut">
                  <PagerBtn
                    disabled={idx <= 0}
                    onClick={() => {
                      setWeekBack((w) => w + 1);
                      setPicked(null);
                    }}
                  >
                    ‹
                  </PagerBtn>
                  <span className="min-w-[52px] text-center">
                    {weekBack === 0 ? "이번 주" : `${weekBack}주 전`}
                  </span>
                  <PagerBtn
                    disabled={weekBack <= 0}
                    onClick={() => {
                      setWeekBack((w) => Math.max(0, w - 1));
                      setPicked(null);
                    }}
                  >
                    ›
                  </PagerBtn>
                </div>
              )}
            </div>

            <div className="mt-3">
              <Constellation
                stars={group.stars}
                todayDate={todayKey()}
                selectedDate={picked?.date}
                onSelect={(s) =>
                  s.future ? null : setPicked((p) => (p?.date === s.date ? null : s))
                }
              />
            </div>

            <p className="mt-1 text-[12px] leading-relaxed text-sub">{constellation.caption}</p>

            {picked && <StarDetail star={picked} />}

            <div className="mt-3 grid grid-cols-2 gap-2.5">
              <MiniStat
                label={weekBack === 0 ? "이번 주 별" : "그 주의 별"}
                value={`${group.filled} / ${STARS_PER_CONSTELLATION}개`}
              />
              <MiniStat label="연속 기록" value={`${u.streak}일`} />
            </div>

            {weekBack === 0 && !u.checkedInToday && (
              <button
                onClick={() => navigate("/home")}
                className="tap mt-2.5 w-full rounded-2xl border border-cyan bg-[#12203a] py-2.5 text-[13px] font-semibold text-cyan"
              >
                오늘 별이 아직 비어 있어요 — 기록하러 가기
              </button>
            )}

            {u.completed > 0 && (
              <Caption>완성한 별자리 {u.completed}개는 은하수 아카이브에 모여 있어요.</Caption>
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

      {/* 내 평행우주 저장 — TODO(T8): 보관함(savedUniverses)의 id 를 슬롯에 핀 고정.
          myUniverse.js 의 pinSlot/unpinSlot 이 이미 준비되어 있고, 역할 분리(D5)를
          수인님과 합의한 뒤 연결한다. 지금은 시안 그대로의 정적 UI. */}
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
          onClick={() => navigate("/archive")}
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
        <br />
        {HONESTY_NOTE}
      </p>
    </div>
  );
}

function PagerBtn({ children, disabled, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`tap h-6 w-6 rounded-lg border border-line ${
        disabled ? "opacity-25" : "text-sub"
      }`}
    >
      {children}
    </button>
  );
}

function EmptyConstellation({ onSeed }) {
  return (
    <div className="mt-2 rounded-xl border border-dashed border-line bg-[#0E1424] px-3 py-6 text-center">
      <div className="text-[22px] leading-none opacity-40">✦</div>
      <p className="mt-2 text-[13px] text-sub">아직 별이 하나도 없어요</p>
      <Caption className="mx-auto max-w-[260px] text-center">
        홈에서 오늘 하루를 기록하면 첫 별이 떠요. {STARS_PER_CONSTELLATION}일이 모이면 첫 별자리에
        이름이 붙습니다.
      </Caption>
      {onSeed && (
        <>
          <button
            onClick={onSeed}
            className="tap mt-3 rounded-xl border border-line px-3 py-1.5 text-[11px] text-sub"
          >
            ✦ 예시 기록으로 둘러보기
          </button>
          <Caption className="text-center">
            3주치 예시가 채워집니다. 내 기록과 섞이지 않고, 언제든 비울 수 있어요.
          </Caption>
        </>
      )}
    </div>
  );
}

function StarDetail({ star }) {
  const label =
    star.valence == null
      ? "기록이 없는 날이에요"
      : `기분 ${star.mood ?? "—"} · valence ${star.valence}`;
  return (
    <div className="mt-2 rounded-xl border border-line bg-[#0E1424] px-3 py-2.5">
      <div className="text-[11px] text-mut">{star.date}</div>
      <div className="mt-0.5 text-[12px] text-sub">{label}</div>
      {star.note ? <p className="mt-1 text-[12px] text-ink">“{star.note}”</p> : null}
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
