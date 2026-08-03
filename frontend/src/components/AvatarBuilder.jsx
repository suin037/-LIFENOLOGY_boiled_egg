import Avatar from "./Avatar.jsx";
import {
  HAIR_PRESETS, FACE_PRESETS, ACC_PRESETS, OUTFIT_PRESETS, BG_COLORS,
  normalizeAvatar,
} from "../data/avatarOptions.js";

function Arrow({ dir, onClick }) {
  return (
    <button type="button" onClick={onClick} aria-label={dir < 0 ? "이전" : "다음"}
      className="tap flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line bg-card2 text-[16px] text-cyan active:scale-95">
      {dir < 0 ? "‹" : "›"}
    </button>
  );
}

function PresetStepper({ label, presets, config, onChange }) {
  let i = presets.findIndex((p) => Object.entries(p.cfg).every(([k, v]) => config[k] === v));
  if (i < 0) i = 0;
  const cur = presets[i];
  const go = (d) => onChange({ ...config, ...presets[(i + d + presets.length) % presets.length].cfg });
  return (
    <div className="mt-2.5 flex items-center gap-2 rounded-2xl border border-line bg-[#0B1423] px-3 py-2">
      <div className="w-14 shrink-0 text-[12px] font-semibold text-sub">{label}</div>
      <Arrow dir={-1} onClick={() => go(-1)} />
      <div className="flex-1 text-center">
        <div className="text-[12px] font-medium text-ink">{cur.label}</div>
        <div className="text-[9px] text-mut">{i + 1} / {presets.length}</div>
      </div>
      <Arrow dir={1} onClick={() => go(1)} />
    </div>
  );
}

function ColorStepper({ label, colors, value, onChange }) {
  let i = colors.indexOf(value);
  if (i < 0) i = 0;
  const go = (d) => onChange(colors[(i + d + colors.length) % colors.length]);
  return (
    <div className="mt-2.5 flex items-center gap-2 rounded-2xl border border-line bg-[#0B1423] px-3 py-2">
      <div className="w-14 shrink-0 text-[12px] font-semibold text-sub">{label}</div>
      <Arrow dir={-1} onClick={() => go(-1)} />
      <div className="flex flex-1 items-center justify-center gap-2">
        <span className="h-6 w-6 rounded-full border border-line" style={{ background: colors[i] }} />
        <span className="text-[9px] text-mut">{i + 1} / {colors.length}</span>
      </div>
      <Arrow dir={1} onClick={() => go(1)} />
    </div>
  );
}

export default function AvatarBuilder({ config, onChange }) {
  const c = normalizeAvatar(config);
  return (
    <div>
      <div className="mb-3 flex flex-col items-center">
        <Avatar config={c} size={132} />
        <p className="mt-2 text-[10px] text-mut">화살표로 넘겨 나만의 아바타를 만들어보세요.</p>
      </div>
      <PresetStepper label="머리" presets={HAIR_PRESETS} config={c} onChange={onChange} />
      <PresetStepper label="얼굴" presets={FACE_PRESETS} config={c} onChange={onChange} />
      <PresetStepper label="액세서리" presets={ACC_PRESETS} config={c} onChange={onChange} />
      <PresetStepper label="의상" presets={OUTFIT_PRESETS} config={c} onChange={onChange} />
      <ColorStepper label="배경" colors={BG_COLORS} value={c.bgColor}
        onChange={(v) => onChange({ ...c, bgColor: v })} />
    </div>
  );
}
