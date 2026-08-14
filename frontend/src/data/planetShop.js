import { totalXp } from "./myUniverse.js";
const KEY="pm.planetShop.v1";
export const PLANET_SKINS=[{id:"basic",name:"기본 암석형",price:0,icon:"●"},{id:"glow",name:"빛나는 구체",price:10,icon:"✦"},{id:"stripe",name:"줄무늬 가스행성",price:15,icon:"◉"},{id:"ring",name:"고리 행성",price:18,icon:"🪐"}];
// 생활 관리 친구(돌보미) 꾸미기 — 지갑(spent)을 행성 스킨과 함께 쓴다.
// 파일을 나누면 코인이 두 벌이 되어 같은 코인을 두 번 쓸 수 있다.
export const PET_ITEMS=[
  {id:"none",name:"기본",price:0,icon:"·"},
  {id:"beanie",name:"털모자",price:6,icon:"🧢"},
  {id:"crown",name:"별 왕관",price:12,icon:"👑"},
  {id:"scarf",name:"목도리",price:8,icon:"🧣"},
  {id:"glasses",name:"동그란 안경",price:10,icon:"👓"},
  {id:"ribbon",name:"리본",price:6,icon:"🎀"},
];
const fallback={spent:0,owned:["basic"],equipped:"basic",petOwned:["none"],petEquipped:"none"};
export function loadPlanetShop(){try{return {...fallback,...JSON.parse(localStorage.getItem(KEY)||"{}")};}catch{return {...fallback};}}
function save(value){localStorage.setItem(KEY,JSON.stringify(value));window.dispatchEvent(new Event("pm:planet-shop"));return value;}
export function coinsAvailable(shop=loadPlanetShop()){return Math.max(0,Math.floor(totalXp()/100)-(shop.spent||0));}
export function buyPlanetSkin(id,shop=loadPlanetShop()){const item=PLANET_SKINS.find((skin)=>skin.id===id);if(!item)return {ok:false,reason:"없는 스킨"};if(shop.owned.includes(id))return {ok:false,reason:"이미 보유"};if(coinsAvailable(shop)<item.price)return {ok:false,reason:"코인이 부족해요"};return {ok:true,state:save({...shop,spent:shop.spent+item.price,owned:[...shop.owned,id]})};}
export function equipPlanetSkin(id,shop=loadPlanetShop()){if(!shop.owned.includes(id))return shop;return save({...shop,equipped:id});}
export function planetSkin(){return loadPlanetShop().equipped||"basic";}

export function buyPetItem(id,shop=loadPlanetShop()){const item=PET_ITEMS.find((x)=>x.id===id);if(!item)return {ok:false,reason:"없는 아이템"};const owned=shop.petOwned||["none"];if(owned.includes(id))return {ok:false,reason:"이미 보유"};if(coinsAvailable(shop)<item.price)return {ok:false,reason:"코인이 부족해요"};return {ok:true,state:save({...shop,spent:shop.spent+item.price,petOwned:[...owned,id]})};}
export function equipPetItem(id,shop=loadPlanetShop()){const owned=shop.petOwned||["none"];if(!owned.includes(id))return shop;return save({...shop,petEquipped:id});}
export function petItem(){return loadPlanetShop().petEquipped||"none";}
