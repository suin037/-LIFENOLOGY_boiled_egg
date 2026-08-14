import { totalXp } from "./myUniverse.js";
const KEY="pm.planetShop.v1";
export const PLANET_SKINS=[{id:"basic",name:"기본 암석형",price:0,icon:"●"},{id:"glow",name:"빛나는 구체",price:10,icon:"✦"},{id:"stripe",name:"줄무늬 가스행성",price:15,icon:"◉"},{id:"ring",name:"고리 행성",price:18,icon:"🪐"}];
const fallback={spent:0,owned:["basic"],equipped:"basic"};
export function loadPlanetShop(){try{return {...fallback,...JSON.parse(localStorage.getItem(KEY)||"{}")};}catch{return {...fallback};}}
function save(value){localStorage.setItem(KEY,JSON.stringify(value));window.dispatchEvent(new Event("pm:planet-shop"));return value;}
export function coinsAvailable(shop=loadPlanetShop()){return Math.max(0,Math.floor(totalXp()/100)-(shop.spent||0));}
export function buyPlanetSkin(id,shop=loadPlanetShop()){const item=PLANET_SKINS.find((skin)=>skin.id===id);if(!item)return {ok:false,reason:"없는 스킨"};if(shop.owned.includes(id))return {ok:false,reason:"이미 보유"};if(coinsAvailable(shop)<item.price)return {ok:false,reason:"코인이 부족해요"};return {ok:true,state:save({...shop,spent:shop.spent+item.price,owned:[...shop.owned,id]})};}
export function equipPlanetSkin(id,shop=loadPlanetShop()){if(!shop.owned.includes(id))return shop;return save({...shop,equipped:id});}
export function planetSkin(){return loadPlanetShop().equipped||"basic";}
