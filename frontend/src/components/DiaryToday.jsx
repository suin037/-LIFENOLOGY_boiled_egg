import { useState } from "react";
import { Card, Caption } from "./ui.jsx";
import { useDiary, MOODS } from "../data/DiaryContext.jsx";
import { todayQuestions, CHECKIN } from "../data/questions.js";
import ChatDiary from "./ChatDiary.jsx";

// 홈 "체크인" 카드 — 2층 일기.
//  · 30초 데일리: 기분 5단계(→ 그날 별 밝기) + 에너지·역량·감정키워드 칩
//  · '자세히 답하기' 버튼 → 오늘의 질문(고정2+랜덤2) 펼침 → 성향 신호
export default function DiaryToday() {
  const { saveToday, todayEntry, lastSim, daysSince } = useDiary();
  const [mood, setMood] = useState(todayEntry?.mood ?? null);
  const [energy, setEnergy] = useState(todayEntry?.energy ?? null);
  const [competency, setCompetency] = useState(todayEntry?.competency ?? null);
  const [emotion, setEmotion] = useState(todayEntry?.emotion ?? null);
  const [text, setText] = useState(todayEntry?.text ?? "");
  const [editing, setEditing] = useState(!todayEntry);
  const [openDetail, setOpenDetail] = useState(!!todayEntry?.answers);
  const [answers, setAnswers] = useState(todayEntry?.answers ?? {});
  const [chatMsgs, setChatMsgs] = useState([]); // 챗봇 대화(오늘의 질문·상태) → 저장 시 흡수

  const questions = todayQuestions();
  const tag = `${lastSim.label} 이후 ${daysSince(lastSim.date)}일째`;
  const answeredCount = Object.values(answers).filter((v) => (v || "").trim()).length;

  function save() {
    // 챗봇 답변을 '질문 → 답변' 그대로 정리해 일기 본문으로(오늘의질문·건강 대체).
    const qaLines = [];
    for (let i = 0; i < chatMsgs.length; i++) {
      if (chatMsgs[i].role !== "user") continue;
      const ans = (chatMsgs[i].text || "").trim();
      if (!ans || ans === "기록 안 함") continue;
      const q = i > 0 && chatMsgs[i - 1].role === "bot" ? chatMsgs[i - 1].text : null;
      qaLines.push(q ? `· ${q} → ${ans}` : `· ${ans}`);
    }
    const line = text.trim();
    const bodyText = [line, ...qaLines].filter(Boolean).join("\n");
    saveToday(mood, bodyText, null, { energy, competency, emotion });
    setEditing(false);
  }

  if (todayEntry && !editing) {
    const nAns = todayEntry.answers
      ? Object.values(todayEntry.answers).filter((v) => (v || "").trim()).length
      : 0;
    return (
      <Card>
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold text-cyan">오늘 기록 완료 ✦</div>
          <button onClick={() => setEditing(true)} className="tap text-[11px] text-mut">수정</button>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-2xl">{MOODS.find((m) => m.v === todayEntry.mood)?.emoji || "✦"}</span>
          <span className="text-[13px] text-sub">
            {todayEntry.emotion ? `오늘은 ‘${todayEntry.emotion}’으로 기록됐어요.` : "오늘 하루가 기록됐어요."}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {todayEntry.emotion && <Tag>{todayEntry.emotion}</Tag>}
          {todayEntry.competency && <Tag>{todayEntry.competency}</Tag>}
        </div>
        <Caption>{tag}</Caption>
      </Card>
    );
  }

  return (
    <Card>
      <div className="mb-2 text-sm font-bold">
        오늘, 어땠나요? <span className="text-[11px] font-normal text-mut"></span>
      </div>

      {/* 기분 5단계 — 그날 별의 밝기 (핵심 액션) */}
      <div className="mt-1 flex justify-between gap-1">
        {MOODS.map((m) => {
          const on = m.v === mood;
          return (
            <button
              key={m.v}
              onClick={() => setMood(m.v)}
              className={`tap flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-2 transition-all ${
                on ? "bg-cyan/15" : "hover:bg-card2"
              }`}
            >
              <span className={`text-[30px] leading-none transition-transform ${on ? "scale-110" : "opacity-70"}`}>
                {m.emoji}
              </span>
              <span className={`text-[11px] ${on ? "font-semibold text-cyan" : "text-mut"}`}>{m.label}</span>
            </button>
          );
        })}
      </div>

      {/* 데일리 칩 3개 */}
      <div className="mt-3 border-t border-line pt-3">
        <ChipRow label={CHECKIN.energy.q}>
          <div className="grid w-full grid-cols-4 gap-1">
            {CHECKIN.energy.opts.map((o) => (
              <Chip full key={o.v} on={energy === o.v} onClick={() => setEnergy(o.v)}>
                {o.emoji}
                <span className="ml-0.5">{o.label}</span>
              </Chip>
            ))}
          </div>
        </ChipRow>

        <ChipRow label={CHECKIN.competency.q}>
          <div className="grid w-full grid-cols-6 gap-1">
            {CHECKIN.competency.opts.map((c) => (
              <Chip dense full key={c} on={competency === c} onClick={() => setCompetency(c)}>{c}</Chip>
            ))}
          </div>
        </ChipRow>

        <ChipRow label={CHECKIN.emotion.q}>
          <div className="grid w-full grid-cols-4 gap-1">
            {CHECKIN.emotion.opts.map((o) => (
              <Chip dense full key={o.key} on={emotion === o.key} onClick={() => setEmotion(o.key)}>
                {o.emoji} {o.key}
              </Chip>
            ))}
          </div>
        </ChipRow>
      </div>

      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={80}
        placeholder="한 줄로 남겨보세요 (예: 새 팀 적응이 막막함)"
        className="mt-1 w-full rounded-xl border border-line bg-[#0E1424] px-3.5 py-2.5 text-sm text-ink outline-none focus:border-cyan"
      />

      {/* 오늘의 질문(성향·랜덤) + 몸·마음 상태 → 마스코트와 대화로. 저장은 아래 '기록 저장'으로 통합. */}
      <ChatDiary embedded onMessagesChange={setChatMsgs} />

      <button
        disabled={!mood}
        onClick={save}
        className={`tap mt-3 w-full rounded-2xl py-2.5 text-[13px] font-bold transition-colors ${
          mood ? "bg-gradient-to-r from-cyan to-cyan-deep text-[#04203a]" : "bg-[#1E2740] text-mut"
        }`}
      >
        기록 저장{answeredCount > 0 ? ` · 질문 ${answeredCount}개` : ""}
      </button>
      <Caption>{tag}로 자동 기록됩니다.</Caption>
    </Card>
  );
}

function ChipRow({ label, hint, children }) {
  return (
    <div className="mb-3.5 last:mb-0">
      <div className="mb-2 text-[12.5px] font-medium text-ink/90">
        {label}
        {hint && <span className="ml-1 text-[10px] text-mut">{hint}</span>}
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Chip({ on, onClick, children, dense = false, full = false }) {
  return (
    <button
      onClick={onClick}
      className={`tap !min-h-0 h-[30px] whitespace-nowrap rounded-full border px-2 py-0 text-[12px] font-medium leading-none transition-colors ${
        full ? "flex w-full items-center justify-center" : ""
      } ${
        on ? "border-cyan bg-cyan/15 text-cyan" : "border-line bg-card2 text-sub hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function Tag({ children }) {
  return (
    <span className="rounded-md border border-line bg-[#0E1424] px-2 py-0.5 text-[10px] text-mut">
      {children}
    </span>
  );
}
