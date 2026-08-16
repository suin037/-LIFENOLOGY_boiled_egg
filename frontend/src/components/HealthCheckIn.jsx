import { useState } from "react";
import { Card, Caption, Eyebrow } from "./ui.jsx";

// ─────────────────────────────────────────────────────────────
// 건강상태 입력 창 — 데일리 체크인에 끼우는 '몸·마음 상태' 섹션.
// ⚠ 관할: jy 저작(복사해 통합 브랜치 DiaryCheckIn 에 넣는 컴포넌트).
//
// 필드 id·척도는 diary_module/qmode/health_input.py 의 PANEL/_SCALE 과 1:1.
//   → 여기서 만든 payload 를 그대로 process_health(inputs) 에 넘기면 또래 병치·
//     안전게이트·서사 재료가 공짜로 동작한다. (키가 어긋나면 무시되니 반드시 일치)
//
// 원칙(health_input.py 준수): 진단 아님. 빈도·정도로만. 임상항목은 부드럽게.
// ─────────────────────────────────────────────────────────────

// health_input.py PANEL 미러. scale: good5/bad5/freq4/days8
const PANEL = [
  { id: "sleep", scale: "good5", label: "최근 2주, 밤잠은 어땠나요?" },
  { id: "subjective_health", scale: "good5", label: "요즘 몸 컨디션은 어떤가요?" },
  { id: "exercise_days", scale: "days8", label: "지난 한 주, 몸을 움직인 날은 며칠?" },
  { id: "stress", scale: "bad5", label: "요즘 스트레스를 얼마나 느끼나요?" },
  // 임상 민감 — 진단 아님, 빈도만.
  { id: "low_mood", scale: "freq4", label: "최근 2주, 가라앉거나 무기력했던 날은?", clinical: true },
  { id: "anxious", scale: "freq4", label: "최근 2주, 불안·초조했던 날은?", clinical: true },
  // 청년(≤34) 전용
  { id: "burnout", scale: "bad5", label: "요즘 번아웃(소진)된 느낌이 있나요?", youthOnly: true },
  { id: "loneliness", scale: "bad5", label: "요즘 외로움을 느끼나요?", youthOnly: true },
];

// _SCALE 미러 — 눈금 라벨.
const SCALE = {
  good5: { vals: [1, 2, 3, 4, 5], words: ["매우 나쁨", "나쁨", "보통", "좋음", "매우 좋음"] },
  bad5: { vals: [1, 2, 3, 4, 5], words: ["거의 없음", "약간", "보통", "심함", "매우 심함"] },
  freq4: { vals: [0, 1, 2, 3], words: ["전혀 없음", "며칠", "절반 이상", "거의 매일"] },
  days8: { vals: [0, 1, 2, 3, 4, 5, 6, 7], words: null }, // 숫자 그대로
};

function Chips({ scale, value, onPick }) {
  const s = SCALE[scale];
  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {s.vals.map((v, i) => {
        const on = value === v;
        return (
          <button
            key={v}
            type="button"
            onClick={() => onPick(on ? null : v)}
            className={`tap rounded-full border px-2.5 py-1 text-[11px] ${
              on ? "border-cyan bg-card2 text-ink" : "border-line text-sub"
            }`}
          >
            {s.words ? s.words[i] : `${v}일`}
          </button>
        );
      })}
    </div>
  );
}

/**
 * @param {object}   value     현재 health 값 { sleep, stress, ..., sleep_hours, steps }
 * @param {function} onChange  (nextHealth) => void
 * @param {boolean}  isYouth   청년(≤34) 여부 — false 면 번아웃·외로움 숨김
 */
export default function HealthCheckIn({ value = {}, onChange, isYouth = true }) {
  const [open, setOpen] = useState(false);
  const set = (id, v) => onChange({ ...value, [id]: v });

  const items = PANEL.filter((p) => !p.youthOnly || isYouth);
  const answered = items.filter((p) => value[p.id] != null).length;

  if (!open) {
    return (
      <Card>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="tap flex w-full items-center justify-between"
        >
          <span className="text-xs font-bold text-cyan">몸·마음 상태 기록하기 ＋</span>
          <span className="text-[11px] text-mut">{answered ? `${answered}개 기록됨` : "선택"}</span>
        </button>
        <Caption>또래 통계와 나란히 보여주는 데만 써요. 진단이 아니에요.</Caption>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center justify-between">
        <Eyebrow>몸 · 마음 상태</Eyebrow>
        <button type="button" onClick={() => setOpen(false)} className="tap text-[11px] text-mut">
          접기
        </button>
      </div>

      {items.map((p) => (
        <div key={p.id} className="mt-3">
          <div className="text-[13px] text-sub">{p.label}</div>
          <Chips scale={p.scale} value={value[p.id] ?? null} onPick={(v) => set(p.id, v)} />
        </div>
      ))}

      {/* 객관 수치 — 선택. 별/별자리·추세용. (report 는 아직 미소비: health_input.py PANEL 밖) */}
      <div className="mt-4 border-t border-line pt-3">
        <Eyebrow>정확히 기록 (선택)</Eyebrow>
        <div className="mt-1.5 flex gap-2">
          <label className="flex-1 text-[11px] text-sub">
            수면 시간(h)
            <input
              type="number" step="0.5" min="0" max="24"
              value={value.sleep_hours ?? ""}
              onChange={(e) => set("sleep_hours", e.target.value === "" ? null : Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-line bg-card px-2 py-1 text-ink"
            />
          </label>
          <label className="flex-1 text-[11px] text-sub">
            걸음수
            <input
              type="number" min="0" step="100"
              value={value.steps ?? ""}
              onChange={(e) => set("steps", e.target.value === "" ? null : Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-line bg-card px-2 py-1 text-ink"
            />
          </label>
        </div>
      </div>

      {items.some((p) => p.clinical && value[p.id] != null) && (
        <Caption>가라앉음·불안은 진단이 아니라 요즘 상태를 기록하는 거예요. 힘들면 언제든 도움을 받을 수 있어요.</Caption>
      )}
    </Card>
  );
}
