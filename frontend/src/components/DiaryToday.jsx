import { useEffect, useRef, useState } from "react";
import { Card, Caption } from "./ui.jsx";
import { useDiary, MOODS } from "../data/DiaryContext.jsx";
import { CHECKIN } from "../data/questions.js";
import ChatDiary from "./ChatDiary.jsx";
import { composeDiary, analyzeEmotion } from "../data/dispositionApi.js";
import Mascot from "./Mascot.jsx";
import { X } from "lucide-react";

const GUIDES = [
  { key: "daily", mascot: "nova", name: "노바", topic: "오늘의 일상", color: "#FF9EC0", prompt: "오늘 있었던 일, 나와 같이 돌아볼래요?" },
  { key: "disposition", mascot: "cosmo", name: "코스모", topic: "고민과 선택", color: "#7CC3FF", prompt: "고민 중인 갈림길, 같이 비춰볼까요?" },
  { key: "health", mascot: "lumi", name: "루미", topic: "몸과 마음", color: "#FFD97A", prompt: "몸과 마음의 신호를 천천히 살펴봐요." },
];

// 홈 "체크인" 카드 — 2층 일기.
//  · 30초 데일리: 기분 5단계(→ 그날 별 밝기) + 에너지·역량·감정키워드 칩
//  · '자세히 답하기' 버튼 → 오늘의 질문(고정2+랜덤2) 펼침 → 성향 신호
export default function DiaryToday() {
  const { entries, saveToday, todayEntry, lastSim, daysSince } = useDiary();
  const [mood, setMood] = useState(todayEntry?.mood ?? null);
  const [energy, setEnergy] = useState(todayEntry?.energy ?? null);
  const [competency, setCompetency] = useState(todayEntry?.competency ?? null);
  const [emotion, setEmotion] = useState(todayEntry?.emotion ?? null);
  const [text, setText] = useState(todayEntry?.text ?? "");
  const [chatMsgs, setChatMsgs] = useState([]); // 챗봇 대화(오늘의 질문·상태) → 저장 시 흡수
  const [activeGuide, setActiveGuide] = useState(null);
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [checkinDone, setCheckinDone] = useState(Boolean(todayEntry?.mood || todayEntry?.energy || todayEntry?.emotion));

  const tag = `${lastSim.label} 이후 ${daysSince(lastSim.date)}일째`;

  const chatHasUser = chatMsgs.some((m) => m.role === "user");

  async function save() {
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
    // 감정/기분을 안 골랐으면 → 내가 만든 감정모델로 일기에서 추론(우선).
    let finalMood = mood;
    let finalEmotion = emotion;
    if ((finalMood == null || !finalEmotion) && bodyText) {
      const em = await analyzeEmotion(bodyText);
      if (em) {
        if (!finalEmotion) finalEmotion = em.emotion || finalEmotion;
        if (finalMood == null && em.mood != null) finalMood = em.mood;
      }
    }
    // 감정모델 불가(체크포인트 없음 등)로 기분이 여전히 비었으면 → LLM compose 폴백.
    if (finalMood == null && chatHasUser) {
      try {
        const c = await composeDiary(chatMsgs);
        if (c) {
          finalMood = c.mood ?? 3;
          if (!finalEmotion) finalEmotion = c.emotion || null;
        }
      } catch {
        finalMood = 3;
      }
    }
    saveToday(finalMood, bodyText, null, { energy, competency, emotion: finalEmotion });
  }

  return (
    <Card>
      <GuideCarousel onOpen={setActiveGuide} />
      <WeekStrip entries={entries} />

      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-bold">오늘의 기록</div>
          <div className="mt-0.5 text-[10px] text-mut">가볍게 한 줄만 남겨도 괜찮아요.</div>
        </div>
        {checkinDone && <span className="rounded-full bg-cyan/10 px-2.5 py-1.5 text-[10px] font-semibold text-cyan">체크인 완료</span>}
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={80}
        rows={2}
        placeholder="오늘을 한 줄로 남겨보세요"
        className="mt-3 w-full resize-none rounded-2xl border border-line bg-[#0E1424] px-3.5 py-3 text-sm leading-relaxed text-ink outline-none placeholder:text-mut focus:border-cyan"
      />

      {(mood || energy || emotion) && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {mood && <Tag>{MOODS.find((item) => item.v === mood)?.emoji} {MOODS.find((item) => item.v === mood)?.label}</Tag>}
          {energy && <Tag>에너지 {energy}</Tag>}
          {emotion && <Tag>{emotion}</Tag>}
        </div>
      )}

      <button
        type="button"
        onClick={() => setCheckinOpen(true)}
        className={`tap mt-4 w-full rounded-2xl py-3 text-[13px] font-bold ${
          checkinDone
            ? "border border-line bg-[#121A2A] text-sub"
            : "bg-gradient-to-r from-[#477EF3] to-[#70A0FF] text-white shadow-[0_10px_28px_rgba(71,126,243,.3)]"
        }`}
      >
        {checkinDone ? "30초 체크인 수정" : "◴ 30초 체크인 하기"}
      </button>

      <button
        disabled={!checkinDone}
        onClick={save}
        className={`tap mt-3 w-full rounded-2xl py-2.5 text-[13px] font-bold transition-colors ${
          checkinDone ? "bg-gradient-to-r from-cyan to-cyan-deep text-[#04203a]" : "bg-[#1E2740] text-mut"
        }`}
      >
        기록 저장
      </button>
      <Caption>{tag}로 자동 기록됩니다.</Caption>

      {checkinOpen && (
        <div
          className="fixed inset-0 z-50 flex animate-backdrop-in items-end justify-center bg-[#02050C]/70 backdrop-blur-[4px]"
          onClick={() => setCheckinOpen(false)}
        >
          <div
            className="flex max-h-[min(88dvh,760px)] w-full max-w-phone animate-sheet-up flex-col overflow-hidden rounded-t-[36px] border border-b-0 border-[#26324A] bg-[#111A2A] shadow-[0_-22px_60px_rgba(0,0,0,.45)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 z-10 rounded-t-[36px] bg-[#111A2A]/95 px-5 pb-3 pt-3 backdrop-blur">
              <div className="mx-auto mb-3 h-1 w-11 rounded-full bg-[#647087]/65" />
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-bold text-[#72A6FF]">30초 체크인</div>
                  <h2 className="mt-1 text-[22px] font-bold tracking-[-.02em]">오늘, 어땠나요?</h2>
                </div>
                <button type="button" onClick={() => setCheckinOpen(false)} className="tap flex h-10 w-10 items-center justify-center rounded-full bg-[#202B3E] text-sub" aria-label="체크인 닫기">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 pb-8 pt-2">
              <section>
                <div className="mb-3 text-[13px] font-bold text-sub">지금 기분은 어떤가요?</div>
                <div className="grid grid-cols-5 gap-2">
                  {MOODS.map((item) => {
                    const on = item.v === mood;
                    return (
                      <button
                        key={item.v}
                        type="button"
                        onClick={() => setMood(item.v)}
                        className={`tap flex min-w-0 flex-col items-center rounded-[22px] border py-3 ${on ? "border-[#6597FF] bg-[#1A315C] shadow-[0_0_0_1px_rgba(101,151,255,.18)]" : "border-[#2A3549] bg-[#182234]"}`}
                      >
                        <span className={`text-[27px] leading-none ${on ? "scale-110" : "opacity-80"}`}>{item.emoji}</span>
                        <span className={`mt-2 text-[10px] ${on ? "font-semibold text-white" : "text-mut"}`}>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section>
                <div className="mb-3 text-[13px] font-bold text-sub">{CHECKIN.energy.q}</div>
                <div className="flex flex-wrap gap-2">
                  {CHECKIN.energy.opts.map((option) => {
                    const on = energy === option.v;
                    return (
                      <button key={option.v} type="button" onClick={() => setEnergy(option.v)} className={`tap rounded-full border px-5 py-2.5 text-[12px] font-semibold ${on ? "border-[#6597FF] bg-[#1A315C] text-white" : "border-[#2A3549] bg-[#182234] text-sub"}`}>
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </section>

              <section>
                <div className="mb-3 text-[13px] font-bold text-sub">{CHECKIN.competency.q}</div>
                <div className="flex flex-wrap gap-2">
                  {CHECKIN.competency.opts.map((item) => {
                    const on = competency === item;
                    return <button key={item} type="button" onClick={() => setCompetency(item)} className={`tap rounded-full border px-4 py-2.5 text-[12px] font-semibold ${on ? "border-[#6597FF] bg-[#1A315C] text-white" : "border-[#2A3549] bg-[#182234] text-sub"}`}>{item}</button>;
                  })}
                </div>
              </section>

              <section>
                <div className="mb-3 text-[13px] font-bold text-sub">{CHECKIN.emotion.q}</div>
                <div className="flex flex-wrap gap-2">
                  {CHECKIN.emotion.opts.map((option) => {
                    const on = emotion === option.key;
                    return <button key={option.key} type="button" onClick={() => setEmotion(option.key)} className={`tap rounded-full border px-4 py-2.5 text-[12px] font-semibold ${on ? "border-[#6597FF] bg-[#1A315C] text-white" : "border-[#2A3549] bg-[#182234] text-sub"}`}>{option.emoji} {option.key}</button>;
                  })}
                </div>
              </section>
            </div>

            <div className="relative z-20 shrink-0 border-t border-[#26324A] bg-[#111A2A] px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-4 shadow-[0_-12px_28px_rgba(3,8,18,.72)]">
              <button
                type="button"
                onClick={() => { setCheckinDone(true); setCheckinOpen(false); }}
                className="tap w-full rounded-full bg-gradient-to-r from-[#477EF3] to-[#70A0FF] py-3.5 text-[14px] font-bold text-white shadow-[0_12px_30px_rgba(71,126,243,.28)]"
              >
                체크인 반영하기
              </button>
              <p className="mt-2 text-center text-[10px] text-mut">홈의 ‘기록 저장’을 누르면 오늘 기록에 함께 저장돼요.</p>
            </div>
          </div>
        </div>
      )}

      {activeGuide && (
        <div className="fixed inset-0 z-50 bg-[#070B14]/95">
          <div className="mx-auto flex h-full max-w-phone flex-col px-5 pb-6 pt-5">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setActiveGuide(null)}
                className="tap flex h-10 w-10 items-center justify-center rounded-full bg-card text-sub"
                aria-label="대화 닫기"
              >
                <X size={18} />
              </button>
              <div className="text-center">
                <div className="text-[13px] font-bold" style={{ color: activeGuide.color }}>{activeGuide.name}와 대화</div>
                <div className="text-[10px] text-mut">{activeGuide.topic}</div>
              </div>
              <div className="h-10 w-10" />
            </div>

            <div className="mt-5 flex justify-center">
              <div className="rounded-full bg-white/5 p-3 shadow-[0_0_32px_rgba(124,195,255,.18)]">
                <Mascot which={activeGuide.mascot} size={68} />
              </div>
            </div>

            <div className="mt-5 min-h-0 flex-1 overflow-y-auto rounded-[24px] border border-line bg-card p-4">
              <ChatDiary
                key={activeGuide.key}
                embedded
                initialArea={activeGuide.key}
                showAreas={false}
                onMessagesChange={setChatMsgs}
              />
            </div>

            <button
              type="button"
              onClick={() => setActiveGuide(null)}
              className="tap mt-4 w-full rounded-2xl bg-cyan py-3 text-[13px] font-bold text-[#04203a]"
            >
              대화 반영하고 돌아가기
            </button>
            <p className="mt-2 text-center text-[10px] text-mut">대화는 홈의 ‘기록 저장’을 누르면 오늘 일기에 함께 저장돼요.</p>
          </div>
        </div>
      )}
    </Card>
  );
}

function GuideCarousel({ onOpen }) {
  const [index, setIndex] = useState(1);
  const trackRef = useRef(null);
  const dragRef = useRef({ active: false, x: 0, left: 0, moved: false });
  const guide = GUIDES[index];

  function centerItem(nextIndex, smooth = true) {
    const track = trackRef.current;
    const item = track?.children[nextIndex];
    if (!track || !item) return;
    const left = item.offsetLeft - (track.clientWidth - item.clientWidth) / 2;
    track.scrollTo({ left, behavior: smooth ? "smooth" : "auto" });
    setIndex(nextIndex);
    if (!smooth) requestAnimationFrame(updateOrbit);
  }

  useEffect(() => {
    const timer = requestAnimationFrame(() => centerItem(1, false));
    return () => cancelAnimationFrame(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function nearestIndex() {
    const track = trackRef.current;
    if (!track) return index;
    const center = track.scrollLeft + track.clientWidth / 2;
    let nearest = 0;
    let distance = Infinity;
    Array.from(track.children).forEach((item, itemIndex) => {
      const gap = Math.abs(item.offsetLeft + item.clientWidth / 2 - center);
      if (gap < distance) {
        nearest = itemIndex;
        distance = gap;
      }
    });
    return nearest;
  }

  function updateOrbit() {
    const track = trackRef.current;
    if (!track) return;
    const center = track.scrollLeft + track.clientWidth / 2;

    Array.from(track.children).forEach((item) => {
      const itemCenter = item.offsetLeft + item.clientWidth / 2;
      const distancePx = Math.abs(itemCenter - center);
      const distance = Math.min(1, distancePx / (item.clientWidth * 0.92));
      // A quadratic curve makes the guides follow a rounded hill instead of a V-shaped path.
      const lift = -18 + (distance * distance) * 46;
      const scale = 1 - distance * 0.22;
      const opacity = 1 - distance * 0.55;
      item.style.transform = `translateY(${lift}px) scale(${scale})`;
      item.style.opacity = String(opacity);
    });

  }

  function finishDrag(event) {
    if (!dragRef.current.active) return;
    dragRef.current.active = false;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    centerItem(nearestIndex());
  }

  return (
    <div className="mb-5 border-b border-line pb-5">
      <button
        type="button"
        onClick={() => onOpen(guide)}
        className="tap relative mx-auto mb-2 block max-w-[280px] rounded-[20px] border border-line bg-[#1B2438] px-4 py-2.5 text-center text-[12px] font-semibold text-ink"
      >
        {guide.prompt}
        <span className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b border-r border-line bg-[#1B2438]" />
      </button>

      <div className="relative overflow-hidden pb-3 pt-2">
        <div className="pointer-events-none absolute -bottom-[74px] left-1/2 h-[138px] w-[118%] -translate-x-1/2 rounded-[50%] border-t border-[#2A3850] bg-[radial-gradient(ellipse_at_top,rgba(57,86,130,.20),rgba(17,27,43,.05)_55%,transparent_72%)]" />
        <div
        ref={trackRef}
        onScroll={updateOrbit}
        onPointerDown={(event) => {
          dragRef.current = {
            active: true,
            x: event.clientX,
            left: event.currentTarget.scrollLeft,
            moved: false,
          };
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (!dragRef.current.active) return;
          const distance = event.clientX - dragRef.current.x;
          if (Math.abs(distance) > 6) dragRef.current.moved = true;
          event.currentTarget.scrollLeft = dragRef.current.left - distance;
          updateOrbit();
        }}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        className="no-scrollbar relative z-10 flex cursor-grab overflow-x-auto px-[20%] pb-3 pt-2 active:cursor-grabbing"
        style={{ touchAction: "pan-y" }}
      >
        {GUIDES.map((item) => {
          return (
            <button
              type="button"
              key={item.key}
              onClick={() => {
                if (dragRef.current.moved) {
                  dragRef.current.moved = false;
                  return;
                }
                onOpen(item);
              }}
              aria-label={`${item.name}와 대화하기`}
              className="tap flex w-[60%] shrink-0 flex-col items-center justify-center py-3 will-change-transform"
            >
              <span
                className="flex h-32 w-32 items-center justify-center rounded-full"
                style={{ background: `radial-gradient(circle, ${item.color}35 0%, ${item.color}18 45%, transparent 70%)` }}
              >
                <Mascot which={item.mascot} size={112} />
              </span>
              <span className="mt-2 text-[14px] font-bold" style={{ color: item.color }}>{item.name}</span>
              <span className="text-[10px] text-mut">{item.topic}</span>
            </button>
          );
        })}
        </div>
      </div>

      <div className="mt-1 flex justify-center gap-1.5">
        {GUIDES.map((item, itemIndex) => (
          <button
            type="button"
            key={item.key}
            onClick={() => centerItem(itemIndex)}
            aria-label={`${item.name} 선택`}
            className={`h-1.5 rounded-full ${itemIndex === index ? "w-5 bg-cyan" : "w-1.5 bg-[#3A4358]"}`}
          />
        ))}
      </div>
    </div>
  );
}

function WeekStrip({ entries }) {
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));
    const offset = date.getTimezoneOffset() * 60000;
    const key = new Date(date.getTime() - offset).toISOString().slice(0, 10);
    return { date, key, entry: entries.find((item) => item.date === key) };
  });
  const moodEmoji = ["", "😞", "😕", "😐", "🙂", "😄"];

  return (
    <div className="mb-5 border-b border-line pb-4">
      <div className="grid grid-cols-7 gap-1">
        {days.map(({ date, key, entry }, index) => {
          const isToday = index === days.length - 1;
          return (
            <div key={key} className={`flex min-w-0 flex-col items-center rounded-2xl py-2 ${isToday ? "border border-cyan/35 bg-cyan/10" : ""}`}>
              <span className={`text-[9px] ${isToday ? "font-semibold text-cyan" : "text-mut"}`}>
                {new Intl.DateTimeFormat("ko-KR", { weekday: "short" }).format(date)}
              </span>
              <span className={`mt-0.5 text-[12px] font-bold ${isToday ? "text-cyan" : "text-sub"}`}>{date.getDate()}</span>
              <span className="mt-1 flex h-4 items-center justify-center text-[12px]">
                {entry ? moodEmoji[entry.mood] || "✦" : <i className="h-1 w-1 rounded-full bg-line" />}
              </span>
            </div>
          );
        })}
      </div>
    </div>
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
