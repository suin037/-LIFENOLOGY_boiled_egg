import Avatar from "./Avatar.jsx";
import {
  SKINS,
  HAIR_COLORS,
  HAIR_STYLES,
  GLASSES,
  BACKGROUNDS,
  DEFAULT_AVATAR,
} from "../data/avatarOptions.js";

function Swatch({ color, on, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ background: color }}
      className={`tap h-7 w-7 rounded-full ${
        on ? "ring-2 ring-cyan ring-offset-2 ring-offset-[#0E1424]" : "border border-line"
      }`}
    />
  );
}

function Chip({ label, on, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`tap rounded-full border px-3 py-1.5 text-[12px] ${
        on ? "border-cyan bg-[#12203a] text-cyan" : "border-line bg-[#0E1424] text-sub"
      }`}
    >
      {label}
    </button>
  );
}

function Group({ label, children }) {
  return (
    <div className="mt-3">
      <div className="mb-1.5 text-[11px] text-sub">{label}</div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

export default function AvatarBuilder({ config, onChange }) {
  const c = { ...DEFAULT_AVATAR, ...(config || {}) };
  const set = (patch) => onChange({ ...c, ...patch });

  return (
    <div>
      <div className="flex items-center gap-3">
        <Avatar config={c} size={92} />
        <p className="text-[11px] leading-relaxed text-mut">
          피부·머리·안경·배경을 골라 나만의 아바타를 만들어요.
          <br />
          평행우주 A/B도 이 아바타로 그려집니다.
        </p>
      </div>

      <Group label="피부톤">
        {SKINS.map((s) => (
          <Swatch key={s} color={s} on={c.skin === s} onClick={() => set({ skin: s })} />
        ))}
      </Group>

      <Group label="머리 스타일">
        {HAIR_STYLES.map((h) => (
          <Chip key={h.id} label={h.label} on={c.hair === h.id} onClick={() => set({ hair: h.id })} />
        ))}
      </Group>

      <Group label="머리색">
        {HAIR_COLORS.map((h) => (
          <Swatch key={h} color={h} on={c.hairColor === h} onClick={() => set({ hairColor: h })} />
        ))}
      </Group>

      <Group label="안경">
        {GLASSES.map((g) => (
          <Chip key={g.id} label={g.label} on={c.glasses === g.id} onClick={() => set({ glasses: g.id })} />
        ))}
      </Group>

      <Group label="배경">
        {BACKGROUNDS.map((b) => (
          <Swatch key={b.id} color={b.stops[0]} on={c.bg === b.id} onClick={() => set({ bg: b.id })} />
        ))}
      </Group>
    </div>
  );
}
