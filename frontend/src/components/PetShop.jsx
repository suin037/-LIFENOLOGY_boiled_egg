import { useState } from "react";
import {
  CATALOG, CATS, CAT_LABELS,
  coinsAvailable, owns, buy, toggleEquip, equippedId, loadShop,
} from "../data/petShop.js";

// 🛍️ 펫 꾸미기 상점 — 코인으로 배경·소품·가구·간식을 사고 장착한다.
export default function PetShop({ onClose, onChange }) {
  const [shop, setShop] = useState(() => loadShop());
  const [cat, setCat] = useState("background");
  const [toast, setToast] = useState("");
  const coins = coinsAvailable(shop);

  function refresh(next) {
    setShop({ ...next });
    onChange && onChange();
  }
  function handleBuy(id) {
    const r = buy(id, shop);
    if (r.ok) refresh(r.state);
    else {
      setToast(r.reason);
      setTimeout(() => setToast(""), 1200);
    }
  }
  function handleEquip(id) {
    refresh(toggleEquip(id, shop));
  }

  const items = CATALOG.filter((it) => it.cat === cat);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-0 sm:items-center" onClick={onClose}>
      <div
        className="max-h-[82vh] w-full max-w-[460px] overflow-hidden rounded-t-[24px] border border-white/10 bg-[#0F1826] sm:rounded-[24px]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-white/8 px-5 py-3.5">
          <div className="text-[15px] font-bold text-ink">🛍️ 꾸미기 상점</div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 rounded-full bg-[#F5C84620] px-2.5 py-1 text-[12px] font-bold text-[#F5C846]">
              🪙 {coins}
            </span>
            <button onClick={onClose} className="tap text-[18px] leading-none text-mut">✕</button>
          </div>
        </div>

        {/* 카테고리 탭 */}
        <div className="flex gap-1.5 px-4 pt-3">
          {CATS.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`tap flex-1 rounded-full py-1.5 text-[12px] font-semibold transition ${
                cat === c ? "bg-white/12 text-ink" : "text-mut hover:text-ink"
              }`}
            >
              {CAT_LABELS[c]}
            </button>
          ))}
        </div>

        {/* 아이템 그리드 */}
        <div className="grid max-h-[58vh] grid-cols-2 gap-2.5 overflow-y-auto p-4">
          {items.map((it) => {
            const owned = owns(it.id, shop);
            const equipped = equippedId(it.cat, shop) === it.id;
            const canBuy = coins >= it.price;
            return (
              <div key={it.id} className="rounded-[16px] border border-white/8 bg-[#131F30] p-2.5">
                {/* 미리보기 */}
                <div className="mb-2 flex h-16 items-center justify-center overflow-hidden rounded-[12px] bg-black/20">
                  {it.cat === "background" ? (
                    <div className="h-full w-full" style={{ background: it.render }} />
                  ) : (
                    <span className="text-[30px]">{it.render}</span>
                  )}
                </div>
                <div className="mb-1.5 truncate text-[12px] font-semibold text-ink">{it.name}</div>

                {/* 액션 */}
                {!owned ? (
                  <button
                    onClick={() => handleBuy(it.id)}
                    disabled={!canBuy}
                    className="tap w-full rounded-lg bg-[#F5C846] py-1.5 text-[11.5px] font-bold text-[#3a2c05] disabled:opacity-40"
                  >
                    🪙 {it.price} 구매
                  </button>
                ) : it.cat === "snack" ? (
                  <div className="w-full rounded-lg bg-white/6 py-1.5 text-center text-[11.5px] font-semibold text-mut">보유중</div>
                ) : (
                  <button
                    onClick={() => handleEquip(it.id)}
                    className={`tap w-full rounded-lg py-1.5 text-[11.5px] font-bold ${
                      equipped ? "bg-cyan/25 text-cyan" : "bg-white/10 text-ink"
                    }`}
                  >
                    {equipped ? "장착중 ✓" : "장착"}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <p className="px-5 pb-4 text-[10px] leading-relaxed text-mut">
          코인은 기록·돌봄으로 쌓은 XP에서 자동 적립돼요 (100 XP당 1코인). 소품은 나중에 손그림으로 업그레이드 예정.
        </p>

        {toast && (
          <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-black/80 px-4 py-2 text-[12px] font-semibold text-white">
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}
