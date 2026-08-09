// ─────────────────────────────────────────────────────────────
// 1년치 예시 데이터 — "많은 데이터 → 성향 맞춤 개인화" 어필용 데모 시드.
//
// 정직선: 합성(가상) 페르소나다. 화면의 "예시 데이터" 배지를 유지한다.
//   실제 사용자 1명의 진짜 기록인 척하지 않는다.
//
// 페르소나 '지원'의 1년 아크(분기별):
//   Q1 안정적 시작 → Q2 업무 과중·직무불만 → Q3 이직 고민 본격화 → Q4 결심·회복
//   + 관계·건강·성장 스레드를 사이사이 섞어 모든 행성이 데이터를 갖게 한다.
// 결정적: 재현 가능하게(고정) 생성 — Math.random 대신 인덱스 기반 의사난수.
// ─────────────────────────────────────────────────────────────
import { addCheckin, resetUniverse, weekStartKey, todayKey } from "./myUniverse.js";

function addDays(dateKey, n) {
  const d = new Date(dateKey + "T00:00:00");
  d.setDate(d.getDate() + n);
  const p = (x) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// 인덱스 기반 의사난수(0~1) — 데모가 매번 같게 나오도록.
function rng(n) {
  const x = (n * 9301 + 49297) % 233280;
  return x / 233280;
}

// 분기별 페르소나 상태. mood 기준·진폭, 주 도메인, 이직키워드 확률, 감정 풀.
const PHASES = [
  { // Q1 (주 0~12) 안정적 시작
    moodBase: 3.6, moodVar: 0.5, jobChange: 0.05,
    domains: ["career", "life", "relation", "health", "growth"],
    emotions: ["성취감", "설렘", "성취감", "설렘", "답답함"],
    texts: {
      career: ["새 프로젝트를 맡았다. 기대된다.", "팀 분위기가 좋아서 출근이 가볍다.", "오늘 업무는 무난했다."],
      life: ["평범하지만 나쁘지 않은 하루.", "저녁에 산책하며 하루를 정리했다.", "주말이 기다려진다."],
      relation: ["친구랑 오랜만에 수다. 즐거웠다.", "가족 저녁 모임이 따뜻했다."],
      health: ["오랜만에 운동했더니 개운하다.", "잠을 푹 자서 컨디션이 좋다."],
      growth: ["강의를 하나 등록했다. 배우는 재미가 있다.", "책을 읽으며 생각을 정리했다."],
    },
  },
  { // Q2 (주 13~25) 업무 과중·직무불만·번아웃 시작
    moodBase: 2.6, moodVar: 0.7, jobChange: 0.18,
    domains: ["career", "career", "health", "life", "relation"],
    emotions: ["답답함", "지침", "답답함", "지침", "성취감"],
    texts: {
      career: ["또 야근. 상사가 일을 계속 던진다.", "회의만 하다 하루가 갔다. 지친다.", "업무가 너무 많아 숨이 막힌다.", "실적 압박이 심하다."],
      health: ["번아웃인가. 아침에 일어나기가 힘들다.", "두통과 소화불량이 잦다.", "잠을 설쳤다."],
      life: ["의욕이 없다. 그냥 버틴다.", "쉬고 싶다는 생각뿐."],
      relation: ["친구를 만나 잠깐 숨통이 트였다.", "가족한테 괜히 예민하게 굴었다."],
    },
  },
  { // Q3 (주 26~38) 이직 고민 본격화
    moodBase: 2.8, moodVar: 0.9, jobChange: 0.45,
    domains: ["career", "career", "growth", "life", "relation"],
    emotions: ["답답함", "설렘", "지침", "성취감", "답답함"],
    texts: {
      career: ["이직을 진지하게 고민 중이다.", "이력서를 드디어 열었다.", "다른 회사에 지원 버튼을 눌렀다.", "면접 제안이 왔다. 설레면서도 안정을 놓기가 무섭다.", "퇴사하면 어떻게 될까 자꾸 상상한다."],
      growth: ["이직 준비로 포트폴리오를 손봤다.", "배울 게 없는 지금이 정체된 느낌."],
      life: ["결정을 못 내리는 내가 지친다.", "주말에 머리를 비우려 등산했다."],
      relation: ["친구에게 이직 고민을 털어놨다.", "부모님은 안정을 권하신다."],
    },
  },
  { // Q4 (주 39~51) 결심·준비·회복
    moodBase: 3.6, moodVar: 0.6, jobChange: 0.3,
    domains: ["career", "growth", "health", "life", "relation"],
    emotions: ["설렘", "성취감", "설렘", "성취감", "지침"],
    texts: {
      career: ["결국 면접 보기로 결심했다.", "미루던 나를 움직인 게 개운하다.", "새 길을 준비하니 마음이 놓인다."],
      growth: ["새로 배운 것들이 쌓이는 게 느껴진다.", "자격증 공부를 마무리했다."],
      health: ["운동 루틴을 되찾았다. 회복되는 느낌.", "잠이 다시 깊어졌다."],
      life: ["오랜만에 개운한 아침에 결정했다.", "삶에 리듬이 돌아온다."],
      relation: ["오랜 친구가 먼저 연락해줬다.", "가족과 사이가 편안해졌다."],
    },
  },
];

function phaseOf(week) {
  if (week <= 12) return PHASES[0];
  if (week <= 25) return PHASES[1];
  if (week <= 38) return PHASES[2];
  return PHASES[3];
}

const JOB_KW = ["이직을 고민했다.", "퇴사 생각이 들었다.", "이력서를 만졌다.", "면접 생각에 마음이 복잡하다."];

/** 1년치(약 250건) 예시 데이터를 넣는다. 기존 기록은 지우고 채운다. */
export function seedDemoYear() {
  resetUniverse();
  const today = todayKey();
  const thisMon = weekStartKey(today);
  const start = addDays(thisMon, -51 * 7); // 51주 전 월요일

  for (let w = 0; w < 52; w++) {
    const ph = phaseOf(w);
    for (let d = 0; d < 7; d++) {
      const seed = w * 7 + d;
      // 주 4~5일만 기록(현실적 공백)
      if (rng(seed) > 0.66) continue;
      const date = addDays(start, w * 7 + d);
      if (date > today) continue;

      const mood = Math.max(1, Math.min(5, Math.round(ph.moodBase + (rng(seed + 1) - 0.5) * 2 * ph.moodVar)));
      const valence = +((mood - 3) / 2).toFixed(3);
      const domain = ph.domains[Math.floor(rng(seed + 2) * ph.domains.length)];
      const emotion = ph.emotions[Math.floor(rng(seed + 3) * ph.emotions.length)];

      // 약 45%에 일기 본문, 이직 키워드는 확률적으로 추가
      let text = "";
      if (rng(seed + 4) < 0.45) {
        const pool = ph.texts[domain] || ph.texts.life || [];
        text = pool[Math.floor(rng(seed + 5) * pool.length)] || "";
      }
      if (domain === "career" && rng(seed + 6) < ph.jobChange) {
        text = (text ? text + " " : "") + JOB_KW[Math.floor(rng(seed + 7) * JOB_KW.length)];
      }

      addCheckin({ date, valence, mood, keyword: emotion, text, domains: [domain] });
    }
  }
  // demo 플래그 세우기(배지 유지) — addCheckin이 persist하므로 마지막에 한 번 더.
  addCheckin({ date: today, valence: 0.5, mood: 4, keyword: "성취감", text: "1년을 돌아보니 나도 꽤 달라졌다.", domains: ["growth"] });
  try {
    const s = JSON.parse(localStorage.getItem("pm.myuniverse.v1") || "{}");
    s.demo = true;
    localStorage.setItem("pm.myuniverse.v1", JSON.stringify(s));
    if (typeof window !== "undefined") window.dispatchEvent(new Event("pm:universe"));
  } catch { /* 무시 */ }
}
