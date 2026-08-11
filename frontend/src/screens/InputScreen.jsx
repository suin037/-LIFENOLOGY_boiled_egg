import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useResult } from "../data/ResultContext.jsx";
import { LIFE_DOMAINS, classifyChoice, detectLifeDomains, domainLabel, labelOf } from "../data/choices.js";
import { detectEmotions } from "../data/DiaryContext.jsx";
import { Caption } from "../components/ui.jsx";
import Mascot from "../components/Mascot.jsx";
import { BriefcaseBusiness, GraduationCap, Sprout, Wallet, HeartPulse, House, Users, Leaf, Compass, ArrowRight } from "lucide-react";

const MAJOR_FIELDS = ["공학", "자연", "사회", "인문", "교육", "예체능", "의약"];
const DOMAIN_ICONS = {
  career: BriefcaseBusiness, education: GraduationCap, business: Sprout,
  finance: Wallet, health: HeartPulse, housing: House,
  relationship: Users, lifestyle: Leaf, long_term_values: Compass,
};
const SUGGESTIONS = {
  a: ["더 큰 회사로 이직하기", "대학원에 진학하기", "창업 준비 시작하기"],
  b: ["현재 회사에 남기", "다른 직무를 준비하기", "잠시 쉬어가기"],
};
const OCCUPATION_GROUPS = [
  [1, "관리자"], [2, "전문가·관련 종사자"], [3, "사무 종사자"],
  [4, "서비스 종사자"], [5, "판매 종사자"], [6, "농림어업 숙련 종사자"],
  [7, "기능원·관련 기능 종사자"], [8, "장치·기계 조작·조립 종사자"], [9, "단순노무 종사자"],
];
const EMPLOYMENT_STATUSES = [
  [1, "상용직"], [2, "임시직"], [3, "일용직"], [4, "고용주·자영업자"], [5, "무급가족 종사자"],
];
const FIRM_SIZES = [
  [1, "1~4명"], [2, "5~9명"], [3, "10~29명"], [4, "30~49명"],
  [5, "50~69명"], [6, "70~99명"], [7, "100~299명"], [8, "300~499명"],
  [9, "500~999명"], [10, "1,000명 이상"], [11, "잘 모르겠음·기타"],
];

export default function InputScreen() {
  const navigate = useNavigate();
  const {
    profile, setProfile, choices, setChoices,
    scenarioTexts, setScenarioTexts, scenarioDomains, setScenarioDomains,
    diary, setDiary,
  } = useResult();
  const textA = scenarioTexts.a;
  const textB = scenarioTexts.b;
  const [domainAuto, setDomainAuto] = useState({ a: true, b: true });
  const [focused, setFocused] = useState(textA && !textB ? "b" : "a");

  function onText(side, value) {
    const field = side.toLowerCase();
    setScenarioTexts((prev) => ({ ...prev, [field]: value }));
    setChoices((prev) => ({ ...prev, [field]: classifyChoice(value) || "기타" }));
    if (domainAuto[field]) {
      setScenarioDomains((prev) => ({ ...prev, [field]: detectLifeDomains(value) }));
    }
  }

  function toggleDomain(side, key) {
    const field = side.toLowerCase();
    setDomainAuto((prev) => ({ ...prev, [field]: false }));
    setScenarioDomains((prev) => {
      const current = prev[field] || [];
      const next = current.includes(key) ? current.filter((item) => item !== key) : [...current, key];
      return { ...prev, [field]: next };
    });
  }

  function resetDomainDetection(side) {
    const field = side.toLowerCase();
    const text = field === "a" ? textA : textB;
    setDomainAuto((prev) => ({ ...prev, [field]: true }));
    setScenarioDomains((prev) => ({ ...prev, [field]: detectLifeDomains(text) }));
  }

  function chooseSuggestion(side, value) {
    onText(side.toUpperCase(), value);
    if (side === "a") setFocused("b");
  }

  const normalizedA = textA.trim().replace(/\s+/g, " ");
  const normalizedB = textB.trim().replace(/\s+/g, " ");
  const sameCategory = Boolean(normalizedA && normalizedB && choices.a === choices.b);
  const duplicate = sameCategory && normalizedA === normalizedB;
  const missingDomains = Boolean(normalizedA && normalizedB && (!scenarioDomains.a.length || !scenarioDomains.b.length));
  const needJobDetails = choices.a === "이직" || choices.b === "이직";
  const jobDetailsMissing = needJobDetails && (
    profile.occupation_group == null || profile.employment_status == null
    || profile.tenure_years == null || profile.firm_size == null
  );
  const blocked = !normalizedA || !normalizedB || duplicate || missingDomains || jobDetailsMissing;
  const needMajor = choices.a === "진학" || choices.b === "진학";
  const emotions = detectEmotions(`${diary} ${textA} ${textB}`);
  const completed = Number(Boolean(normalizedA)) + Number(Boolean(normalizedB));

  function panelGrow(side) {
    if (normalizedA && normalizedB) return 1;
    if (focused === side) return 1.35;
    return 0.78;
  }

  return (
    <div className="-mx-5 -mt-1 min-h-full bg-[linear-gradient(180deg,#111D39_0%,#0B1325_46%,#171511_100%)] px-5 pb-7 pt-3 lg:mx-auto lg:rounded-[28px] lg:px-8 lg:py-7">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[12px] font-semibold text-[#76A7FF]">시뮬레이션</div>
          <h1 className="mt-0.5 text-[22px] font-bold tracking-[-.035em]">두 미래를 나란히 놓아볼까요?</h1>
        </div>
        <span className="rounded-full border border-[#4169B5] bg-[#182B52] px-3 py-1 text-[11px] font-bold text-[#8DB4FF]">
          {completed} / 2
        </span>
      </div>

      <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-gradient-to-r from-[#4C7FFF] to-[#86B3FF] transition-all duration-300" style={{ width: `${completed * 50}%` }} />
      </div>

      <div className="mt-4 flex items-center gap-3 rounded-[18px] border border-white/10 bg-white/[.055] px-3.5 py-3 backdrop-blur">
        <Mascot which="cosmo" size={42} />
        <div>
          <div className="text-[11px] font-bold text-[#89B6FF]">코스모 · 고민과 선택</div>
          <p className="mt-0.5 text-[12px] text-sub">
            {!normalizedA ? "먼저 마음에 떠오르는 첫 번째 길을 적어보세요." : !normalizedB ? "좋아요. 반대편에 놓을 두 번째 길은 무엇인가요?" : "두 갈림길이 준비됐어요. 같은 기준으로 비교해볼게요."}
          </p>
        </div>
      </div>

      <div className="relative mt-4 flex min-h-[570px] flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[#08111F]/70 shadow-[0_26px_70px_rgba(0,0,0,.35)] lg:min-h-[450px] lg:flex-row">
        <ChoicePanel
          side="A" text={textA} domains={scenarioDomains.a} domainAuto={domainAuto.a}
          active={focused === "a"} grow={panelGrow("a")} suggestions={SUGGESTIONS.a}
          onFocus={() => setFocused("a")} onText={(value) => onText("A", value)}
          onSuggestion={(value) => chooseSuggestion("a", value)}
          onDomain={(key) => toggleDomain("A", key)} onRedetect={() => resetDomainDetection("A")}
        />

        <div className="pointer-events-none absolute left-0 right-0 top-1/2 z-20 flex -translate-y-1/2 items-center gap-3 lg:bottom-0 lg:left-1/2 lg:right-auto lg:top-0 lg:-translate-x-1/2 lg:translate-y-0 lg:flex-col">
          <span className="h-px flex-1 bg-gradient-to-r from-transparent to-white/20 lg:h-auto lg:w-px lg:bg-gradient-to-b" />
          <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-[#07101E] text-[13px] font-black text-white shadow-[0_0_30px_rgba(75,126,255,.22)]">VS</span>
          <span className="h-px flex-1 bg-gradient-to-l from-transparent to-white/20 lg:h-auto lg:w-px lg:bg-gradient-to-t" />
        </div>

        <ChoicePanel
          side="B" text={textB} domains={scenarioDomains.b} domainAuto={domainAuto.b}
          active={focused === "b"} grow={panelGrow("b")} suggestions={SUGGESTIONS.b}
          onFocus={() => setFocused("b")} onText={(value) => onText("B", value)}
          onSuggestion={(value) => chooseSuggestion("b", value)}
          onDomain={(key) => toggleDomain("B", key)} onRedetect={() => resetDomainDetection("B")}
        />
      </div>

      {duplicate && <Caption className="text-danger">두 미래가 같아요. 회사·조건·상황 중 하나를 다르게 적어주세요.</Caption>}
      {sameCategory && !duplicate && <Caption className="text-cyan">같은 유형이어도 구체적인 조건이 다르면 비교할 수 있어요.</Caption>}
      {missingDomains && <Caption className="text-danger">각 미래에 해당하는 삶의 영역을 하나 이상 선택해주세요.</Caption>}

      {needJobDetails && (
        <section className="mt-4 rounded-[22px] border border-cyan/30 bg-[#0B1729]/90 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[13px] font-bold text-ink">이직 예측을 위한 현재 일자리 정보</div>
              <p className="mt-1 text-[11px] leading-relaxed text-mut">유사 조건 비교에 사용하며, 선택 결과를 확정하는 정보는 아니에요.</p>
            </div>
            <span className="shrink-0 rounded-full bg-cyan/15 px-2 py-1 text-[9px] font-bold text-cyan">필수</span>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <JobField label="현재 직종 대분류">
              <select value={profile.occupation_group ?? ""} onChange={(event) => setProfile((prev) => ({ ...prev, occupation_group: event.target.value === "" ? null : Number(event.target.value) }))} className="tap w-full rounded-xl border border-line bg-[#0E1424] px-3 py-2.5 text-[12px] text-ink outline-none focus:border-cyan">
                <option value="">선택해주세요</option>
                {OCCUPATION_GROUPS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </JobField>

            <JobField label="고용 형태">
              <select value={profile.employment_status ?? ""} onChange={(event) => setProfile((prev) => ({ ...prev, employment_status: event.target.value === "" ? null : Number(event.target.value) }))} className="tap w-full rounded-xl border border-line bg-[#0E1424] px-3 py-2.5 text-[12px] text-ink outline-none focus:border-cyan">
                <option value="">선택해주세요</option>
                {EMPLOYMENT_STATUSES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </JobField>

            <JobField label="현 일자리 근속기간">
              <div className="flex items-center gap-2">
                <input type="number" min="0" max="50" step="0.5" value={profile.tenure_years ?? ""} placeholder="예: 2.5" onChange={(event) => setProfile((prev) => ({ ...prev, tenure_years: event.target.value === "" ? null : Number(event.target.value) }))} className="w-full rounded-xl border border-line bg-[#0E1424] px-3 py-2.5 text-[12px] text-ink outline-none placeholder:text-mut focus:border-cyan" />
                <span className="shrink-0 text-[11px] text-mut">년</span>
              </div>
            </JobField>

            <JobField label="현재 직장 전체 인원">
              <select value={profile.firm_size ?? ""} onChange={(event) => setProfile((prev) => ({ ...prev, firm_size: event.target.value === "" ? null : Number(event.target.value) }))} className="tap w-full rounded-xl border border-line bg-[#0E1424] px-3 py-2.5 text-[12px] text-ink outline-none focus:border-cyan">
                <option value="">선택해주세요</option>
                {FIRM_SIZES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </JobField>
          </div>
          {jobDetailsMissing && <p className="mt-3 text-[10px] text-[#FFB36B]">네 항목을 모두 입력하면 비교를 시작할 수 있어요.</p>}
        </section>
      )}

      {needMajor && (
        <div className="mt-4 rounded-2xl border border-white/10 bg-[#0B1423]/80 p-3.5">
          <label className="mb-2 block text-[11px] font-semibold text-sub">전공 계열</label>
          <select value={profile.major} onChange={(event) => setProfile((prev) => ({ ...prev, major: event.target.value }))} className="tap w-full rounded-xl border border-line bg-[#0E1424] px-3.5 py-3 text-sm text-ink outline-none focus:border-cyan">
            {MAJOR_FIELDS.map((major) => <option key={major}>{major}</option>)}
          </select>
        </div>
      )}

      <details className="mt-3 rounded-2xl border border-white/10 bg-[#0B1423]/80 px-3.5 py-3">
        <summary className="cursor-pointer text-[11px] font-semibold text-sub">지금 심정도 덧붙이기 · 선택</summary>
        <input value={diary} onChange={(event) => setDiary(event.target.value)} placeholder="왜 이 선택이 망설여지는지 한 줄로 적어보세요" className="mt-3 w-full rounded-xl border border-line bg-bg px-3 py-2.5 text-xs text-ink outline-none focus:border-cyan" />
        {emotions.length > 0 && <Caption>감정은 결과 설명의 말투와 맥락에 반영됩니다.</Caption>}
      </details>

      <button type="button" disabled={blocked} onClick={() => navigate("/simulate")} className={`tap mt-4 flex w-full items-center justify-center gap-2 rounded-full py-4 text-[15px] font-bold transition-all ${blocked ? "bg-white/10 text-mut" : "bg-[#EAF1FF] text-[#08101D] shadow-[0_14px_34px_rgba(117,160,255,.25)]"}`}>
        두 미래 비교 시작하기 <ArrowRight size={17} />
      </button>
      <p className="mt-2 text-center text-[10px] text-mut">두 길을 채우면 코스모가 같은 조건으로 결과를 비교해요.</p>
    </div>
  );
}

function JobField({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-semibold text-sub">{label}</span>
      {children}
    </label>
  );
}

function ChoicePanel({ side, text, domains, domainAuto, active, grow, suggestions, onFocus, onText, onSuggestion, onDomain, onRedetect }) {
  const [editingDomains, setEditingDomains] = useState(false);
  const isA = side === "A";
  const accentText = isA ? "text-[#78A8FF]" : "text-[#FFB85C]";

  return (
    <section onClick={onFocus} style={{ flexGrow: grow, flexBasis: 0 }} className={`relative min-h-[240px] px-5 py-6 transition-[flex-grow,background-color] duration-500 ease-out lg:px-8 lg:py-9 ${isA ? "bg-[radial-gradient(circle_at_15%_10%,rgba(69,116,225,.19),transparent_48%)]" : "bg-[radial-gradient(circle_at_85%_90%,rgba(211,137,49,.15),transparent_48%)]"} ${active ? "opacity-100" : "opacity-75"}`}>
      <div className={`text-[11px] font-black tracking-[.12em] ${accentText}`}>CHOICE {side}</div>
      <textarea value={text} onFocus={onFocus} onChange={(event) => onText(event.target.value)} rows={2} maxLength={100} placeholder={isA ? "첫 번째 길을 적어주세요" : "두 번째 길을 적어주세요"} className="mt-3 w-full resize-none border-b border-white/15 bg-transparent pb-3 text-[22px] font-bold leading-[1.35] tracking-[-.025em] text-ink outline-none placeholder:text-white/25" />

      {!text.trim() && active && (
        <div className="mt-4">
          <div className="mb-2 text-[10px] text-mut">이런 식으로 시작할 수 있어요</div>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((item) => <button key={item} type="button" onClick={(event) => { event.stopPropagation(); onSuggestion(item); }} className={`tap rounded-full border border-white/10 bg-white/[.06] px-3 py-2 text-[11px] ${accentText}`}>{item}</button>)}
          </div>
        </div>
      )}

      {text.trim() && (
        <div className="mt-3">
          <div className="flex items-center gap-2 text-[10px]">
            <span className="font-semibold text-sub">삶의 영역</span>
            <span className="min-w-0 flex-1 truncate text-mut">{domains.map(domainLabel).join(" · ") || "영역을 확인해주세요"}</span>
            <button type="button" onClick={(event) => { event.stopPropagation(); setEditingDomains((value) => !value); }} className={accentText}>{editingDomains ? "닫기" : "수정"}</button>
          </div>
          {editingDomains && (
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {LIFE_DOMAINS.map((domain) => {
                const selected = domains.includes(domain.key);
                const DomainIcon = DOMAIN_ICONS[domain.key];
                return <button type="button" key={domain.key} aria-pressed={selected} onClick={(event) => { event.stopPropagation(); onDomain(domain.key); }} className={`tap flex min-w-0 items-center justify-center gap-1 rounded-xl border px-2 py-2 text-[9px] ${selected ? `${isA ? "border-[#5E91F4] bg-[#10284B]" : "border-[#D8933E] bg-[#352511]"} ${accentText}` : "border-white/10 bg-black/10 text-mut"}`}>{DomainIcon && <DomainIcon size={12} />}{domain.label}</button>;
              })}
              {!domainAuto && <button type="button" onClick={(event) => { event.stopPropagation(); onRedetect(); }} className={`col-span-3 py-1 text-[10px] ${accentText}`}>자동 감지 다시 적용</button>}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
