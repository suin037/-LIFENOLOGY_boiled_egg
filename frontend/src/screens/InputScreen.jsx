import { useNavigate } from "react-router-dom";
import { useResult } from "../data/ResultContext.jsx";
import { SLOT_OPTIONS } from "../data/prediction.js";
import { Eyebrow, Card, Button, Caption } from "../components/ui.jsx";

const MAJOR_FIELDS = ["공학", "자연", "사회", "인문", "교육", "예체능", "의약"];

export default function InputScreen() {
  const navigate = useNavigate();
  const { profile, setProfile, choiceA, setChoiceA, choiceB, setChoiceB, detail, setDetail } =
    useResult();

  const a = SLOT_OPTIONS.find((o) => o.key === choiceA);
  const b = SLOT_OPTIONS.find((o) => o.key === choiceB);
  const needMajor = choiceA === "진학" || choiceB === "진학";

  // A/B가 겹치지 않게: 한쪽을 바꿀 때 반대쪽과 같으면 자동 회피
  function pick(setter, other, key) {
    setter(key);
  }

  return (
    <div>
      <Eyebrow>NEW SIMULATION · 갈림길 입력</Eyebrow>
      <h1 className="text-[22px] font-bold leading-[1.25]">
        두 개의 우주를
        <br />
        직접 골라보세요
      </h1>
      <Caption>비교할 두 갈래를 자유롭게 구성합니다. (예: 이직 vs 유지, 창업 vs 진학)</Caption>

      <SlotPicker
        tag="UNIVERSE A"
        accent="cyan"
        value={choiceA}
        disabledKey={choiceB}
        onPick={(k) => pick(setChoiceA, choiceB, k)}
      />
      <div className="my-2 text-center text-xs font-bold tracking-widest text-mut">VS</div>
      <SlotPicker
        tag="UNIVERSE B"
        accent="gold"
        value={choiceB}
        disabledKey={choiceA}
        onPick={(k) => pick(setChoiceB, choiceA, k)}
      />

      {/* 진학 있으면 전공계열 */}
      {needMajor && (
        <>
          <label className="mb-2 mt-4 block text-xs text-sub">전공 계열 (진학·취업률 매칭)</label>
          <select
            value={profile.major}
            onChange={(e) => setProfile((p) => ({ ...p, major: e.target.value }))}
            className="tap w-full rounded-xl border border-line bg-[#0E1424] px-3.5 py-3 text-sm text-ink outline-none focus:border-cyan"
          >
            {MAJOR_FIELDS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </>
      )}

      {/* 보조 자연어 */}
      <label className="mb-2 mt-4 block text-xs text-sub">
        구체적으로 어떤 고민인가요? <span className="text-mut">(선택)</span>
      </label>
      <textarea
        value={detail}
        onChange={(e) => setDetail(e.target.value)}
        rows={2}
        placeholder="예: 지금보다 규모 큰 회사로 옮길지 고민 중"
        className="w-full resize-none rounded-xl border border-line bg-[#0E1424] px-3.5 py-3 text-sm text-ink outline-none focus:border-cyan"
      />

      <Card className="mt-4">
        <div className="mb-1.5 text-xs text-sub">이번 시뮬레이션</div>
        <div className="text-sm">
          {profile.age}세 · {profile.occupation} ·{" "}
          <span className="text-cyan">{a?.label}</span> vs <span className="text-gold">{b?.label}</span>
        </div>
      </Card>

      <Button className="mt-4" onClick={() => navigate("/simulate")}>
        평행우주 열기 ✦
      </Button>
    </div>
  );
}

function SlotPicker({ tag, accent, value, disabledKey, onPick }) {
  const accentText = accent === "cyan" ? "text-cyan" : "text-gold";
  const onBorder = accent === "cyan" ? "border-cyan bg-[#12203a]" : "border-gold bg-[#241d10]";
  return (
    <div className="mt-3">
      <div className={`text-[11px] font-bold tracking-wide ${accentText}`}>{tag}</div>
      <div className="mt-2 grid grid-cols-4 gap-1.5">
        {SLOT_OPTIONS.map((o) => {
          const on = o.key === value;
          const disabled = o.key === disabledKey;
          return (
            <button
              key={o.key}
              disabled={disabled}
              onClick={() => onPick(o.key)}
              className={`tap flex flex-col items-center gap-1 rounded-[12px] border px-1 py-2.5 transition-colors ${
                on ? onBorder : "border-line bg-[#0E1424]"
              } ${disabled ? "opacity-30" : ""}`}
            >
              <span className="text-lg">{o.emoji}</span>
              <span className={`text-[11px] font-semibold ${on ? accentText : "text-sub"}`}>
                {o.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
