import { useState } from "react";
import {
  BEARD,
  BROW_SHAPE_ITEMS,
  BROW_THICKNESS,
  CLOTHES,
  CLOTHES_COLORS,
  DEFAULT_TOONHEAD,
  EYES,
  GLASSES_OPTIONS,
  HAIR_COLORS,
  HAIR_STYLES,
  MOUTH,
  SKIN_COLORS,
  TOONHEAD_CREDIT,
  randomToonHead,
} from "../data/toonHeadOptions.js";
import { FACE_SHAPES } from "../data/customParts.js";
import { avatarDataUri } from "../lib/renderAvatar.js";

// 온보딩 '내 아바타 만들기' 단계.
// 통합 UI(jy-ui)와 같은 Tailwind 토큰(bg/card/line/ink/sub/mut/cyan)을 쓰므로
// 합칠 때 그대로 들어간다. Card/Button 은 그쪽 components/ui.jsx 로 바꿔 끼워도 된다.
//
// 아바타를 실제로 그리는 일은 lib/renderAvatar.js 가 전부 한다. 이 파일은 화면일 뿐이다.

const NONE = (label = "없음") => ({ id: null, label });
const FACE_ITEMS = Object.entries(FACE_SHAPES).map(([id, f]) => ({ id, label: f.label }));
const colorItems = (hexes) => hexes.map((h, i) => ({ id: h, label: `${i + 1}번` }));

/** ◀ 라벨 ▶ 한 줄. 끝에서 반대편으로 순환한다. */
function Stepper({ label, items, value, onPick, swatch = false }) {
  const found = items.findIndex((i) => i.id === value);
  const at = found < 0 ? 0 : found;
  const move = (d) => onPick(items[(at + d + items.length) % items.length].id);
  const arrow =
    "tap flex w-11 shrink-0 items-center justify-center rounded-full border border-line " +
    "bg-card text-sub transition-transform active:scale-90";

  return (
    <div className="mt-3">
      <div className="mb-1.5 text-[11px] text-mut">{label}</div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => move(-1)} className={arrow} aria-label={`${label} 이전`}>
          ◀
        </button>
        <div className="tap flex flex-1 items-center justify-center gap-2 rounded-2xl border border-line bg-card2 px-3">
          {swatch && (
            <span
              className="h-4 w-4 shrink-0 rounded-full border border-line"
              style={{ background: "#" + value }}
            />
          )}
          <span className={`truncate text-[13px] ${items[at].id == null ? "text-mut" : "text-ink"}`}>
            {items[at].label}
          </span>
          <span className="shrink-0 text-[10px] text-mut">
            {at + 1}/{items.length}
          </span>
        </div>
        <button type="button" onClick={() => move(1)} className={arrow} aria-label={`${label} 다음`}>
          ▶
        </button>
      </div>
    </div>
  );
}

/**
 * @param {object}   value    현재 아바타 config (없으면 기본값)
 * @param {function} onChange config 가 바뀔 때마다 호출
 * @param {function} onNext   '이걸로 할래요' — 다음 온보딩 단계로
 * @param {function} onBack   이전 단계로 (없으면 버튼 숨김)
 */
export default function AvatarStep({ value, onChange, onNext, onBack }) {
  const [config, setConfig] = useState(() => ({ ...DEFAULT_TOONHEAD, ...(value || {}) }));
  const set = (patch) => {
    const next = { ...config, ...patch };
    setConfig(next);
    onChange?.(next);
  };
  const replace = (next) => {
    setConfig(next);
    onChange?.(next);
  };

  return (
    <div className="mx-auto flex min-h-full max-w-phone animate-fade flex-col px-5 pb-8 pt-6">
      <div className="mb-2 mt-1.5 text-[11px] font-semibold tracking-[3px] text-mut">
        내 아바타
      </div>
      <h1 className="text-[22px] font-bold leading-snug text-ink">
        평행우주의 나는
        <br />
        어떤 얼굴인가요?
      </h1>
      <p className="mt-1.5 text-[11px] leading-relaxed text-mut">
        여기서 만든 얼굴로 앞으로의 기록과 평행우주 A/B가 그려집니다. 나중에 설정에서 언제든 바꿀
        수 있어요.
      </p>

      {/* 미리보기 */}
      <div className="my-4 flex flex-col items-center">
        <div className="rounded-full border border-line bg-card p-1.5">
          <img
            src={avatarDataUri(config)}
            alt="내 아바타"
            width={168}
            height={168}
            className="block rounded-full"
          />
        </div>
        <button
          type="button"
          onClick={() => replace(randomToonHead())}
          className="tap mt-3 rounded-full border border-line bg-card px-4 text-[12px] text-sub active:scale-95"
        >
          무작위로 뽑기
        </button>
      </div>

      {/* 선택지 */}
      <div className="rounded-2xl border border-line bg-card p-4">
        <Stepper label="얼굴형" items={FACE_ITEMS} value={config.face} onPick={(v) => set({ face: v })} />
        <Stepper
          label="헤어스타일"
          items={HAIR_STYLES}
          value={config.hairStyle}
          onPick={(v) => set({ hairStyle: v })}
        />
        <Stepper
          label="머리색"
          items={colorItems(HAIR_COLORS)}
          value={config.hairColor}
          onPick={(v) => set({ hairColor: v })}
          swatch
        />
        <Stepper
          label="피부톤"
          items={colorItems(SKIN_COLORS)}
          value={config.skinColor}
          onPick={(v) => set({ skinColor: v })}
          swatch
        />
        <Stepper label="눈" items={EYES} value={config.eyes} onPick={(v) => set({ eyes: v })} />
        <Stepper
          label="안경"
          items={GLASSES_OPTIONS}
          value={config.glasses}
          onPick={(v) => set({ glasses: v })}
        />
        <Stepper
          label="눈썹 모양"
          items={BROW_SHAPE_ITEMS}
          value={config.eyebrows}
          onPick={(v) => set({ eyebrows: v })}
        />
        <Stepper
          label="눈썹 두께"
          items={BROW_THICKNESS}
          value={config.browThickness}
          onPick={(v) => set({ browThickness: v })}
        />
        <Stepper label="입" items={MOUTH} value={config.mouth} onPick={(v) => set({ mouth: v })} />
        <Stepper
          label="수염"
          items={[NONE(), ...BEARD]}
          value={config.beard}
          onPick={(v) => set({ beard: v })}
        />
        <Stepper
          label="옷"
          items={CLOTHES}
          value={config.clothes}
          onPick={(v) => set({ clothes: v })}
        />
        <Stepper
          label="옷 색"
          items={colorItems(CLOTHES_COLORS)}
          value={config.clothesColor}
          onPick={(v) => set({ clothesColor: v })}
          swatch
        />
      </div>

      {/* 다음 단계 */}
      <div className="mt-5 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => onNext?.(config)}
          className="tap block w-full rounded-[26px] border-none bg-gradient-to-r from-cyan to-cyan-deep px-4 py-4 text-base font-bold text-[#04203a] transition-transform active:scale-[.98]"
        >
          이 얼굴로 시작하기
        </button>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="tap block w-full rounded-[26px] border border-line bg-transparent px-4 py-4 text-base font-semibold text-sub transition-transform active:scale-[.98]"
          >
            이전
          </button>
        )}
      </div>

      {/*
        CC BY 4.0 표기 의무 — 저작자·라이선스·변경 사실 세 가지가 모두 있어야 한다.
        화면을 다시 디자인하더라도 이 줄은 어딘가에 남아 있어야 한다.
      */}
      <p className="mt-6 text-center text-[10px] leading-relaxed text-mut">
        아바타 스타일{" "}
        <a href={TOONHEAD_CREDIT.creatorUrl} target="_blank" rel="noreferrer" className="underline">
          {TOONHEAD_CREDIT.title} by {TOONHEAD_CREDIT.creator}
        </a>{" "}
        ·{" "}
        <a href={TOONHEAD_CREDIT.licenseUrl} target="_blank" rel="noreferrer" className="underline">
          {TOONHEAD_CREDIT.license}
        </a>
        <br />
        원저작물에서 일부 파츠를 추가·변경했습니다
      </p>
    </div>
  );
}
