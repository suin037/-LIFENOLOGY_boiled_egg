import { useState } from "react";
import Avatar from "./Avatar.jsx";
import {
  BEARD, BROW_SHAPE_ITEMS, BROW_THICKNESS, CLOTHES, CLOTHES_COLORS, EYES,
  GLASSES_OPTIONS, HAIR_COLORS, HAIR_STYLES, MOUTH, SKIN_COLORS,
  TOONHEAD_CREDIT, normalizeAvatar, randomToonHead,
} from "../data/avatarOptions.js";
import { FACE_SHAPES } from "../data/customParts.js";

const NONE = (label = "없음") => ({ id: null, label });
const FACE_ITEMS = Object.entries(FACE_SHAPES).map(([id, value]) => ({ id, label: value.label }));
const colorItems = (hexes) => hexes.map((id) => ({ id, label: `#${id}` }));
const CATEGORIES = [["base", "기본"], ["hair", "헤어"], ["face", "얼굴"], ["style", "스타일"]];

function ColorPicker({ label, items, value, onPick }) {
  return <fieldset className="mt-4"><legend className="mb-2 text-[11px] font-semibold text-sub">{label}</legend><div className="flex flex-wrap gap-2">
    {items.map((item) => { const selected = item.id === value; return <button key={item.id} type="button" aria-label={`${label} ${item.label}`} aria-pressed={selected} onClick={() => onPick(item.id)} className={`tap flex h-10 w-10 items-center justify-center rounded-full border transition-all ${selected ? "border-violet-300 bg-violet-500/20 shadow-[0_0_0_2px_rgba(167,139,250,.22)]" : "border-white/10 bg-white/[.03] hover:border-white/30"}`}><span className="h-7 w-7 rounded-full border border-black/20" style={{ background: item.label }} /></button>; })}
  </div></fieldset>;
}

function OptionGrid({ label, items, value, field, config, onPick, compact = false }) {
  return <fieldset className="mt-4"><legend className="mb-2 text-[11px] font-semibold text-sub">{label}</legend><div className={`grid gap-2 ${compact ? "grid-cols-3 sm:grid-cols-4" : "grid-cols-3 sm:grid-cols-4 lg:grid-cols-5"}`}>
    {items.map((item, index) => { const selected = item.id === value; return <button key={item.id ?? `none-${index}`} type="button" aria-pressed={selected} onClick={() => onPick(item.id)} className={`tap min-w-0 rounded-2xl border px-1.5 pb-2 pt-1.5 text-center transition-all ${selected ? "border-violet-400 bg-violet-500/15 shadow-[0_8px_22px_rgba(91,65,150,.22)]" : "border-white/[.07] bg-[#0B1423] hover:border-white/20 hover:bg-white/[.055]"}`}><span className="mx-auto flex h-14 items-center justify-center overflow-hidden rounded-xl bg-white/[.035]">{item.id == null ? <span className="text-[19px] text-mut">—</span> : <Avatar config={{ ...config, [field]: item.id }} size={54} />}</span><span className={`mt-1.5 block truncate text-[9px] font-medium ${selected ? "text-violet-200" : "text-sub"}`}>{item.label}</span></button>; })}
  </div></fieldset>;
}

export default function AvatarBuilder({ config, onChange }) {
  const avatar = normalizeAvatar(config);
  const [category, setCategory] = useState("base");
  const set = (patch) => onChange({ ...avatar, ...patch });
  return <div className="overflow-hidden rounded-[22px] border border-white/[.07] bg-[#091321]/75 p-3.5 sm:p-4">
    <div className="grid gap-4 sm:grid-cols-[160px_minmax(0,1fr)] sm:items-start">
      <div className="flex flex-col items-center rounded-[18px] border border-white/[.06] bg-[radial-gradient(circle_at_50%_35%,rgba(139,108,207,.2),transparent_58%),rgba(0,0,0,.12)] p-4 sm:sticky sm:top-3">
        <Avatar config={avatar} size={132} /><strong className="mt-2 text-[12px]">나의 아바타</strong>
        <button type="button" onClick={() => onChange(randomToonHead())} className="tap mt-2 rounded-full border border-violet-400/25 bg-violet-500/10 px-3 py-1.5 text-[10px] font-semibold text-violet-300">🎲 다른 조합 보기</button>
      </div>
      <div className="min-w-0">
        <div className="grid grid-cols-4 gap-1 rounded-xl bg-black/20 p-1">{CATEGORIES.map(([key, label]) => <button key={key} type="button" onClick={() => setCategory(key)} className={`tap rounded-lg py-2 text-[10px] font-semibold transition-colors ${category === key ? "bg-violet-500/25 text-violet-200" : "text-mut hover:text-sub"}`}>{label}</button>)}</div>
        {category === "base" && <><OptionGrid label="얼굴형" items={FACE_ITEMS} value={avatar.face} field="face" config={avatar} onPick={(value) => set({ face: value })} /><ColorPicker label="피부색" items={colorItems(SKIN_COLORS)} value={avatar.skinColor} onPick={(value) => set({ skinColor: value })} /></>}
        {category === "hair" && <><OptionGrid label="헤어스타일" items={HAIR_STYLES} value={avatar.hairStyle} field="hairStyle" config={avatar} onPick={(value) => set({ hairStyle: value })} /><ColorPicker label="헤어 컬러" items={colorItems(HAIR_COLORS)} value={avatar.hairColor} onPick={(value) => set({ hairColor: value })} /></>}
        {category === "face" && <><OptionGrid label="눈" items={EYES} value={avatar.eyes} field="eyes" config={avatar} onPick={(value) => set({ eyes: value })} /><OptionGrid label="눈썹 모양" items={BROW_SHAPE_ITEMS} value={avatar.eyebrows} field="eyebrows" config={avatar} onPick={(value) => set({ eyebrows: value })} /><OptionGrid label="눈썹 굵기" items={BROW_THICKNESS} value={avatar.browThickness} field="browThickness" config={avatar} onPick={(value) => set({ browThickness: value })} compact /><OptionGrid label="표정" items={MOUTH} value={avatar.mouth} field="mouth" config={avatar} onPick={(value) => set({ mouth: value })} /></>}
        {category === "style" && <><OptionGrid label="안경" items={GLASSES_OPTIONS} value={avatar.glasses} field="glasses" config={avatar} onPick={(value) => set({ glasses: value })} /><OptionGrid label="수염" items={[NONE(), ...BEARD]} value={avatar.beard} field="beard" config={avatar} onPick={(value) => set({ beard: value })} /><OptionGrid label="의상" items={CLOTHES} value={avatar.clothes} field="clothes" config={avatar} onPick={(value) => set({ clothes: value })} /><ColorPicker label="의상 컬러" items={colorItems(CLOTHES_COLORS)} value={avatar.clothesColor} onPick={(value) => set({ clothesColor: value })} /></>}
      </div>
    </div>
    <p className="mt-4 text-center text-[8px] leading-relaxed text-mut"><a href={TOONHEAD_CREDIT.creatorUrl} target="_blank" rel="noreferrer" className="underline">{TOONHEAD_CREDIT.title} by {TOONHEAD_CREDIT.creator}</a>{" · "}<a href={TOONHEAD_CREDIT.licenseUrl} target="_blank" rel="noreferrer" className="underline">{TOONHEAD_CREDIT.license}</a>{" · 원저작물에서 일부 파츠를 추가·변경했습니다"}</p>
  </div>;
}
