// ─────────────────────────────────────────────────────────────
// 펫 상점/인벤토리 — 소품·간식·배경·가구를 코인으로 사서 꾸민다.
// 코인 = floor(총XP / 100) − 사용량.  (100 XP당 1코인, 대부분 아이템 1~2코인)
// 전부 로컬(localStorage). XP는 활동에서 파생되므로 코인도 자동 적립된다.
// MVP: 배경·소품 중심 + 간식/가구는 뼈대 몇 개. 렌더는 이모지(추후 SVG 교체 가능).
// ─────────────────────────────────────────────────────────────
import { totalXp } from "./myUniverse.js";

const KEY = "pm.petShop.v1";
const DEF = { spent: 0, owned: [], equipped: { background: null, accessory: null, furniture: null } };

export const COIN_PER_XP = 100; // 100 XP = 1 coin

export const CAT_LABELS = { background: "배경", accessory: "소품", furniture: "가구", snack: "간식" };
export const CATS = ["background", "accessory", "furniture", "snack"];

// 아이템 카탈로그. render: 배경=CSS background 문자열 / 그 외=이모지.
export const CATALOG = [
  // 배경
  { id: "bg_night",  cat: "background", name: "밤하늘",     price: 1, render: "radial-gradient(circle at 50% 32%, #1c2c50 0%, #0d1526 70%)" },
  { id: "bg_dawn",   cat: "background", name: "새벽 노을",   price: 2, render: "linear-gradient(180deg, #43324f 0%, #6b4560 55%, #8a5566 100%)" },
  { id: "bg_aurora", cat: "background", name: "오로라",     price: 2, render: "linear-gradient(180deg, #10233a 0%, #124a4a 55%, #1c5a4a 100%)" },
  { id: "bg_sakura", cat: "background", name: "벚꽃 하늘",   price: 3, render: "linear-gradient(180deg, #4a2f42 0%, #7a4a5e 55%, #9a6472 100%)" },
  // 소품 (머리 위 이모지)
  { id: "acc_cap",    cat: "accessory", name: "도토리 모자", price: 1, render: "🧢" },
  { id: "acc_ribbon", cat: "accessory", name: "나비 리본",   price: 1, render: "🎀" },
  { id: "acc_crown",  cat: "accessory", name: "작은 왕관",   price: 2, render: "👑" },
  { id: "acc_flower", cat: "accessory", name: "꽃 한 송이",  price: 2, render: "🌸" },
  // 가구 (무대 구석 이모지)
  { id: "fur_plant",  cat: "furniture", name: "화분",       price: 1, render: "🪴" },
  { id: "fur_lamp",   cat: "furniture", name: "무드등",     price: 2, render: "💡" },
  { id: "fur_books",  cat: "furniture", name: "책 더미",     price: 2, render: "📚" },
  // 간식 (먹이기 종류 — 뼈대)
  { id: "snack_carrot", cat: "snack", name: "당근",   price: 1, render: "🥕" },
  { id: "snack_fish",   cat: "snack", name: "생선",   price: 1, render: "🐟" },
  { id: "snack_cake",   cat: "snack", name: "케이크", price: 2, render: "🍰" },
];

export function itemById(id) {
  return CATALOG.find((it) => it.id === id) || null;
}

export function loadShop() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || "{}");
    return { ...DEF, ...s, equipped: { ...DEF.equipped, ...(s.equipped || {}) } };
  } catch {
    return { ...DEF, equipped: { ...DEF.equipped } };
  }
}
export function saveShop(x) {
  try {
    localStorage.setItem(KEY, JSON.stringify(x));
  } catch { /* 무시 */ }
  return x;
}

// 획득한 총 코인(누적) — XP에서 파생.
export function coinsEarned() {
  return Math.floor(totalXp() / COIN_PER_XP);
}
// 쓸 수 있는 코인 = 획득 − 사용.
export function coinsAvailable(x = loadShop()) {
  return Math.max(0, coinsEarned() - (x.spent || 0));
}

export function owns(id, x = loadShop()) {
  return (x.owned || []).includes(id);
}

// 구매: 코인 충분 & 미보유일 때만. {ok, reason}
export function buy(id, x = loadShop()) {
  const it = itemById(id);
  if (!it) return { ok: false, reason: "없는 아이템" };
  if (owns(id, x)) return { ok: false, reason: "이미 보유" };
  if (coinsAvailable(x) < it.price) return { ok: false, reason: "코인 부족" };
  const next = saveShop({ ...x, spent: (x.spent || 0) + it.price, owned: [...(x.owned || []), id] });
  return { ok: true, state: next };
}

// 장착/해제(같은 카테고리는 하나만). 토글.
export function toggleEquip(id, x = loadShop()) {
  const it = itemById(id);
  if (!it || !owns(id, x)) return x;
  const cur = x.equipped[it.cat];
  return saveShop({ ...x, equipped: { ...x.equipped, [it.cat]: cur === id ? null : id } });
}
export function equippedId(cat, x = loadShop()) {
  return x.equipped ? x.equipped[cat] || null : null;
}
export function equippedItem(cat, x = loadShop()) {
  const id = equippedId(cat, x);
  return id ? itemById(id) : null;
}
