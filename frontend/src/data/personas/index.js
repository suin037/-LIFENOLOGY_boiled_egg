// ─────────────────────────────────────────────────────────────
// 페르소나 레지스트리 — 체험하기(넷플릭스식 프로필 선택) 화면의 데이터 원천.
//
// 카드에 필요한 정보(이름·나이·직업·MBTI)는 각 페르소나 파일의 `profile` 에서 온다.
// 1년치 기록은 무겁기 때문에(파일당 100KB 남짓) 카드를 그릴 때는 안 읽고,
// 실제로 고른 순간에만 동적 import 로 가져온다.
//
// dataStatus
//   "ready"   1년치 기록 있음 — 고르면 바로 체험 가능
//   "pending" 프로필만 있고 기록은 아직 없음 — 카드는 뜨되 '준비 중'으로 표시
// ─────────────────────────────────────────────────────────────

// ⚠ 기록 파일(dohyun.js 등)이 아니라 **프로필 파일**에서 가져와야 한다.
//   기록 파일을 정적 import 하면 ES 모듈은 파일 단위라 1년치가 통째로 첫 화면
//   번들에 딸려 들어오고, 아래 load() 의 동적 import 가 무효가 된다
//   (vite 경고: "dynamic import will not move module into another chunk").
import { profile as jiwon } from "./jiwon.profile.js";
import { profile as dohyun } from "./dohyun.profile.js";
import { profile as seongmin } from "./seongmin.profile.js";
import { profile as jiho } from "./jiho.profile.js";
import { profile as eunwoo } from "./eunwoo.profile.js";

// 기록이 아직 프론트로 안 넘어온 인물의 프로필. (린·다운은 백엔드에 14일치만 있다.)
const rin = {
  name: "린", age: 27, sex: "2", sexConfirmed: true,
  major: "사회", occupation: "교육·법률·복지·공공", occupation_group: 4,
  income: 90, edu_level: 8, tenure_years: 0, mbti: "ENFP",
  value_ranking: ["growth", "freedom", "meaning", "friends", "status", "money", "family", "stability"],
  tagline: "런던 석사 마무리 · 돌아올지 남을지",
  choices: { a: "귀국해서 이직한다", b: "런던에 남아 현지 취업을 한다" },
};

const daun = {
  name: "다운", age: 30, sex: "2", sexConfirmed: true,
  major: "사회", occupation: "경영·사무·금융·보험", occupation_group: 3,
  income: 300, edu_level: 7, tenure_years: 5, mbti: "ENFJ",
  value_ranking: ["meaning", "friends", "family", "freedom", "growth", "status", "money", "stability"],
  tagline: "회사원 겸 브랜드 운영 · 본업을 바꿀지 고민",
  choices: { a: "회사를 나와 내 브랜드를 창업한다", b: "현재 직장을 유지한다" },
};

// 카드가 놓이는 순서. 기록이 있는 인물을 앞에 둔다.
export const PERSONAS = [
  { id: "jiwon", profile: jiwon, dataStatus: "ready", kind: "이직",
    load: () => import("../demoYear.js") },
  { id: "dohyun", profile: dohyun, dataStatus: "ready", kind: "휴식",
    load: () => import("./dohyun.js") },
  { id: "seongmin", profile: seongmin, dataStatus: "ready", kind: "창업",
    load: () => import("./seongmin.js") },
  { id: "jiho", profile: jiho, dataStatus: "ready", kind: "이직",
    load: () => import("./jiho.js") },
  { id: "eunwoo", profile: eunwoo, dataStatus: "ready", kind: "이직",
    load: () => import("./eunwoo.js") },
  { id: "rin", profile: rin, dataStatus: "pending", kind: "이직", load: null },
  { id: "daun", profile: daun, dataStatus: "pending", kind: "창업", load: null },
];

export function getPersona(id) {
  return PERSONAS.find((p) => p.id === id) || null;
}

/** 카드 한 장에 필요한 만큼만 — 1년치를 안 읽는다. */
export function personaCards() {
  return PERSONAS.map((p) => ({
    id: p.id,
    name: p.profile.name,
    age: p.profile.age,
    sex: p.profile.sex,
    job: p.profile.occupation,
    mbti: p.profile.mbti,
    tagline: p.profile.tagline,
    kind: p.kind,
    ready: p.dataStatus === "ready",
  }));
}
