import { useState } from "react";
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
  randomToonHead,
} from "../data/avatarOptions.js";
import { FACE_SHAPES } from "../data/customParts.js";

// 탭(기본/헤어/얼굴/스타일)으로 묶고, 각 항목은 화살표로 넘긴다.
// 가운데에는 그 선택을 적용한 아바타를 실제로 그려 보여준다 — 이름만으로는
// '옆가르마'와 '언더컷' 같은 것들이 구분되지 않는다.

const NONE = (label = "없음") => ({ id: null, label });
const FACE_ITEMS = Object.entries(FACE_SHAPES).map(([id, v]) => ({ id, label: v.label }));
const colorItems = (hexes) => hexes.map((id, i) => ({ id, label: `${i + 1}번` }));
const CATEGORIES = [
  ["base", "기본"],
  ["hair", "헤어"],
  ["face", "얼굴"],
  ["style", "스타일"],
];

function Arrow({ dir, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${label} ${dir < 0 ? "이전" : "다음"}`}
      className="tap flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-violet-400/25 bg-violet-500/10 text-[16px] text-violet-300 transition-transform active:scale-90"
    >
      {dir < 0 ? "‹" : "›"}
    </button>
  );
}

/**
 * 한 줄짜리 선택기. 끝에서 반대편으로 순환한다.
 * field 를 주면 그 값만 바꾼 아바타를 가운데에 미리 그린다.
 * swatch 를 주면 아바타 대신 색 원을 보여준다(색 항목용).
 */
function Stepper({ label, items, value, onPick, field, config, swatch = false }) {
  const found = items.findIndex((i) => i.id === value);
  const at = found < 0 ? 0 : found;
  const cur = items[at];
  const go = (d) => onPick(items[(at + d + items.length) % items.length].id);

  return (
    <div className="mt-2.5">
      <div className="mb-1.5 text-[11px] font-semibold text-sub">{label}</div>
      <div className="flex items-center gap-2 rounded-2xl border border-white/[.07] bg-[#0B1423] px-2.5 py-2">
        <Arrow dir={-1} onClick={() => go(-1)} label={label} />
        <div className="flex min-w-0 flex-1 items-center justify-center gap-2.5">
          {swatch ? (
            <span
              className="h-9 w-9 shrink-0 rounded-full border border-black/20"
              style={{ background: "#" + cur.id }}
            />
          ) : (
            <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/[.035]">
              <Avatar config={{ ...config, [field]: cur.id }} size={54} ring={false} />
            </span>
          )}
          <div className="min-w-0">
            <div
              className={`truncate text-[12px] font-medium ${
                cur.id == null ? "text-mut" : "text-ink"
              }`}
            >
              {cur.label}
            </div>
            <div className="text-[9px] text-mut">
              {at + 1} / {items.length}
            </div>
          </div>
        </div>
        <Arrow dir={1} onClick={() => go(1)} label={label} />
      </div>
    </div>
  );
}

export default function AvatarBuilder({ config, onChange }) {
  const avatar = normalizeAvatar(config);
  const [category, setCategory] = useState("base");
  const set = (patch) => onChange({ ...avatar, ...patch });

  // 미리보기용 config — 항목별 차이가 잘 보이도록 가리는 요소(안경·수염)를 걷어낸다.
  const bare = { ...avatar, glasses: "none", beard: null };

  return (
    <div className="overflow-hidden rounded-[22px] border border-white/[.07] bg-[#091321]/75 p-3.5 sm:p-4">
      <div className="grid gap-4 sm:grid-cols-[160px_minmax(0,1fr)] sm:items-start">
        <div className="flex flex-col items-center rounded-[18px] border border-white/[.06] bg-[radial-gradient(circle_at_50%_35%,rgba(139,108,207,.2),transparent_58%),rgba(0,0,0,.12)] p-4 sm:sticky sm:top-3">
          <Avatar config={avatar} size={132} />
          <strong className="mt-2 text-[12px]">나의 아바타</strong>
          <button
            type="button"
            onClick={() => onChange(randomToonHead())}
            className="tap mt-2 rounded-full border border-violet-400/25 bg-violet-500/10 px-3 py-1.5 text-[10px] font-semibold text-violet-300"
          >
            🎲 다른 조합 보기
          </button>
        </div>

        <div className="min-w-0">
          <div className="grid grid-cols-4 gap-1 rounded-xl bg-black/20 p-1">
            {CATEGORIES.map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setCategory(key)}
                className={`tap rounded-lg py-2 text-[10px] font-semibold transition-colors ${
                  category === key ? "bg-violet-500/25 text-violet-200" : "text-mut hover:text-sub"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {category === "base" && (
            <>
              <Stepper
                label="얼굴형"
                items={FACE_ITEMS}
                value={avatar.face}
                field="face"
                config={bare}
                onPick={(v) => set({ face: v })}
              />
              <Stepper
                label="피부색"
                items={colorItems(SKIN_COLORS)}
                value={avatar.skinColor}
                onPick={(v) => set({ skinColor: v })}
                swatch
              />
            </>
          )}

          {category === "hair" && (
            <>
              <Stepper
                label="헤어스타일"
                items={HAIR_STYLES}
                value={avatar.hairStyle}
                field="hairStyle"
                config={bare}
                onPick={(v) => set({ hairStyle: v })}
              />
              <Stepper
                label="헤어 컬러"
                items={colorItems(HAIR_COLORS)}
                value={avatar.hairColor}
                onPick={(v) => set({ hairColor: v })}
                swatch
              />
            </>
          )}

          {category === "face" && (
            <>
              <Stepper
                label="눈"
                items={EYES}
                value={avatar.eyes}
                field="eyes"
                config={bare}
                onPick={(v) => set({ eyes: v })}
              />
              <Stepper
                label="눈썹 모양"
                items={BROW_SHAPE_ITEMS}
                value={avatar.eyebrows}
                field="eyebrows"
                config={bare}
                onPick={(v) => set({ eyebrows: v })}
              />
              <Stepper
                label="눈썹 굵기"
                items={BROW_THICKNESS}
                value={avatar.browThickness}
                field="browThickness"
                config={bare}
                onPick={(v) => set({ browThickness: v })}
              />
              <Stepper
                label="표정"
                items={MOUTH}
                value={avatar.mouth}
                field="mouth"
                config={bare}
                onPick={(v) => set({ mouth: v })}
              />
            </>
          )}

          {category === "style" && (
            <>
              <Stepper
                label="안경"
                items={GLASSES_OPTIONS}
                value={avatar.glasses}
                field="glasses"
                config={{ ...avatar, beard: null }}
                onPick={(v) => set({ glasses: v })}
              />
              <Stepper
                label="수염"
                items={[NONE(), ...BEARD]}
                value={avatar.beard}
                field="beard"
                config={{ ...avatar, glasses: "none" }}
                onPick={(v) => set({ beard: v })}
              />
              <Stepper
                label="의상"
                items={CLOTHES}
                value={avatar.clothes}
                field="clothes"
                config={avatar}
                onPick={(v) => set({ clothes: v })}
              />
              <Stepper
                label="의상 컬러"
                items={colorItems(CLOTHES_COLORS)}
                value={avatar.clothesColor}
                onPick={(v) => set({ clothesColor: v })}
                swatch
              />
            </>
          )}
        </div>
      </div>

      {/* CC BY 4.0 — 저작자·라이선스·변경 사실 세 가지 모두 의무. 지우지 말 것. */}
      <p className="mt-4 text-center text-[8px] leading-relaxed text-mut">
        <a href={TOONHEAD_CREDIT.creatorUrl} target="_blank" rel="noreferrer" className="underline">
          {TOONHEAD_CREDIT.title} by {TOONHEAD_CREDIT.creator}
        </a>
        {" · "}
        <a href={TOONHEAD_CREDIT.licenseUrl} target="_blank" rel="noreferrer" className="underline">
          {TOONHEAD_CREDIT.license}
        </a>
        {" · 원저작물에서 일부 파츠를 추가·변경했습니다"}
      </p>
    </div>
  );
}
