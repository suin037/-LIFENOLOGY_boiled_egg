import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LineChart, Line, YAxis, XAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Eyebrow, Card, Caption } from "../components/ui.jsx";
import { useDiary, SIM_LOG, moodEmoji } from "../data/DiaryContext.jsx";

export default function Archive() {
  return (
    <div>
      <Eyebrow>ARCHIVE · 지난 평행우주</Eyebrow>
      <h1 className="mb-1 text-[22px] font-bold leading-[1.25]">내가 열어본 우주들</h1>
      <Caption>선택했던 갈림길과, 그 이후 당신의 감정 궤적을 함께 봅니다.</Caption>

      <div className="mt-4">
        {SIM_LOG.map((sim) => (
          <SimCard key={sim.id} sim={sim} />
        ))}
      </div>
    </div>
  );
}

function SimCard({ sim }) {
  const navigate = useNavigate();
  const { entriesSince, daysSince } = useDiary();
  const [open, setOpen] = useState(false);

  const entries = entriesSince(sim.date);
  const data = entries.map((e) => ({ date: e.date.slice(5), mood: e.mood }));

  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] tracking-wide text-mut">
            {sim.label} · {sim.date} · D+{daysSince(sim.date)}
          </div>
          <div className="mt-1 text-[15px] font-semibold">{sim.title}</div>
          <div className="text-xs text-sub">{sim.branch}</div>
        </div>
        <button
          onClick={() => navigate("/result")}
          className="tap shrink-0 rounded-full border border-line px-3 py-1.5 text-[11px] text-sub"
        >
          다시 보기
        </button>
      </div>

      <p className="mt-2.5 text-[13px] leading-relaxed text-sub">{sim.headline}</p>

      {/* 이 선택 이후의 감정 궤적 */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="tap mt-3 flex w-full items-center justify-between rounded-xl border border-line bg-[#0E1424] px-3 py-2.5 text-[12px]"
      >
        <span className="font-bold text-gold">📈 이 선택 이후의 감정 궤적</span>
        <span className="text-mut">{open ? "접기" : `${entries.length}개 기록 ▾`}</span>
      </button>

      {open && (
        <div className="mt-2">
          {data.length >= 2 ? (
            <>
              <div className="h-[110px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data} margin={{ top: 8, right: 8, left: -28, bottom: 0 }}>
                    <YAxis domain={[1, 5]} tick={false} axisLine={false} tickLine={false} width={0} />
                    <XAxis dataKey="date" tick={{ fill: "#5A6B8C", fontSize: 9 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                    <Tooltip
                      contentStyle={{ background: "#141B2E", border: "1px solid #28324D", borderRadius: 10, fontSize: 12, color: "#EAF0FB" }}
                      formatter={(v) => [`${moodEmoji(v)} ${v}/5`, "기분"]}
                    />
                    <Line type="monotone" dataKey="mood" stroke="#F5C86B" strokeWidth={2} dot={{ r: 2.5, fill: "#F5C86B" }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <Caption>선택 이후 당신의 주관적 기분(1~5). 선택의 인과 결과가 아니라 당신의 기록입니다.</Caption>

              <div className="mt-2 space-y-1.5">
                {entries.slice(-5).reverse().map((e) => (
                  <div key={e.id} className="flex gap-2 text-[12px]">
                    <span>{moodEmoji(e.mood)}</span>
                    <span className="text-mut">{e.date.slice(5)}</span>
                    <span className="text-sub">{e.text}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <Caption>아직 이 선택 이후 기록이 부족해요. 홈에서 오늘 기록을 남겨보세요.</Caption>
          )}
        </div>
      )}
    </Card>
  );
}
