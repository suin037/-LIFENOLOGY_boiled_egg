import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useResult } from "../data/ResultContext.jsx";
import { LIFE_DOMAINS, classifyChoice, detectLifeDomains, domainLabel, labelOf } from "../data/choices.js";
import { detectEmotions } from "../data/DiaryContext.jsx";
import { Button, Caption } from "../components/ui.jsx";
import { BriefcaseBusiness, GraduationCap, Sprout, Wallet, HeartPulse, House, Users, Leaf, Compass } from "lucide-react";

const MAJOR_FIELDS = ["공학", "자연", "사회", "인문", "교육", "예체능", "의약"];
const DOMAIN_ICONS = {
  career: BriefcaseBusiness, education: GraduationCap, business: Sprout,
  finance: Wallet, health: HeartPulse, housing: House,
  relationship: Users, lifestyle: Leaf, long_term_values: Compass,
};
// 하이브리드 입력: 자유서술 → 자동분류(수정 가능) → 07-30 백엔드 choice_a/choice_b + diary 로 제출
export default function InputScreen() {
  const navigate = useNavigate();
  const { profile, setProfile, choices, setChoices, scenarioTexts, setScenarioTexts, scenarioDomains, setScenarioDomains, diary, setDiary } = useResult();
  const textA = scenarioTexts.a;
  const textB = scenarioTexts.b;
  const [domainAuto, setDomainAuto] = useState({ a: true, b: true });

  function onText(side, val) {
    if (side === "A") {
      setScenarioTexts((p) => ({ ...p, a: val }));
      setChoices((p) => ({ ...p, a: classifyChoice(val) || "기타" }));
      if (domainAuto.a) setScenarioDomains((p) => ({ ...p, a: detectLifeDomains(val) }));
    } else {
      setScenarioTexts((p) => ({ ...p, b: val }));
      setChoices((p) => ({ ...p, b: classifyChoice(val) || "기타" }));
      if (domainAuto.b) setScenarioDomains((p) => ({ ...p, b: detectLifeDomains(val) }));
    }
  }
  function toggleDomain(side, key) {
    const field = side === "A" ? "a" : "b";
    setDomainAuto((p) => ({ ...p, [field]: false }));
    setScenarioDomains((p) => {
      const current = p[field] || [];
      const next = current.includes(key) ? current.filter((item) => item !== key) : [...current, key];
      return { ...p, [field]: next };
    });
  }
  function resetDomainDetection(side) {
    const field = side === "A" ? "a" : "b";
    const text = field === "a" ? textA : textB;
    setDomainAuto((p) => ({ ...p, [field]: true }));
    setScenarioDomains((p) => ({ ...p, [field]: detectLifeDomains(text) }));
  }

  const emotions = detectEmotions(`${diary} ${textA} ${textB}`);
  const needMajor = choices.a === "진학" || choices.b === "진학";
  const sameCategory = choices.a === choices.b;
  const normalizedA = textA.trim().replace(/\s+/g, " ");
  const normalizedB = textB.trim().replace(/\s+/g, " ");
  const duplicate = sameCategory && (!normalizedA || !normalizedB || normalizedA === normalizedB);
  const missingDomains = normalizedA && normalizedB && (!scenarioDomains.a.length || !scenarioDomains.b.length);
  const blocked = duplicate || missingDomains;

  return (
    <div>
      <h1 className="mt-3 text-[26px] font-bold leading-[1.2] tracking-[-.035em]">
        고민 중인 두 선택을 적어보세요
      </h1>
      <p className="mt-2 text-[13px] text-mut">각 선택지를 입력하면 미래를 비교해 더 나은 방향을 찾을 수 있어요.</p>
      <SlotInput
        tag="선택 A" accent="cyan"
        text={textA}
        onText={(v) => onText("A", v)}
        domains={scenarioDomains.a} domainAuto={domainAuto.a}
        onDomain={(k) => toggleDomain("A", k)} onRedetect={() => resetDomainDetection("A")}
        placeholder="예: 지금보다 큰 회사로 옮길까"
      />
      <div className="my-2 flex items-center gap-3 text-[11px] font-semibold text-mut">
        <span className="h-px flex-1 bg-line" />비교<span className="h-px flex-1 bg-line" />
      </div>
      <SlotInput
        tag="선택 B" accent="gold"
        text={textB}
        onText={(v) => onText("B", v)}
        domains={scenarioDomains.b} domainAuto={domainAuto.b}
        onDomain={(k) => toggleDomain("B", k)} onRedetect={() => resetDomainDetection("B")}
        placeholder="예: 그냥 지금 회사 계속 다니기"
      />

      {duplicate && (
        <Caption className="text-danger">
          같은 {labelOf(choices.a)}끼리 비교하려면 A/B에 서로 다른 회사·조건·상황을 적어주세요.
        </Caption>
      )}
      {sameCategory && !duplicate && (
        <Caption className="text-cyan">
          같은 유형이어도 구체적인 상황이 달라 비교할 수 있어요. 두 설명이 서사와 이미지에 반영됩니다.
        </Caption>
      )}
      {missingDomains && (
        <Caption className="text-danger">A/B 각각에 해당하는 삶의 영역을 하나 이상 선택해주세요.</Caption>
      )}

      {needMajor && (
        <>
          <label className="mb-2 mt-4 block text-xs text-sub">전공 계열 (진학·취업률 매칭)</label>
          <select
            value={profile.major}
            onChange={(e) => setProfile((p) => ({ ...p, major: e.target.value }))}
            className="tap w-full rounded-xl border border-line bg-[#0E1424] px-3.5 py-3 text-sm text-ink outline-none focus:border-cyan"
          >
            {MAJOR_FIELDS.map((m) => <option key={m}>{m}</option>)}
          </select>
        </>
      )}

      <details className="mt-3 rounded-xl border border-line bg-card px-3 py-2">
        <summary className="cursor-pointer text-[11px] text-sub">지금 심정 추가하기 (선택)</summary>
        <input
          value={diary}
          onChange={(e) => setDiary(e.target.value)}
          placeholder="예: 잘한 선택인지 막막하고 불안해"
          className="mt-2 w-full rounded-lg border border-line bg-bg px-3 py-2 text-xs text-ink outline-none focus:border-cyan"
        />
        {emotions.length > 0 && <Caption>감정이 결과 서사에 반영됩니다.</Caption>}
      </details>

      <Button className={`mt-4 ${blocked ? "opacity-40" : ""}`} onClick={() => !blocked && navigate("/simulate")}>
        두 선택 비교하기
      </Button>
    </div>
  );
}

function SlotInput({ tag, accent, text, onText, placeholder, domains, domainAuto, onDomain, onRedetect }) {
  const [editingDomains, setEditingDomains] = useState(false);
  const accentText = accent === "cyan" ? "text-cyan" : "text-gold";
  const border = accent === "cyan" ? "border-cyan/70" : "border-gold/70";
  const focusBorder = accent === "cyan" ? "focus:border-cyan" : "focus:border-gold";
  const badge = accent === "cyan"
    ? "border-cyan/80 bg-gradient-to-br from-[#4C91FF] to-[#2F6FE8] text-white"
    : "border-gold/80 bg-gradient-to-br from-[#FFB24F] to-[#EB8618] text-white";
  return (
    <div className="mt-3 rounded-[22px] border border-line bg-card/85 p-3.5 shadow-[0_12px_30px_rgba(0,0,0,.16)] backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl border text-base font-bold shadow-lg ${badge}`}>{tag.slice(-1)}</span>
        <span className="text-[15px] font-bold text-ink">{tag}</span>
      </div>
      <textarea
        value={text}
        onChange={(e) => onText(e.target.value)}
        rows={1}
        placeholder={placeholder}
        maxLength={100}
        className={`mt-2.5 w-full resize-none rounded-xl border border-line bg-[#0B1423]/80 px-3.5 py-3 text-sm text-ink outline-none placeholder:text-mut ${focusBorder}`}
      />
      <div className="mt-2 flex items-center gap-2 text-[11px]">
        <span className="shrink-0 font-semibold text-sub">삶의 영역</span>
        <span className="min-w-0 flex-1 truncate text-sub">
          {domains.map(domainLabel).join(" · ") || "입력하면 자동으로 찾아드려요"}
        </span>
        <button type="button" onClick={() => setEditingDomains((v) => !v)} className={accentText}>
          {editingDomains ? "닫기" : "수정"}
        </button>
      </div>
      {editingDomains && <div className="mt-2 grid grid-cols-3 gap-1.5">
        {LIFE_DOMAINS.map((domain) => {
          const on = domains.includes(domain.key);
          const DomainIcon = DOMAIN_ICONS[domain.key];
          return (
            <button
              type="button"
              key={domain.key}
              aria-pressed={on}
              onClick={() => onDomain(domain.key)}
              className={`tap flex min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border px-2 py-1.5 text-[10px] transition-colors ${on ? `${accentText} ${accent === "cyan" ? "border-cyan bg-[#10284B]" : "border-gold bg-[#382410]"}` : "border-line bg-[#0C1524] text-sub"}`}
            >
              {DomainIcon && <DomainIcon size={13} strokeWidth={1.9} />}
              {domain.label}
            </button>
          );
        })}
        {!domainAuto && <button type="button" onClick={onRedetect} className={`col-span-3 py-1 text-[10px] ${accentText}`}>자동 감지 다시 적용</button>}
      </div>}
    </div>
  );
}
