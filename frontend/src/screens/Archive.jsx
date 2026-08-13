import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eyebrow, Card, Caption } from "../components/ui.jsx";
import { useResult } from "../data/ResultContext.jsx";
import {
  listUniverses,
  saveUniverse,
  updateUniverse,
  removeUniverse,
  universeFromResult,
} from "../data/savedUniverses.js";
import { actionsFor, chosenChoice } from "../data/actionBridge.js";
import { Plus } from "lucide-react";

export default function Archive() {
  const navigate = useNavigate();
  const { result, profile, choices, setResult, setChoices } = useResult();
  const [items, setItems] = useState(listUniverses);

  const refresh = () => setItems(listUniverses());

  function saveCurrent() {
    saveUniverse(universeFromResult(result, profile, choices));
    refresh();
  }
  function reopen(u) {
    if (u.result) setResult(u.result);
    navigate("/result");
  }
  function resim(u) {
    if (u.choiceA && u.choiceB) setChoices({ a: u.choiceA, b: u.choiceB });
    navigate("/simulate");
  }

  const chosen = items.filter((u) => chosenChoice(u));

  return (
    <div>
      <Eyebrow>ARCHIVE · 나의 평행우주</Eyebrow>
      <h1 className="mb-1 text-[22px] font-bold leading-[1.25]">내가 향해 가는 미래들</h1>
      <Caption>시뮬레이션을 저장하고, 마음이 기운 미래를 골라 오늘의 한 걸음으로 이어갑니다.</Caption>

      {/* 향해 가는 미래 요약 */}
      {chosen.length > 0 && (
        <Card highlight>
          <div className="mb-1.5 text-xs font-semibold text-gold">🧭 내가 향해 가는 미래</div>
          <div className="flex flex-wrap gap-1.5">
            {chosen.map((u) => (
              <span
                key={u.id}
                className="rounded-full border border-line bg-[#0E1424] px-2.5 py-1 text-[11px] text-ink"
              >
                {chosenChoice(u)}
              </span>
            ))}
          </div>
          <Caption>각 카드의 '오늘 할 일'을 하나씩 해내면 그 미래에 가까워져요.</Caption>
        </Card>
      )}

      <button
        onClick={saveCurrent}
        className="tap mt-1 w-full rounded-2xl border border-cyan bg-[#1D1730] py-2.5 text-[13px] font-semibold text-cyan"
      >
        <span className="inline-flex items-center justify-center gap-2"><Plus size={16} />지금 결과를 보관함에 저장</span>
      </button>

      {items.length === 0 ? (
        <Card>
          <Caption>
            아직 저장한 우주가 없어요. 시뮬레이션을 돌린 뒤 위 버튼으로 저장하면 여기 모여요.
          </Caption>
        </Card>
      ) : (
        <div className="mt-1">
          {items.map((u) => (
            <UniverseCard
              key={u.id}
              u={u}
              onReopen={() => reopen(u)}
              onResim={() => resim(u)}
              onDecide={(d) => {
                updateUniverse(u.id, { decision: d });
                refresh();
              }}
              onToggleAction={(t) => {
                const done = u.doneActions || [];
                const next = done.includes(t) ? done.filter((x) => x !== t) : [...done, t];
                updateUniverse(u.id, { doneActions: next });
                refresh();
              }}
              onSaveNote={(t) => {
                updateUniverse(u.id, { reflection: t });
                refresh();
              }}
              onDelete={() => {
                removeUniverse(u.id);
                refresh();
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const ACCENT = { cyan: "#8B6CCF", gold: "#F5C86B", violet: "#8B6CCF" };
function DecBtn({ on, onClick, children, accent }) {
  const col = ACCENT[accent] || "#8B6CCF";
  return (
    <button
      onClick={onClick}
      className={`tap flex-1 rounded-xl border px-2 py-2 text-[11px] font-semibold transition-colors ${
        on ? "bg-[#1D1730]" : "border-line bg-[#0E1424] text-sub"
      }`}
      style={on ? { borderColor: col, color: col } : undefined}
    >
      {children}
    </button>
  );
}

function UniverseCard({ u, onReopen, onResim, onDecide, onToggleAction, onSaveNote, onDelete }) {
  const [note, setNote] = useState(u.reflection ?? "");
  const [editing, setEditing] = useState(false);
  const chosen = chosenChoice(u);
  const actions = chosen ? actionsFor(chosen) : [];
  const done = u.doneActions || [];

  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] tracking-wide text-mut">{u.savedAt}</div>
          <div className="mt-1 text-[15px] font-semibold">{u.title}</div>
        </div>
        <button onClick={onDelete} className="tap shrink-0 text-[11px] text-mut">
          삭제
        </button>
      </div>

      {u.headline && <p className="mt-2 text-[13px] leading-relaxed text-sub">{u.headline}</p>}

      {/* 결정: A / 보류 / B */}
      <div className="mt-3">
        <div className="mb-1.5 text-[11px] text-mut">이 갈림길, 지금 마음은?</div>
        <div className="flex gap-1.5">
          <DecBtn on={u.decision === "A"} accent="cyan" onClick={() => onDecide("A")}>
            {u.choiceA}
          </DecBtn>
          <DecBtn on={!u.decision || u.decision === "none"} accent="gold" onClick={() => onDecide("none")}>
            아직 보류
          </DecBtn>
          <DecBtn on={u.decision === "B"} accent="violet" onClick={() => onDecide("B")}>
            {u.choiceB}
          </DecBtn>
        </div>
      </div>

      {/* 선택했으면: 오늘 할 일(Action Bridge) */}
      {chosen && (
        <div className="mt-3 rounded-xl border border-line bg-[#0E1424] p-3">
          <div className="mb-2 text-[11px] font-bold text-cyan">
            🌱 "{chosen}"을(를) 향한 오늘 할 일
          </div>
          <div className="space-y-1">
            {actions.map((action) => {
              const t = action.text;
              const ok = done.includes(t);
              return (
                <button
                  key={t}
                  onClick={() => onToggleAction(t)}
                  className="tap flex w-full items-start gap-2 py-1 text-left text-[12px]"
                >
                  <span
                    className={`mt-[1px] flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] ${
                      ok ? "border-cyan bg-cyan text-[#04203a]" : "border-line text-transparent"
                    }`}
                  >
                    ✓
                  </span>
                  <span className={ok ? "text-mut line-through" : "text-sub"}>{t}</span>
                </button>
              );
            })}
          </div>
          <Caption>완료 체크는 저장돼요. 매일 하나씩이면 충분해요.</Caption>
        </div>
      )}

      {/* 결과후반응 — 회고 */}
      <div className="mt-3 rounded-xl border border-line bg-[#0E1424] p-3">
        <div className="mb-1.5 text-[11px] font-bold text-gold">그 후 어떻게 됐나요?</div>
        {editing ? (
          <textarea
            autoFocus
            value={note}
            rows={3}
            onChange={(e) => setNote(e.target.value)}
            onBlur={() => {
              setEditing(false);
              onSaveNote(note);
            }}
            placeholder="그때의 선택을 지금 돌아보면… (회고·감정 기록)"
            className="w-full resize-none rounded-lg border border-line bg-bg px-2.5 py-2 text-[13px] text-ink outline-none focus:border-cyan"
          />
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="tap w-full text-left text-[13px] leading-relaxed"
          >
            {note ? (
              <span className="text-sub">{note}</span>
            ) : (
              <span className="text-mut">＋ 회고를 남겨보세요 (아직 비어 있음)</span>
            )}
          </button>
        )}
      </div>

      <div className="mt-3 flex gap-2">
        <button
          onClick={onReopen}
          className="tap flex-1 rounded-full border border-line px-3 py-1.5 text-[11px] text-sub"
        >
          다시 보기
        </button>
        <button
          onClick={onResim}
          className="tap flex-1 rounded-full border border-line px-3 py-1.5 text-[11px] text-cyan"
        >
          다시 시뮬레이션
        </button>
      </div>
    </Card>
  );
}
