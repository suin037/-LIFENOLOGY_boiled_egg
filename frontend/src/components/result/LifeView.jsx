import { Card, Caption } from "../ui.jsx";
import { LIFE_DIMENSIONS, labelOf } from "../../data/prediction.js";
import ObservedIndicators from "./ObservedIndicators.jsx";

// 생활지표(L1) — 공통 지표는 한 번, 선택지별 지표는 A/B 태그로.
const DOMAIN_MATCH = {
  career: ["경제", "직업환경", "고용", "임금", "업무"],
  education: ["진학/취업", "취업률", "진학률", "교육"],
  business: ["창업", "생존율", "폐업"],
  finance: ["경제", "소득", "임금"],
  health: ["정신건강", "신체건강", "스트레스", "우울", "불안", "수면", "번아웃"],
  housing: ["주거", "주택", "월세", "전세"],
  relationship: ["관계", "외로움", "사회적"],
  lifestyle: ["삶의질", "행복", "만족", "번아웃", "업무스트레스", "수면"],
  long_term_values: ["삶의질", "계층 상승", "장래", "성장"],
};

export default function LifeView({ a, b, domains = { a: [], b: [] } }) {
  const key = (it) => it.indicator;
  const bKeys = new Set(b.life_indicators.map(key));
  const aKeys = new Set(a.life_indicators.map(key));

  const selectedDomains = [...new Set([...(domains.a || []), ...(domains.b || [])])];
  const matches = (it) => {
    if (!selectedDomains.length) return true;
    const haystack = `${it.dimension} ${it.indicator}`;
    return selectedDomains.some((domain) => (DOMAIN_MATCH[domain] || []).some((word) => haystack.includes(word)));
  };
  const shared = a.life_indicators.filter((it) => bKeys.has(key(it)) && matches(it)).slice(0, 5);
  const extraA = a.life_indicators.filter((it) => !bKeys.has(key(it)) && matches(it)).slice(0, 3);
  const extraB = b.life_indicators.filter((it) => !aKeys.has(key(it)) && matches(it)).slice(0, 3);
  const empty = !shared.length && !extraA.length && !extraB.length;

  return (
    <div>
      {(a.indicator_evidence || b.indicator_evidence) && <EvidenceSummary a={a} b={b} />}
      <ObservedIndicators a={a} b={b} />
      <h2 className="mb-1 mt-1 text-base font-semibold">이 선택과 관련된 핵심 지표</h2>
      <div className="mt-3 space-y-2.5">
        {empty && <Card><Caption>선택한 삶의 영역에 연결된 수치 데이터가 아직 충분하지 않습니다. 임의 점수는 만들지 않았어요.</Caption></Card>}
        {shared.map((it, i) => <Indicator key={`s${i}`} it={it} />)}
        {extraA.map((it, i) => <Indicator key={`a${i}`} it={it} tag={`A · ${labelOf(a.choice)}`} tagColor="#8B6CCF" />)}
        {extraB.map((it, i) => <Indicator key={`b${i}`} it={it} tag={`B · ${labelOf(b.choice)}`} tagColor="#F5C86B" />)}
      </div>
    </div>
  );
}

const EVIDENCE_LABEL = {
  directional_evidence: "방향 근거 있음",
  matched_observation: "유사 사례 관측 근거",
  insufficient_evidence: "근거 부족",
  reference_only: "참고 통계만",
  user_provided_state: "현재 상태 입력",
};

function EvidenceSummary({ a, b }) {
  const keys = ["경제적안정도", "성장가능성", "삶의질"];
  return (
    <Card className="mb-4">
      <div className="text-sm font-semibold text-ink">예측 근거 상태</div>
      <Caption>현재 모델이 실제로 검증한 범위를 표시합니다.</Caption>
      <div className="mt-3 space-y-2">
        {keys.map((key) => {
          const left = a.indicator_evidence?.[key];
          const right = b.indicator_evidence?.[key];
          if (!left && !right) return null;
          return (
            <div key={key} className="rounded-xl border border-line bg-bg/40 px-3 py-2.5">
              <div className="mb-1 text-xs font-semibold text-ink">{key}</div>
              <EvidenceSide label="A" item={left} />
              <EvidenceSide label="B" item={right} />
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function EvidenceSide({ label, item }) {
  if (!item) return null;
  const effect = typeof item.effect === "number"
    ? ` · 집단 평균 ${item.effect >= 0 ? "+" : ""}${item.effect.toFixed(1)}%p`
    : "";
  return (
    <div className="mt-1 text-[11px] leading-5 text-sub">
      <span className="mr-1 font-semibold text-ink">{label}</span>
      <span>{EVIDENCE_LABEL[item.status] || item.status}</span>{effect}
      {item.reason && <div className="pl-4 text-[10px] text-mut">{item.reason}</div>}
    </div>
  );
}

function Indicator({ it, tag, tagColor }) {
  const meta = LIFE_DIMENSIONS[it.dimension] || { icon: "•", color: "#8B6CCF" };
  return (
    <div className="rounded-2xl border border-line bg-card p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-base">{meta.icon}</span>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px]" style={{ color: meta.color }}>{it.dimension}</span>
              {tag && (
                <span className="rounded px-1 py-0.5 text-[9px] font-bold" style={{ color: tagColor, background: "#0E1424" }}>
                  {tag}
                </span>
              )}
            </div>
            <div className="text-[13px] text-ink">{it.indicator}</div>
          </div>
        </div>
        <div className="whitespace-nowrap text-right">
          <span className="text-lg font-bold text-ink">{it.value}</span>
          <span className="ml-0.5 text-[11px] text-sub">{it.unit}</span>
        </div>
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[10px] text-mut">
        <span>{it.group}</span>
        <span>{it.n ? `n=${it.n.toLocaleString()}` : ""}</span>
      </div>
    </div>
  );
}
