import { useEffect, useState } from "react";
import { Sparkles, Search } from "lucide-react";
import { fetchSuggestion, getTodaySuggestion, suggestMaterials } from "../data/suggestApi.js";
import { loadSpeech } from "../data/dispositionApi.js";

// 오늘 해볼 만한 것 — 최근 2주 기록을 보고 작게 권한다.
//  · 몸 / 듣기 / 해보기 / 쉬기 / 사람 으로 결을 나눠 세 개.
//  · 기록이 많이 무거운 날엔 권하지 않고, 아무것도 안 해도 된다고만 말한다.
const KIND_STYLE = {
  move: { color: "#5DCAA5", icon: "🏃" },
  listen: { color: "#8FB4F0", icon: "🎧" },
  try: { color: "#EDA100", icon: "✦" },
  rest: { color: "#B79BF0", icon: "🌙" },
  meet: { color: "#F0918D", icon: "🫂" },
};

export default function DailySuggest() {
  const [data, setData] = useState(getTodaySuggestion);
  const [busy, setBusy] = useState(false);
  const mat = suggestMaterials();

  // 오늘 것이 없으면 한 번만 만든다(하루 1회 — 들어올 때마다 부르면 말이 계속 바뀐다).
  useEffect(() => {
    if (data || !mat.ready) return;
    let alive = true;
    setBusy(true);
    fetchSuggestion({ speech: loadSpeech() })
      .then((r) => { if (alive) setData(r); })
      .finally(() => { if (alive) setBusy(false); });
    return () => { alive = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!mat.ready) return null;          // 기록이 없으면 아예 띄우지 않는다
  if (busy && !data) {
    return (
      <div className="mt-4 rounded-[18px] border border-line bg-[#141b2e] px-4 py-3 text-[11px] text-mut">
        최근 기록을 보고 오늘 해볼 만한 걸 고르는 중…
      </div>
    );
  }
  if (!data) return null;

  // 무거운 날 — 할 일 대신 그 말만 남긴다.
  if (data.care) {
    return (
      <div className="mt-4 rounded-[18px] border border-[#8B6CCF]/30 bg-[#161029] px-4 py-3.5">
        <p className="text-[12px] leading-relaxed text-sub">{data.reason}</p>
      </div>
    );
  }
  if (!data.ok) return null;

  return (
    <div className="mt-4 rounded-[18px] border border-line bg-[#141b2e] p-4">
      <div className="mb-2 flex items-center gap-1.5">
        <Sparkles size={14} className="text-[#EDA100]" />
        <span className="text-[12.5px] font-semibold text-ink">오늘 이런 건 어때요</span>
      </div>

      <div className="space-y-2">
        {data.items.map((it, i) => {
          const st = KIND_STYLE[it.kind] || KIND_STYLE.try;
          return (
            <div key={i} className="rounded-xl border border-white/[.06] bg-black/20 p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[12px] font-semibold text-ink">
                  <span className="mr-1.5">{st.icon}</span>{it.title}
                </p>
                <span
                  className="shrink-0 rounded-full px-2 py-0.5 text-[9px]"
                  style={{ color: st.color, background: `${st.color}1A` }}
                >
                  {it.kindLabel}
                </span>
              </div>
              {it.why && <p className="mt-1 text-[10.5px] leading-relaxed text-sub">{it.why}</p>}
              {it.how && <p className="mt-1 text-[10.5px] leading-relaxed text-mut">→ {it.how}</p>}
              {it.search && (
                <a
                  href={`https://www.google.com/search?q=${encodeURIComponent(it.search)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="tap mt-1.5 inline-flex items-center gap-1 text-[10px] text-cyan"
                >
                  <Search size={11} /> {it.search}
                </a>
              )}
            </div>
          );
        })}
      </div>

      {/* 음악·취미는 붙은 데이터가 없어 모델이 아는 선에서 고른다 — 그걸 숨기지 않는다. */}
      <p className="mt-2 text-[9px] leading-relaxed text-mut">
        내 기록을 보고 고른 거예요. 곡·모임처럼 실제로 있는지 확인이 필요한 건 검색으로 한 번 봐주세요.
      </p>
    </div>
  );
}
