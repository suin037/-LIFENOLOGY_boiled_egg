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

const VALUE_CHIPS = ["성장 가능성", "안정성", "삶의 질", "소득", "자기실현"];

export default function Onboarding() {
  const navigate = useNavigate();
  const { profile, setProfile, setOnboarded } = useResult();

  const agePct = ((profile.age - 25) / 5) * 100;

  function finish() {
    setOnboarded(true); // 이후 홈 탭은 '나의 우주' 허브로 진입
    navigate("/home");
  }

  function toggleValue(v) {
    setProfile((p) => {
      const has = p.values.includes(v);
      return { ...p, values: has ? p.values.filter((x) => x !== v) : [...p.values, v] };
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

      {/* 가치관 칩 */}
      <label className="mb-2 mt-4 block text-xs text-sub">
        가장 중요하게 생각하는 가치 (복수 선택)
      </label>
      <div className="mt-1 flex flex-wrap gap-2">
        {VALUE_CHIPS.map((v) => {
          const on = profile.values.includes(v);
          return (
            <button
              key={v}
              onClick={() => toggleValue(v)}
              className={`tap rounded-[20px] border px-3.5 py-2 text-[13px] transition-colors ${
                on ? "border-cyan bg-[#12203a] text-cyan" : "border-line bg-[#0E1424] text-sub"
              }`}
            >
              {v}
            </button>
          );
        })}
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
