import { useState } from "react";
import Avatar from "./Avatar.jsx";
import { BG_COLORS, EAR_SIZES, EYE_STYLES, GLASSES_STYLES, HAIR_COLORS, HAIR_STYLES, HAT_COLORS, HAT_STYLES, MOUTH_STYLES, NOSE_STYLES, SHIRT_COLORS, SHIRT_STYLES, SKIN_COLORS, normalizeAvatar } from "../data/avatarOptions.js";

const CATEGORIES = [["hair", "헤어"], ["face", "얼굴"], ["accessory", "액세서리"], ["outfit", "의상"], ["background", "배경"]];

function Options({ label, options, value, onPick, color = false }) {
  return <div className="mt-4"><p className="mb-2 text-[11px] font-semibold text-sub">{label}</p><div className="flex flex-wrap gap-2">{options.map(([name, option, extra]) => {
    const active = value === (extra ? `${option}:${extra}` : option);
    return <button type="button" key={`${name}-${option}`} onClick={() => onPick(option, extra)} title={name} className={`tap !min-h-0 flex h-9 items-center gap-2 rounded-xl border px-3 text-[11px] transition-colors ${active ? "border-violet-400 bg-violet-500/20 text-violet-200" : "border-line bg-[#0B1423] text-sub hover:border-violet-400/40"}`}>{color && <span className="h-4 w-4 rounded-full border border-white/15" style={{ background: option }} />}{name}</button>;
  })}</div></div>;
}

function ColorOptions({ label, options, value, onPick }) {
  return <Options label={label} options={options} value={value} onPick={onPick} color />;
}

export default function AvatarBuilder({ config, onChange }) {
  const c = normalizeAvatar(config);
  const [category, setCategory] = useState("hair");
  const patch = (next) => onChange({ ...c, ...next });
  return <div className="lg:grid lg:grid-cols-[180px_minmax(0,1fr)] lg:gap-6">
    <div className="flex flex-col items-center"><Avatar config={c} size={148} /><p className="mt-3 text-center text-[10px] leading-relaxed text-mut">카테고리를 고른 뒤 원하는 옵션을 바로 선택하세요.</p></div>
    <div className="min-w-0">
      <div className="no-scrollbar mt-4 flex gap-1.5 overflow-x-auto lg:mt-0">{CATEGORIES.map(([key,label])=><button type="button" key={key} onClick={()=>setCategory(key)} className={`tap !min-h-0 shrink-0 rounded-full px-3 py-2 text-[11px] font-semibold ${category===key?"bg-violet-500/25 text-violet-200":"bg-white/[.04] text-mut"}`}>{label}</button>)}</div>
      {category === "hair" && <><Options label="헤어스타일" options={HAIR_STYLES} value={`${c.hairStyle}:${c.sex}`} onPick={(style,sex)=>patch({hairStyle:style,sex,eyeBrowStyle:sex==="woman"?"upWoman":"up"})} /><ColorOptions label="헤어 색상" options={HAIR_COLORS} value={c.hairColor} onPick={(hairColor)=>patch({hairColor})} /></>}
      {category === "face" && <><ColorOptions label="피부색" options={SKIN_COLORS} value={c.faceColor} onPick={(faceColor)=>patch({faceColor})} /><Options label="눈" options={EYE_STYLES} value={c.eyeStyle} onPick={(eyeStyle)=>patch({eyeStyle})} /><Options label="입" options={MOUTH_STYLES} value={c.mouthStyle} onPick={(mouthStyle)=>patch({mouthStyle})} /><Options label="코" options={NOSE_STYLES} value={c.noseStyle} onPick={(noseStyle)=>patch({noseStyle})} /><Options label="귀" options={EAR_SIZES} value={c.earSize} onPick={(earSize)=>patch({earSize})} /></>}
      {category === "accessory" && <><Options label="안경" options={GLASSES_STYLES} value={c.glassesStyle} onPick={(glassesStyle)=>patch({glassesStyle})} /><Options label="모자" options={HAT_STYLES} value={c.hatStyle} onPick={(hatStyle)=>patch({hatStyle})} />{c.hatStyle!=="none"&&<ColorOptions label="모자 색상" options={HAT_COLORS} value={c.hatColor} onPick={(hatColor)=>patch({hatColor})} />}</>}
      {category === "outfit" && <><Options label="의상 종류" options={SHIRT_STYLES} value={c.shirtStyle} onPick={(shirtStyle)=>patch({shirtStyle})} /><ColorOptions label="의상 색상" options={SHIRT_COLORS} value={c.shirtColor} onPick={(shirtColor)=>patch({shirtColor})} /></>}
      {category === "background" && <><ColorOptions label="배경색" options={BG_COLORS.map((v,i)=>[`색상 ${i+1}`,v])} value={c.bgColor} onPick={(bgColor)=>patch({bgColor})} /><Options label="배경 효과" options={[["단색",false],["그라데이션",true]]} value={Boolean(c.isGradient)} onPick={(isGradient)=>patch({isGradient})} /></>}
    </div>
  </div>;
}
