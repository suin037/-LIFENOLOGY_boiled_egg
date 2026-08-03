import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useResult } from "../data/ResultContext.jsx";
import { Eyebrow, Button } from "../components/ui.jsx";
import AvatarBuilder from "../components/AvatarBuilder.jsx";

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
  { id: "money", label: "경제적 여유" },
  { id: "status", label: "인정·지위" },
  { id: "family", label: "가족·사랑" },
  { id: "friends", label: "친구·소속" },
  { id: "growth", label: "배움·성취" },
  { id: "freedom", label: "자유·자율" },
  { id: "meaning", label: "의미·나다움" },
  { id: "stability", label: "건강·안정" },
];
const VALUE_IDS = Object.fromEntries(VALUE_CARDS.map((card) => [card.label, card.id]));

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

  const [visibleThrough, setVisibleThrough] = useState(0);
  const agePct = ((profile.age - 18) / 52) * 100;
  const ranked = profile.values; // 라벨 배열, 앞이 1순위
  const steps = ["이름", "나이", "직종", "소득", "가치", "성격유형", "아바타"];

  function finish() {
    setOnboarded(true); // 이후 홈 탭은 '나의 우주' 허브로 진입
    navigate("/home");
  }

  function reveal(index) {
    setVisibleThrough((current) => Math.max(current, index));
  }

  function revealOnEnter(event, index) {
    // 한글 조합 중 Enter는 글자 확정에 사용되므로 다음 항목을 열지 않는다.
    if (event.key !== "Enter" || event.nativeEvent?.isComposing) return;
    event.preventDefault();
    reveal(index);
  }

  // 탭한 순서 = 우선순위. 다시 누르면 해제(뒤 순위 자동 당겨짐). 부분순위 허용.
  function toggleRank(label) {
    setProfile((p) => {
      const has = p.values.includes(label);
      const values = has ? p.values.filter((x) => x !== label) : [...p.values, label];
      return {
        ...p,
        values,
        // 기존 /simulate 개인화 입력도 같은 순서로 함께 갱신한다.
        value_ranking: values.map((value) => VALUE_IDS[value]).filter(Boolean),
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

  const stepContent = [
    <div key="name">
      <label className="mb-2 block text-xs text-sub">이름</label>
      <input type="text" value={profile.name || ""} maxLength={20} autoFocus
        aria-label="이름" placeholder="이름 또는 닉네임"
        onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
        onKeyDown={(e) => profile.name?.trim() && revealOnEnter(e, 1)}
        className="w-full rounded-xl border border-line bg-[#0E1424] px-3.5 py-3 text-sm text-ink outline-none placeholder:text-mut focus:border-cyan" />
    </div>,
    <div key="age">
      <label className="mb-2 block text-xs text-sub">나이<span className="float-right font-bold text-cyan">{profile.age}세</span></label>
      <input type="range" min="18" max="70" value={profile.age}
        onChange={(e) => {
          setProfile((p) => ({ ...p, age: Number(e.target.value) }));
          reveal(2);
        }}
        className="h-1 w-full cursor-pointer appearance-none rounded-full outline-none
          [&::-webkit-slider-thumb]:h-[18px] [&::-webkit-slider-thumb]:w-[18px]
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(127,212,255,.6)]"
        style={{ background: `linear-gradient(90deg, #7FD4FF, #4A90E2 ${agePct}%, #1E2740 ${agePct}%)` }} />
      <div className="mt-3 flex justify-between text-[11px] text-mut"><span>18세</span><span>70세</span></div>
    </div>,
    <div key="occupation">
      <label className="mb-2 block text-xs text-sub">직종</label>
      <select value={OCCUPATIONS.includes(profile.occupation) ? profile.occupation : ""}
        onChange={(e) => {
          setProfile((p) => ({ ...p, occupation: e.target.value }));
          reveal(3);
        }}
        className={`w-full rounded-xl border border-line bg-[#0E1424] px-3.5 py-3 text-sm outline-none focus:border-cyan ${
          OCCUPATIONS.includes(profile.occupation) ? "text-ink" : "text-mut"
        }`}>
        <option value="" disabled hidden>직종을 골라주세요</option>
        {OCCUPATIONS.map((o) => <option key={o} className="text-ink">{o}</option>)}
      </select>
    </div>,
    <div key="income">
      <label className="mb-2 block text-xs text-sub">현재 월소득</label>
      <div className="flex items-center gap-2">
        <input type="number" min="0" value={profile.income}
          onChange={(e) => {
            setProfile((p) => ({ ...p, income: Number(e.target.value) }));
            if (e.target.value !== "") reveal(4);
          }}
          className="w-full rounded-xl border border-line bg-[#0E1424] px-3.5 py-3 text-sm text-ink outline-none focus:border-cyan" />
        <span className="whitespace-nowrap text-[11px] text-mut">만원 / 월</span>
      </div>
    </div>,
    <div key="values">
      <div className="flex items-center justify-between gap-3">
        <label className="text-xs text-sub">지금 내 삶에서 중요한 <b className="text-cyan">순서대로</b> 골라주세요</label>
        <span className="shrink-0 text-[11px] text-mut">{ranked.length}개 선택</span>
      </div>
      <div className="mt-2 flex flex-col gap-1.5">
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
              </span>
            </button>
          );
        })}
      </div>
      {ranked.length > 0 && (
        <button type="button" onClick={() => reveal(5)}
          className="tap mt-2.5 w-full rounded-xl border border-cyan/60 bg-[#12203a] py-2.5 text-[12px] font-semibold text-cyan">
          선택 완료
        </button>
      )}
    </div>,
    <div key="mbti">
      <label className="mb-1 block text-xs text-sub">성격유형 (MBTI) <span className="text-[10px] text-mut">· 선택</span></label>
      <p className="mb-2 text-[10px] text-mut">모르거나 원하지 않으면 선택하지 않아도 돼요.</p>
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
      <button type="button" onClick={() => reveal(6)}
        className="tap mt-2.5 w-full rounded-xl border border-cyan/60 bg-[#12203a] py-2.5 text-[12px] font-semibold text-cyan">
        다음
      </button>
    </div>,
    <div key="avatar">
      <label className="mb-2 block text-xs text-sub">내 아바타 만들기 <span className="text-[10px] text-mut">· 나중에 설정에서 언제든 바꿀 수 있어요</span></label>
      <AvatarBuilder
        config={profile.avatarConfig}
        onChange={(cfg) => setProfile((p) => ({ ...p, avatarConfig: cfg }))}
      />
    </div>
  ];

  return (
    <div>
      <Eyebrow>나를 알려주세요 · {Math.min(visibleThrough + 1, steps.length)}/{steps.length}</Eyebrow>
      <div className="mb-8 flex gap-1.5">
        {steps.map((label, index) => (
          <b key={label} className={`h-1 flex-1 rounded-full ${index <= visibleThrough ? "bg-cyan" : "bg-[#1E2740]"}`} />
        ))}
      </div>

      <div className="space-y-5">
        {stepContent.slice(0, visibleThrough + 1).map((content, index) => (
          <section key={steps[index]} className="animate-fade">
            {content}
          </section>
        ))}
      </div>

      {visibleThrough >= steps.length - 1 && (
        <Button className="mb-2 mt-8" onClick={finish}>저장하고 시작하기</Button>
      )}
    </div>
  );
}
