import { useState } from "react";
import { Card, Caption } from "./ui.jsx";
import { useDiary, MOODS, detectEmotions } from "../data/DiaryContext.jsx";

// 홈 "오늘 기록" 카드 — 30초. 기분 5단계 + 한 줄. 저장 시 자동 태깅.
export default function DiaryToday() {
  const { saveToday, todayEntry, lastSim, daysSince } = useDiary();
  const [mood, setMood] = useState(todayEntry?.mood ?? null);
  const [text, setText] = useState(todayEntry?.text ?? "");
  const [editing, setEditing] = useState(!todayEntry);

  const emotions = detectEmotions(text);
  const tag = `${lastSim.label} 이후 ${daysSince(lastSim.date)}일째`;

  if (todayEntry && !editing) {
    return (
      <Card>
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold text-cyan">오늘 기록 완료 ✦</div>
          <button onClick={() => setEditing(true)} className="tap text-[11px] text-mut">
            수정
          </button>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-2xl">{MOODS.find((m) => m.v === todayEntry.mood)?.emoji}</span>
          <p className="text-[13px] text-sub">{todayEntry.text || "(한 줄 없음)"}</p>
        </div>
        <Caption>{tag}</Caption>
      </Card>
    );
  }

  return (
    <Card>
      <div className="mb-2 text-sm font-bold">오늘, 어땠나요? <span className="text-[11px] font-normal text-mut">· 30초</span></div>
      <div className="flex justify-between">
        {MOODS.map((m) => {
          const on = m.v === mood;
          return (
            <button
              key={m.v}
              onClick={() => setMood(m.v)}
              className={`tap flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 transition-colors ${
                on ? "bg-[#12203a]" : ""
              }`}
            >
              <span className={`text-2xl transition-transform ${on ? "scale-110" : "opacity-60"}`}>
                {m.emoji}
              </span>
              <span className={`text-[9px] ${on ? "text-cyan" : "text-mut"}`}>{m.label}</span>
            </button>
          );
        })}
      </div>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={80}
        placeholder="한 줄로 남겨보세요 (예: 새 팀 적응이 막막함)"
        className="mt-3 w-full rounded-xl border border-line bg-[#0E1424] px-3.5 py-2.5 text-sm text-ink outline-none focus:border-cyan"
      />

      {emotions.length > 0 && (
        <Caption>
          감지된 감정:{" "}
          {emotions.map((e) => (
            <span key={e.keyword} className="text-cyan">
              {e.keyword}
            </span>
          )).reduce((a, b) => [a, " · ", b])}{" "}
          → {emotions[0].card} 카드
        </Caption>
      )}

      <button
        disabled={!mood}
        onClick={() => {
          saveToday(mood, text.trim());
          setEditing(false);
        }}
        className={`tap mt-3 w-full rounded-2xl py-2.5 text-[13px] font-bold transition-colors ${
          mood ? "bg-gradient-to-r from-cyan to-cyan-deep text-[#04203a]" : "bg-[#1E2740] text-mut"
        }`}
      >
        기록 저장
      </button>
      <Caption>{tag}로 자동 기록됩니다.</Caption>
    </Card>
  );
}
