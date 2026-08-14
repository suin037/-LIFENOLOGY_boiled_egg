import { useState } from "react";
import { X } from "lucide-react";
import {
  PLANET_SKINS, PET_ITEMS, buyPlanetSkin, buyPetItem, coinsAvailable,
  equipPlanetSkin, equipPetItem, loadPlanetShop,
} from "../data/planetShop.js";
import PetCreature from "./PetCreature.jsx";
import { loadPet } from "../data/petCare.js";

// 상점 — 행성 꾸미기 + 생활 관리 친구 꾸미기.
// 코인 지갑(spent)은 하나다. 파일을 나누면 같은 코인을 두 번 쓸 수 있다.
export default function PlanetShop({ onClose }) {
  const [shop, setShop] = useState(loadPlanetShop);
  const [tab, setTab] = useState("planet");
  const [message, setMessage] = useState("");
  const which = loadPet().which || "cosmo";

  const isPet = tab === "pet";
  const items = isPet ? PET_ITEMS : PLANET_SKINS;
  const owned = isPet ? (shop.petOwned || ["none"]) : shop.owned;
  const equipped = isPet ? (shop.petEquipped || "none") : shop.equipped;

  function buy(id) {
    const r = isPet ? buyPetItem(id, shop) : buyPlanetSkin(id, shop);
    if (r.ok) { setShop(r.state); setMessage("샀어요"); } else setMessage(r.reason);
  }
  function equip(id) {
    setShop(isPet ? equipPetItem(id, shop) : equipPlanetSkin(id, shop));
    setMessage(isPet ? "친구에게 씌웠어요" : "행성 스킨을 장착했어요");
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/65 p-0 backdrop-blur-sm md:items-center md:p-6" onClick={onClose}>
      <section className="max-h-[88dvh] w-full max-w-[520px] overflow-y-auto rounded-t-[26px] border border-white/10 bg-[#0C1424] p-5 md:rounded-[26px]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] tracking-[.15em] text-[#A88BE8]">UNIVERSE SHOP</p>
            <h2 className="mt-1 text-[18px] font-bold">꾸미기 상점</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-[#F5C846]/10 px-3 py-1.5 text-[11px] font-bold text-[#F5C846]">🪙 {coinsAvailable(shop)}</span>
            <button onClick={onClose} className="tap flex h-9 w-9 items-center justify-center"><X size={18} /></button>
          </div>
        </div>

        <div className="mt-3 flex gap-1.5">
          {[["planet", "행성 꾸미기"], ["pet", "친구 꾸미기"]].map(([key, label]) => (
            <button
              key={key}
              onClick={() => { setTab(key); setMessage(""); }}
              className={`tap rounded-full border px-3 py-1.5 text-[11px] font-semibold ${
                tab === key ? "border-[#8B6CCF] bg-[#8B6CCF]/20 text-[#C7B5F2]" : "border-white/10 text-mut"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <p className="mt-3 text-[10px] leading-relaxed text-mut">
          {isPet
            ? "생활 관리 친구에게 씌워줄 수 있어요. 성격이나 기분에는 영향을 주지 않아요."
            : "영역별 고유 색은 유지하고 표면 질감·광택·고리만 변경됩니다."}
          {" "}100 XP마다 코인 1개를 얻습니다.
        </p>

        {/* 지금 씌운 모습 미리보기 — 씌우기 전에 어떻게 보이는지 알 수 있게. */}
        {isPet && (
          <div className="mt-3 flex justify-center rounded-[18px] border border-white/[.07] bg-black/20 py-3">
            <PetCreature size={92} variant={which} accessory={equipped} />
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2.5">
          {items.map((item) => {
            const has = owned.includes(item.id);
            const on = equipped === item.id;
            return (
              <div key={item.id} className="rounded-[18px] border border-white/[.07] bg-white/[.035] p-3">
                <div className="flex h-20 items-center justify-center rounded-xl bg-black/20 text-[34px] text-[#BBA4ED]">
                  {isPet && item.id !== "none"
                    ? <PetCreature size={70} variant={which} accessory={item.id} />
                    : item.icon}
                </div>
                <b className="mt-2 block text-[11px]">{item.name}</b>
                {has ? (
                  <button onClick={() => equip(item.id)} className={`tap mt-2 w-full rounded-lg py-2 text-[10px] font-bold ${on ? "bg-[#8B6CCF]/25 text-[#CDBDF3]" : "bg-white/10"}`}>
                    {on ? "장착 중 ✓" : "장착하기"}
                  </button>
                ) : (
                  <button onClick={() => buy(item.id)} className="tap mt-2 w-full rounded-lg bg-[#8B6CCF] py-2 text-[10px] font-bold">
                    🪙 {item.price} 구매
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {message && <p className="mt-3 text-center text-[10px] text-[#CDBDF3]">{message}</p>}
      </section>
    </div>
  );
}
