import { useNavigate } from "react-router-dom";
import { useResult } from "../data/ResultContext.jsx";
import { Eyebrow, Button, Caption } from "../components/ui.jsx";

const OCCUPATIONS = [
  "연구·공학기술",
  "경영·사무·금융·보험",
  "교육·법률·복지·공공",
  "보건·의료",
  "예술·디자인·방송",
  "영업·판매·서비스",
  "설치·정비·생산",
  "건설·농림·기타",
];

// 성향 = 가치 강제순위(8카드 → 5축). diary_module/qmode/value_ranking.py 와 1:1.
// 다중선택이 아니라 '순서'를 받는다 — "다 중요해요" 편향을 막고 진짜 우선순위를 드러냄.
const VALUE_CARDS = [
  { id: "money", label: "경제적 여유", desc: "돈 걱정 없이 사는 것" },
  { id: "status", label: "인정·지위", desc: "일에서 인정받고 자리를 갖는 것" },
  { id: "family", label: "가족·사랑", desc: "가까운 사람과의 깊은 유대" },
  { id: "friends", label: "친구·소속", desc: "사람들과 어울리고 소속되는 것" },
  { id: "growth", label: "배움·성취", desc: "실력이 늘고 목표를 이루는 것" },
  { id: "freedom", label: "자유·자율", desc: "내 방식대로 결정하며 사는 것" },
  { id: "meaning", label: "의미·나다움", desc: "의미 있고 나다운 삶" },
  { id: "stability", label: "건강·안정", desc: "몸과 삶이 안정적인 것" },
];

// MBTI = 스타일 초기 prior(선택). qmode mbti.py 와 매칭. 확정 아님 — 일기가 갱신.
const MBTI_AXES = [
  { i: 0, a: ["E", "외향"], b: ["I", "내향"] },
  { i: 1, a: ["S", "감각"], b: ["N", "직관"] },
  { i: 2, a: ["T", "사고"], b: ["F", "감정"] },
  { i: 3, a: ["J", "계획"], b: ["P", "즉흥"] },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { profile, setProfile, setOnboarded } = useResult();

  const agePct = ((profile.age - 25) / 5) * 100;
  const ranked = profile.values; // 라벨 배열, 앞이 1순위

  function finish() {
    setOnboarded(true); // 이후 홈 탭은 '나의 우주' 허브로 진입
    navigate("/home");
  }

  // 탭한 순서 = 우선순위. 다시 누르면 해제(뒤 순위 자동 당겨짐). 부분순위 허용.
  function toggleRank(label) {
    setProfile((p) => {
      const has = p.values.includes(label);
      return {
        ...p,
        values: has ? p.values.filter((x) => x !== label) : [...p.values, label],
      };
    });
  }

  // MBTI 4축 각각 한 글자 선택(같은 거 다시 누르면 해제). 4글자 다 차야 유효.
  const mbtiCur = (profile.mbti || "").padEnd(4, "·");
  function pickMbti(i, letter) {
    setProfile((p) => {
      const cur = (p.mbti || "").padEnd(4, "·").split("");
      cur[i] = cur[i] === letter ? "·" : letter;
      const s = cur.join("");
      return { ...p, mbti: s === "····" ? "" : s };
    });
  }

  return (
    <div>
      <Eyebrow>ONBOARDING · 나를 알려주세요</Eyebrow>
      <div className="my-2.5 flex gap-1.5">
        <b className="h-[3px] flex-1 rounded bg-cyan" />
        <b className="h-[3px] flex-1 rounded bg-[#1E2740]" />
      </div>
      <h1 className="text-[22px] font-bold leading-[1.25]">
        비슷한 사람을 찾으려면
        <br />
        당신이 누군지 알아야 해요
      </h1>
      <Caption>
        이 정보로 데이터에서 ‘나와 비슷한 200명’을 찾습니다. 처음 한 번만 입력해요.
      </Caption>

      {/* 나이 슬라이더 */}
      <label className="mb-2 mt-4 block text-xs text-sub">
        나이
        <span className="float-right font-bold text-cyan">{profile.age}세</span>
      </label>
      <input
        type="range"
        min="25"
        max="30"
        value={profile.age}
        onChange={(e) => setProfile((p) => ({ ...p, age: Number(e.target.value) }))}
        className="h-1 w-full cursor-pointer appearance-none rounded-full outline-none
          [&::-webkit-slider-thumb]:h-[18px] [&::-webkit-slider-thumb]:w-[18px]
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(127,212,255,.6)]"
        style={{
          background: `linear-gradient(90deg, #7FD4FF, #4A90E2 ${agePct}%, #1E2740 ${agePct}%)`,
        }}
      />

      {/* 직종 */}
      <label className="mb-2 mt-4 block text-xs text-sub">직종</label>
      <select
        value={profile.occupation}
        onChange={(e) => setProfile((p) => ({ ...p, occupation: e.target.value }))}
        className="tap w-full rounded-xl border border-line bg-[#0E1424] px-3.5 py-3 text-sm text-ink outline-none focus:border-cyan"
      >
        {OCCUPATIONS.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>

      {/* 월소득 */}
      <label className="mb-2 mt-4 block text-xs text-sub">현재 월소득</label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={profile.income}
          onChange={(e) => setProfile((p) => ({ ...p, income: Number(e.target.value) }))}
          className="tap w-full rounded-xl border border-line bg-[#0E1424] px-3.5 py-3 text-sm text-ink outline-none focus:border-cyan"
        />
        <span className="whitespace-nowrap text-[11px] text-mut">만원 / 월</span>
      </div>

      {/* 가치 강제순위 (다중선택 아님 — 중요한 순서대로) */}
      <label className="mb-1 mt-4 block text-xs text-sub">
        지금 내 삶에서 중요한 <b className="text-cyan">순서대로</b> 골라주세요
        <span className="float-right text-[10px] text-mut">
          {ranked.length}/8 · 다 안 해도 돼요
        </span>
      </label>
      <p className="mb-2 text-[10px] leading-relaxed text-mut">
        정답은 없어요. 둘 중 뭐가 더 중요한지 고르다 보면 우선순위가 드러나요.
        이 순위가 시나리오에서 ‘어떤 결과부터’ 보여줄지 정합니다.
      </p>
      <div className="flex flex-col gap-1.5">
        {VALUE_CARDS.map((c) => {
          const rank = ranked.indexOf(c.label); // -1 = 미선택
          const on = rank >= 0;
          return (
            <button
              key={c.id}
              onClick={() => toggleRank(c.label)}
              className={`tap flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-colors ${
                on ? "border-cyan bg-[#12203a]" : "border-line bg-[#0E1424]"
              }`}
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-colors ${
                  on ? "bg-cyan text-[#04203a]" : "bg-[#1E2740] text-mut"
                }`}
              >
                {on ? rank + 1 : "+"}
              </span>
              <span className="flex-1">
                <span className={`text-[13px] font-semibold ${on ? "text-cyan" : "text-ink"}`}>
                  {c.label}
                </span>
                <span className="block text-[10px] text-mut">{c.desc}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* MBTI (선택) — 스타일 초기 힌트. 일기가 쌓이면 갱신 */}
      <label className="mb-1 mt-4 block text-xs text-sub">
        성격유형 (MBTI) <span className="text-[10px] text-mut">· 선택 · 알면 골라주세요</span>
      </label>
      <p className="mb-2 text-[10px] leading-relaxed text-mut">
        결정·태도의 <b className="text-cyan">초기 힌트</b>로만 써요. 확정 아니고, 일기가 쌓이면 갱신돼요.
      </p>
      <div className="flex flex-col gap-1.5">
        {MBTI_AXES.map((ax) => (
          <div key={ax.i} className="flex gap-1.5">
            {[ax.a, ax.b].map(([letter, ko]) => {
              const on = mbtiCur[ax.i] === letter;
              return (
                <button
                  key={letter}
                  onClick={() => pickMbti(ax.i, letter)}
                  className={`tap flex-1 rounded-xl border py-2 text-[12px] transition-colors ${
                    on ? "border-cyan bg-[#12203a] text-cyan" : "border-line bg-[#0E1424] text-sub"
                  }`}
                >
                  <b className="mr-1">{letter}</b>
                  {ko}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <Button className="mt-5" onClick={finish}>
        저장하고 시작하기
      </Button>
      <p className="mt-3.5 text-center text-[10px] leading-relaxed text-mut">
        입력할수록 더 비슷한 사람을 찾아 정교해집니다.
      </p>
    </div>
  );
}
