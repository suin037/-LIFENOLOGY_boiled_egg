import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eyebrow, Card, Caption } from "../components/ui.jsx";
import { MOCK_ARCHIVE } from "../data/result.js";

export default function Archive() {
  return (
    <div>
      <Eyebrow>ARCHIVE · 지난 평행우주</Eyebrow>
      <h1 className="mb-1 text-[22px] font-bold leading-[1.25]">내가 열어본 우주들</h1>
      <Caption>선택했던 갈림길과, 그 후의 기록을 모아둡니다.</Caption>

      <div className="mt-4">
        {MOCK_ARCHIVE.map((item) => (
          <ArchiveCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

function ArchiveCard({ item }) {
  const navigate = useNavigate();
  const [note, setNote] = useState(item.reflection ?? "");
  const [editing, setEditing] = useState(false);

  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] tracking-wide text-mut">
            No.{item.id} · {item.date}
          </div>
          <div className="mt-1 text-[15px] font-semibold">{item.title}</div>
          <div className="text-xs text-sub">{item.branch}</div>
        </div>
        <button
          onClick={() => navigate("/result")}
          className="tap shrink-0 rounded-full border border-line px-3 py-1.5 text-[11px] text-sub"
        >
          다시 보기
        </button>
      </div>

      <p className="mt-2.5 text-[13px] leading-relaxed text-sub">{item.headline}</p>

      {/* "그 후 어떻게 됐나요?" 회고/감정 기록 (placeholder) */}
      <div className="mt-3 rounded-xl border border-line bg-[#0E1424] p-3">
        <div className="mb-1.5 text-[11px] font-bold text-gold">그 후 어떻게 됐나요?</div>
        {editing ? (
          <textarea
            autoFocus
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={() => setEditing(false)}
            rows={3}
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
    </Card>
  );
}
