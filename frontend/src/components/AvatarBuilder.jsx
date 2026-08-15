import Avatar from "./Avatar.jsx";
import {
  BEARD,
  BROW_SHAPE_ITEMS,
  BROW_THICKNESS,
  CLOTHES,
  CLOTHES_COLORS,
  EYES,
  GLASSES_OPTIONS,
  HAIR_COLORS,
  HAIR_STYLES,
  MOUTH,
  SKIN_COLORS,
  TOONHEAD_CREDIT,
  normalizeAvatar,
} from "../data/avatarOptions.js";
import { FACE_SHAPES } from "../data/customParts.js";

// 기존 화면들이 쓰던 그대로의 API: <AvatarBuilder config={...} onChange={fn} />
// 온보딩·설정 양쪽에서 그대로 쓰이므로 화면(제목·진행바·CTA)은 여기 넣지 않는다.

function Arrow({ dir, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${label} ${dir < 0 ? "이전" : "다음"}`}
      className="tap flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-violet-400/25 bg-violet-500/10 text-[16px] text-violet-400 active:scale-95"
    >
      {dir < 0 ? "‹" : "›"}
    </button>
  );
}

/** 라벨 · ‹ 값 n/N › 한 줄. 끝에서 반대편으로 순환한다. */
function Stepper({ label, items, value, onPick, swatch = false }) {
  const found = items.findIndex((i) => i.id === value);
  const at = found < 0 ? 0 : found;
  const go = (d) => onPick(items[(at + d + items.length) % items.length].id);
  const cur = items[at];

  return (
    <div className="mt-2.5 flex items-center gap-2 rounded-2xl border border-line bg-[#0B1423] px-3 py-2">
      <div className="w-14 shrink-0 text-[12px] font-semibold text-sub">{label}</div>
      <Arrow dir={-1} onClick={() => go(-1)} label={label} />
      <div className="flex flex-1 items-center justify-center gap-2">
        {swatch && (
          <span
            className="h-6 w-6 shrink-0 rounded-full border border-line"
            style={{ background: "#" + cur.id }}
          />
        )}
        {!swatch && (
          <div className="text-center">
            <div className={`text-[12px] font-medium ${cur.id == null ? "text-mut" : "text-ink"}`}>
              {cur.label}
            </div>
          </div>
        )}
        <div className="text-[9px] text-mut">
          {at + 1} / {items.length}
        </div>
      </div>
      <Arrow dir={1} onClick={() => go(1)} label={label} />
    </div>
  );
}

const NONE = (label = "없음") => ({ id: null, label });
const FACE_ITEMS = Object.entries(FACE_SHAPES).map(([id, f]) => ({ id, label: f.label }));
const colorItems = (hexes) => hexes.map((h, i) => ({ id: h, label: `${i + 1}번` }));

export default function AvatarBuilder({ config, onChange }) {
  const c = normalizeAvatar(config);
  const set = (patch) => onChange({ ...c, ...patch });

  return (
    <div>
      <div className="mb-3 flex flex-col items-center">
        <Avatar config={c} size={132} />
        <p className="mt-2 text-[10px] text-mut">화살표로 넘겨 나만의 아바타를 만들어보세요.</p>
      </div>

      <Stepper label="얼굴형" items={FACE_ITEMS} value={c.face} onPick={(v) => set({ face: v })} />
      <Stepper
        label="머리"
        items={HAIR_STYLES}
        value={c.hairStyle}
        onPick={(v) => set({ hairStyle: v })}
      />
      <Stepper
        label="머리색"
        items={colorItems(HAIR_COLORS)}
        value={c.hairColor}
        onPick={(v) => set({ hairColor: v })}
        swatch
      />
      <Stepper
        label="피부"
        items={colorItems(SKIN_COLORS)}
        value={c.skinColor}
        onPick={(v) => set({ skinColor: v })}
        swatch
      />
      <Stepper label="눈" items={EYES} value={c.eyes} onPick={(v) => set({ eyes: v })} />
      <Stepper
        label="눈썹"
        items={BROW_SHAPE_ITEMS}
        value={c.eyebrows}
        onPick={(v) => set({ eyebrows: v })}
      />
      <Stepper
        label="눈썹 굵기"
        items={BROW_THICKNESS}
        value={c.browThickness}
        onPick={(v) => set({ browThickness: v })}
      />
      <Stepper label="입" items={MOUTH} value={c.mouth} onPick={(v) => set({ mouth: v })} />
      <Stepper
        label="안경"
        items={GLASSES_OPTIONS}
        value={c.glasses}
        onPick={(v) => set({ glasses: v })}
      />
      <Stepper
        label="수염"
        items={[NONE(), ...BEARD]}
        value={c.beard}
        onPick={(v) => set({ beard: v })}
      />
      <Stepper label="의상" items={CLOTHES} value={c.clothes} onPick={(v) => set({ clothes: v })} />
      <Stepper
        label="의상색"
        items={colorItems(CLOTHES_COLORS)}
        value={c.clothesColor}
        onPick={(v) => set({ clothesColor: v })}
        swatch
      />

      {/*
        CC BY 4.0 표기 의무 — 저작자·라이선스·변경 사실 세 가지 모두. 지우지 말 것.
        화면을 다시 디자인하더라도 어딘가에는 남아 있어야 한다.
      */}
      <p className="mt-4 text-center text-[9px] leading-relaxed text-mut">
        <a href={TOONHEAD_CREDIT.creatorUrl} target="_blank" rel="noreferrer" className="underline">
          {TOONHEAD_CREDIT.title} by {TOONHEAD_CREDIT.creator}
        </a>{" "}
        ·{" "}
        <a href={TOONHEAD_CREDIT.licenseUrl} target="_blank" rel="noreferrer" className="underline">
          {TOONHEAD_CREDIT.license}
        </a>{" "}
        · 원저작물에서 일부 파츠를 추가·변경했습니다
      </p>
    </div>
  );
}
