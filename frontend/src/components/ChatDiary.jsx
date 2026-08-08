import { useState, useRef, useEffect } from "react";
import { Card, Caption } from "./ui.jsx";
import { addCheckin, setDomains, todayKey } from "../data/myUniverse.js";
import { composeDiary } from "../data/dispositionApi.js";
import { todayQuestions } from "../data/questions.js";
import { useResult } from "../data/ResultContext.jsx";
import Mascot from "./Mascot.jsx";

// 질문 영역별 대화형 일기(jy). 데일리 체크인 아래 '오늘의 질문 + 몸·마음 상태'를 대신한다.
//  · 영역 3개: 일상 / 성향(매일 랜덤 질문) / 건강. 각 영역의 질문 리스트를 하나씩 묻고 사용자가 답한다.
//  · embedded=true: 카드/저장버튼 없이 대화만. onMessagesChange 로 부모(체크인)에 올림 → 부모 '기록 저장'이 흡수.
const AREAS = [
  { key: "daily", name: "일상", mascot: "nova" },
  { key: "disposition", name: "성향", mascot: "cosmo" },
  { key: "health", name: "건강", mascot: "lumi" },
];
// 질문 = { text, options? }. options 있으면 선택창(칩)으로, 없으면 자유서술.
// 일상 = 구체적 하루 활동 로그. 성향(todayQuestions=가치·성찰 질문)과 겹치지 않게 '한 일/사람/먹은 것'.
const DAILY_Q = [
  { text: "오늘 하루, 주로 뭘 하면서 보냈어요?" },
  { text: "오늘 누구와 함께한 시간이 있었나요?" },
  { text: "오늘 먹은 것 중에 맛있었던 게 있어요?" },
];
// 건강 = 고정 질문(매일 안 바뀜). 선택형(옵션) + 정량 수치(number). 수치는 후에 삼성헬스 자동수신 자리.
const HEALTH_Q = [
  { text: "요즘 밤잠은 어땠어?", options: ["잘 잠", "뒤척임", "못 잠"] },
  { text: "어젯밤 수면 점수는? (알면 숫자로)", type: "number", unit: "점", skip: true },
  { text: "어제 몇 시간쯤 잤어요?", type: "number", unit: "시간", skip: true },
  { text: "오늘 걸음수는 얼마였어요?", type: "number", unit: "걸음", skip: true },
  { text: "오늘 운동은 얼마나 했어요?", type: "number", unit: "분", skip: true },
  { text: "요즘 스트레스는 얼마나 느껴?", options: ["거의 없음", "보통", "심함"] },
];

function areaQuestions(key) {
  if (key === "disposition") {
    try {
      const qs = todayQuestions().map((q) => ({ text: q.text, id: q.id })).filter((q) => q.text);
      if (qs.length) return qs;
    } catch {
      /* 로드 실패 시 기본 */
    }
    return [{ text: "오늘 어떤 선택을 했고, 왜 그렇게 했어?" }];
  }
  if (key === "health") return HEALTH_Q;
  return DAILY_Q;
}

export default function ChatDiary({ onSaved, embedded = false, onMessagesChange }) {
  const { setProfile } = useResult(); // 성향 답변을 프로필에 반영(모든 시나리오 개인화 재료)
  const [area, setArea] = useState("daily");
  const [qs, setQs] = useState(() => areaQuestions("daily"));
  const [qi, setQi] = useState(0);
  const [msgs, setMsgs] = useState(() => [{ role: "bot", text: areaQuestions("daily")[0].text }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(null);
  const threadRef = useRef(null);

  const mascot = AREAS.find((a) => a.key === area)?.mascot || "nova";
  const hasUser = msgs.some((m) => m.role === "user");
  const done = qi >= qs.length;

  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
    onMessagesChange?.(msgs);
  }, [msgs]); // eslint-disable-line react-hooks/exhaustive-deps

  function switchArea(key) {
    const list = areaQuestions(key);
    setArea(key);
    setQs(list);
    setQi(0);
    setMsgs([{ role: "bot", text: list[0].text }]);
    setSaved(null);
  }

  function answer(raw) {
    const v = (raw ?? input).trim();
    if (!v) return;
    // 성향 질문(D2/D1/D4 등 id 있는 것)에 답하면 프로필 psych_answers에 저장
    // → buildDisposition → 모든 시뮬 시나리오 개인화에 반영.
    const cur = qs[qi];
    if (cur?.id && setProfile) {
      setProfile((p) => ({ ...p, psych_answers: { ...(p.psych_answers || {}), [cur.id]: v } }));
    }
    const next = qi + 1;
    const add = [{ role: "user", text: v }];
    if (next < qs.length) add.push({ role: "bot", text: qs[next].text });
    else add.push({ role: "bot", text: "다 답해줘서 고마워! 아래 ‘기록 저장’을 누르면 오늘 일기로 정리할게." });
    setMsgs((m) => [...m, ...add]);
    setQi(next);
    setInput("");
  }

  // 단독 모드 전용 저장(임베드 때는 부모의 '기록 저장'이 대신한다).
  async function save() {
    if (busy || !hasUser) return;
    setBusy(true);
    try {
      const c = await composeDiary(msgs);
      const today = todayKey();
      addCheckin({ date: today, text: c.text, mood: c.mood, keyword: c.emotion, domains: c.domains });
      if (c.domains) setDomains(today, c.domains);
      setSaved(c);
      onSaved?.();
    } finally {
      setBusy(false);
    }
  }

  const inner = (
    <>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[13px] font-semibold text-cyan">💬 질문에 답하며 기록</div>
        <div className="flex gap-1">
          {AREAS.map((a) => (
            <button
              key={a.key}
              onClick={() => switchArea(a.key)}
              className={`tap flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] ${
                area === a.key ? "border-cyan text-cyan" : "border-line text-mut"
              }`}
            >
              <Mascot which={a.mascot} size={20} />
              {a.name}
            </button>
          ))}
        </div>
      </div>

      <div ref={threadRef} className="flex flex-col gap-2 overflow-y-auto" style={{ maxHeight: 220 }}>
        {msgs.map((m, i) =>
          m.role === "bot" ? (
            <div key={i} className="flex items-start gap-2 self-start" style={{ maxWidth: "82%" }}>
              <Mascot which={mascot} size={26} />
              <span className="rounded-2xl border border-line bg-[#141b2e] px-3 py-1.5 text-[13px] text-ink">{m.text}</span>
            </div>
          ) : (
            <span key={i} className="self-end rounded-2xl bg-[#12203a] px-3 py-1.5 text-[13px]" style={{ maxWidth: "82%", color: "#dbeafe" }}>
              {m.text}
            </span>
          ),
        )}
      </div>

      {!done &&
        (qs[qi]?.type === "number" ? (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input
              type="number"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && input.trim() && answer(`${input.trim()}${qs[qi].unit || ""}`)}
              placeholder={qs[qi].unit || "숫자"}
              className="w-24 rounded-xl border border-line bg-[#0E1424] px-3 py-2 text-sm text-ink outline-none focus:border-cyan"
            />
            <span className="text-[12px] text-mut">{qs[qi].unit}</span>
            <button
              onClick={() => input.trim() && answer(`${input.trim()}${qs[qi].unit || ""}`)}
              disabled={!input.trim()}
              className="tap rounded-xl border border-line px-3 text-[13px] text-sub"
            >
              확인
            </button>
            {qs[qi].skip && (
              <button onClick={() => answer("기록 안 함")} className="tap px-2 text-[12px] text-mut">
                건너뛰기
              </button>
            )}
          </div>
        ) : qs[qi]?.options ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {qs[qi].options.map((opt) => (
              <button
                key={opt}
                onClick={() => answer(opt)}
                className="tap rounded-full border border-line px-3 py-1.5 text-[12px] text-sub focus:border-cyan"
              >
                {opt}
              </button>
            ))}
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && answer()}
              placeholder="직접 +"
              className="rounded-full border border-line bg-transparent px-2.5 py-1.5 text-[12px] text-sub outline-none focus:border-cyan"
              style={{ width: 72 }}
            />
          </div>
        ) : (
          <div className="mt-2 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && answer()}
              placeholder="답변을 적어줘"
              className="flex-1 rounded-xl border border-line bg-[#0E1424] px-3 py-2 text-sm text-ink outline-none focus:border-cyan"
            />
            <button onClick={() => answer()} disabled={!input.trim()} className="tap rounded-xl border border-line px-3 text-[13px] text-sub">
              답변
            </button>
          </div>
        ))}

      {!embedded && (
        <>
          <button
            onClick={save}
            disabled={busy || !hasUser}
            className={`tap mt-2 w-full rounded-2xl py-2.5 text-[13px] font-bold transition-colors ${
              hasUser ? "bg-gradient-to-r from-cyan to-[#7FD4FF] text-[#04203a]" : "bg-[#1E2740] text-mut"
            }`}
          >
            오늘 기록 저장
          </button>
          <Caption>답변을 오늘의 일기로 정리하고, 기분·감정·영역을 자동으로 남겨요.</Caption>
        </>
      )}
      {embedded && (
        <Caption>
          {done ? "답변 완료 — " : ""}답변은 아래 ‘기록 저장’ 시 오늘의 일기·감정·영역으로 함께 정리돼요.
        </Caption>
      )}
    </>
  );

  if (embedded) return <div className="mt-3 border-t border-line pt-3">{inner}</div>;

  if (saved) {
    return (
      <Card>
        <div className="mb-1 text-xs font-bold text-cyan">오늘 기록 완료 ✦</div>
        <p className="text-[13px] text-sub">{saved.text}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {saved.emotion && <span className="rounded-lg border border-line px-2 py-0.5 text-[11px] text-sub">{saved.emotion}</span>}
          {(saved.domains || []).map((d) => (
            <span key={d} className="rounded-lg border border-line px-2 py-0.5 text-[11px] text-mut">🪐 {d}</span>
          ))}
        </div>
        <button onClick={() => switchArea(area)} className="tap mt-3 text-[11px] text-mut">다시 기록하기</button>
      </Card>
    );
  }

  return <Card>{inner}</Card>;
}
