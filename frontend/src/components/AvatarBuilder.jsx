import Avatar from "./Avatar.jsx";
import {
  AXES, COLOR_AXES, TOONHEAD_CREDIT, normalizeAvatar, randomAvatar,
} from "../data/avatarOptions.js";

function Arrow({ dir, onClick, label }) {
  return (
    <button type="button" onClick={onClick} aria-label={label}
      className="tap flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-violet-400/25 bg-violet-500/10 text-[15px] text-violet-400 active:scale-95">
      {dir < 0 ? "‹" : "›"}
    </button>
  );
}

// 파츠 하나를 좌우로 넘긴다. nullable 축(수염)은 목록 맨 앞에 "없음"이 붙는다.
function AxisStepper({ axis, config, onChange }) {
  const list = axis.nullable ? [{ id: null, label: "없음" }, ...axis.values] : axis.values;
  const i = Math.max(0, list.findIndex((v) => v.id === config[axis.key]));
  const go = (d) => onChange({ ...config, [axis.key]: list[(i + d + list.length) % list.length].id });
  return (
    <div className="mt-2 flex items-center gap-2 rounded-2xl border border-line bg-[#0B1423] px-3 py-1.5">
      <div className="w-16 shrink-0 text-[12px] font-semibold text-sub">{axis.label}</div>
      <Arrow dir={-1} onClick={() => go(-1)} label={`${axis.label} 이전`} />
      <div className="flex-1 text-center">
        <div className="text-[11px] font-medium text-ink">{list[i].label}</div>
        <div className="text-[9px] text-mut">{i + 1} / {list.length}</div>
      </div>
      <Arrow dir={1} onClick={() => go(1)} label={`${axis.label} 다음`} />
    </div>
  );
}

// 색은 개수가 적어 한눈에 보이므로 스와치로 직접 고르게 한다.
function ColorRow({ axis, config, onChange }) {
  return (
    <div className="mt-2 flex items-center gap-2 rounded-2xl border border-line bg-[#0B1423] px-3 py-2">
      <div className="w-16 shrink-0 text-[12px] font-semibold text-sub">{axis.label}</div>
      <div className="flex flex-1 flex-wrap gap-1.5">
        {axis.values.map((v) => {
          const on = config[axis.key] === v;
          return (
            <button
              key={v}
              type="button"
              aria-label={`${axis.label} #${v}`}
              aria-pressed={on}
              onClick={() => onChange({ ...config, [axis.key]: v })}
              className={`tap h-6 w-6 rounded-full border-2 active:scale-90 ${
                on ? "border-violet-400" : "border-line"
              }`}
              style={{ background: `#${v}` }}
            />
          );
        })}
      </div>
    </div>
  );
}

export default function AvatarBuilder({ config, onChange }) {
  const c = normalizeAvatar(config);
  return (
    <div>
      <div className="mb-3 flex flex-col items-center">
        <Avatar config={c} size={132} />
        <button
          type="button"
          onClick={() => onChange(randomAvatar())}
          className="tap mt-2 rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1 text-[11px] font-semibold text-violet-300"
        >
          🎲 랜덤으로 뽑기
        </button>
        <p className="mt-1.5 text-[10px] text-mut">화살표로 파츠를 넘겨 나만의 아바타를 만들어보세요.</p>
      </div>

      {AXES.map((axis) => (
        <AxisStepper key={axis.key} axis={axis} config={c} onChange={onChange} />
      ))}
      {COLOR_AXES.map((axis) => (
        <ColorRow key={axis.key} axis={axis} config={c} onChange={onChange} />
      ))}

      {/* CC BY 4.0 은 원저작자 표기가 의무다. 개작한 사실도 함께 밝힌다. */}
      <p className="mt-2 text-[9px] leading-relaxed text-mut">
        {TOONHEAD_CREDIT.title} by {TOONHEAD_CREDIT.creator} ·{" "}
        <a href={TOONHEAD_CREDIT.licenseUrl} target="_blank" rel="noreferrer" className="underline">
          {TOONHEAD_CREDIT.license}
        </a>{" "}
        · 원저작물에서 일부 파츠를 추가·변경했습니다
      </p>
    </div>
  );
}
