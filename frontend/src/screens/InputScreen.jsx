import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useResult } from "../data/ResultContext.jsx";
import { SLOT_OPTIONS, classifyChoice, labelOf } from "../data/choices.js";
import { detectEmotions } from "../data/DiaryContext.jsx";
import { Eyebrow, Card, Button, Caption } from "../components/ui.jsx";

const MAJOR_FIELDS = ["공학", "자연", "사회", "인문", "교육", "예체능", "의약"];
const COVERAGE_HINT = {
  이직: "유사인물·인과·평행우주 궤적까지",
  창업: "창업 생존율·폐업 타임라인",
  진학: "계열 취업률·진학률",
  유지: "유지 시 또래 통계·궤적(기준선)",
};

// 하이브리드 입력: 자유서술 → 자동분류(수정 가능) → 07-30 백엔드 choice_a/choice_b + diary 로 제출
export default function InputScreen() {
  const navigate = useNavigate();
  const { profile, setProfile, choices, setChoices, diary, setDiary } = useResult();
  const [textA, setTextA] = useState("");
  const [textB, setTextB] = useState("");
  const [autoA, setAutoA] = useState(true);
  const [autoB, setAutoB] = useState(true);

  function onText(side, val) {
    if (side === "A") {
      setTextA(val);
      if (autoA) { const c = classifyChoice(val); if (c) setChoices((p) => ({ ...p, a: c })); }
    } else {
      setTextB(val);
      if (autoB) { const c = classifyChoice(val); if (c) setChoices((p) => ({ ...p, b: c })); }
    }
  }
  function override(side, key) {
    if (side === "A") { setChoices((p) => ({ ...p, a: key })); setAutoA(false); }
    else { setChoices((p) => ({ ...p, b: key })); setAutoB(false); }
  }

  const emotions = detectEmotions(`${diary} ${textA} ${textB}`);
  const needMajor = choices.a === "진학" || choices.b === "진학";
  const same = choices.a === choices.b;

  return (
    <div>
      <Eyebrow>NEW SIMULATION · 갈림길 입력</Eyebrow>
      <h1 className="text-[22px] font-bold leading-[1.25]">
        고민하는 두 갈래를
        <br />
        그냥 적어보세요
      </h1>
      <Caption>문장으로 쓰면 알아서 분류해요. 틀리면 아래 칩으로 고치면 됩니다.</Caption>

      <SlotInput
        tag="UNIVERSE A" accent="cyan"
        text={textA} choice={choices.a} auto={autoA}
        onText={(v) => onText("A", v)} onPick={(k) => override("A", k)}
        placeholder="예: 지금보다 큰 회사로 옮길까"
      />
      <div className="my-2 text-center text-xs font-bold tracking-widest text-mut">VS</div>
      <SlotInput
        tag="UNIVERSE B" accent="gold"
        text={textB} choice={choices.b} auto={autoB}
        onText={(v) => onText("B", v)} onPick={(k) => override("B", k)}
        placeholder="예: 그냥 지금 회사 계속 다니기"
      />

      {same && (
        <Caption className="text-danger">두 우주가 같아요({labelOf(choices.a)}). 다른 갈래로 비교해보세요.</Caption>
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

      {/* 지금 심정 → 감정 감지 → 서사 개인화 (백엔드 diary 로 전송됨) */}
      <label className="mb-2 mt-4 block text-xs text-sub">
        지금 심정은 어떤가요? <span className="text-mut">(선택 · 서사 개인화)</span>
      </label>
      <input
        value={diary}
        onChange={(e) => setDiary(e.target.value)}
        placeholder="예: 잘한 선택인지 막막하고 불안해"
        className="w-full rounded-xl border border-line bg-[#0E1424] px-3.5 py-2.5 text-sm text-ink outline-none focus:border-cyan"
      />
      {emotions.length > 0 && (
        <Caption>
          감지된 감정{" "}
          {emotions.map((e) => <b key={e.keyword} className="text-cyan">{e.keyword}</b>)
            .reduce((a, b) => [a, " · ", b])}
          {" "}→ <b className="text-sub">{emotions[0].card}</b> 카드가 서사에 반영돼요
        </Caption>
      )}

      <Card className="mt-4">
        <div className="mb-1.5 text-xs text-sub">이번 시뮬레이션</div>
        <div className="text-sm">
          {profile.age}세 · {profile.occupation} ·{" "}
          <span className="text-cyan">{labelOf(choices.a)}</span> vs <span className="text-gold">{labelOf(choices.b)}</span>
        </div>
      </Card>

      <Button className={`mt-4 ${same ? "opacity-40" : ""}`} onClick={() => !same && navigate("/simulate")}>
        평행우주 열기 ✦
      </Button>
    </div>
  );
}

function SlotInput({ tag, accent, text, choice, auto, onText, onPick, placeholder }) {
  const accentText = accent === "cyan" ? "text-cyan" : "text-gold";
  const border = accent === "cyan" ? "border-cyan/60" : "border-gold/60";
  return (
    <div className={`mt-3 rounded-2xl border ${border} bg-[#0E1424] p-3.5`}>
      <div className={`text-[11px] font-bold tracking-wide ${accentText}`}>{tag}</div>
      <textarea
        value={text}
        onChange={(e) => onText(e.target.value)}
        rows={2}
        placeholder={placeholder}
        className="mt-2 w-full resize-none rounded-lg border border-line bg-bg px-3 py-2 text-sm text-ink outline-none focus:border-cyan"
      />
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] text-mut">{auto ? "자동 감지:" : "직접 선택:"}</span>
        {SLOT_OPTIONS.map((o) => {
          const on = o.key === choice;
          return (
            <button
              key={o.key}
              onClick={() => onPick(o.key)}
              className={`tap rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
                on ? `${accentText} ${accent === "cyan" ? "border-cyan bg-[#12203a]" : "border-gold bg-[#241d10]"}` : "border-line text-mut"
              }`}
            >
              {o.emoji} {o.label}
            </button>
          );
        })}
      </div>
      <div className="mt-1.5 text-[10px] text-mut">{choice} → {COVERAGE_HINT[choice]}</div>
    </div>
  );
}
