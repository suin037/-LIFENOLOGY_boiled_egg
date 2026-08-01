import { Card, Caption } from "../ui.jsx";

// 행동 — 심리 이론카드 기반 "오늘 할 수 있는 행동" (lanollab RAG 근거).
// 조언/추천이 아니라, 검증된 심리학 근거에서 나온 행동 후보 + 출처.
export default function ActionView({ a }) {
  const cards = a.action_cards || [];
  return (
    <div>
      <h2 className="mb-1 mt-1 text-base font-semibold">오늘 할 수 있는 행동</h2>
      <Caption>정답을 권하지 않습니다. 심리학 이론이 제안하는, 지금 해볼 만한 작은 행동입니다.</Caption>

      <div className="mt-3 space-y-3">
        {cards.map((c, i) => (
          <Card key={i}>
            <div className="text-[13px] font-bold text-cyan">{c.concept}</div>
            <div className="mb-1.5 text-[10px] text-mut">{c.theory}</div>
            <p className="text-[13px] leading-relaxed text-sub">{c.summary}</p>
            <ul className="mt-2 space-y-1.5">
              {c.interventions.map((it, j) => (
                <li key={j} className="flex gap-2 text-[13px] text-ink">
                  <span className="text-cyan">✦</span>
                  <span>{it}</span>
                </li>
              ))}
            </ul>
            <Caption>출처: {c.source}</Caption>
          </Card>
        ))}
      </div>
    </div>
  );
}
