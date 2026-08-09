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

// 인덱스 기반 의사난수(0~1) — 데모가 매번 같게(재현) + 인접 seed 간 상관 없게 해시.
function rng(n) {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

// 분기별 페르소나 상태. mood 기준·진폭, 주 도메인, 이직키워드 확률, 감정 풀.
const PHASES = [
  { // Q1 (주 0~12) 안정적 시작
    moodBase: 3.6, moodVar: 0.5, jobChange: 0.05,
    domains: ["career", "life", "relation", "health", "growth"],
    emotions: ["성취감", "설렘", "성취감", "설렘", "답답함"],
    texts: {
      career: ["오늘 새 프로젝트 킥오프. 팀장이 UI 파트 나한테 맡겼는데 부담되면서도 은근 설렌다.", "출근길에 좋아하는 노래 나와서 기분 좋게 시작함. 오전 회의도 무난.", "점심에 부장님이 커피 사주심. 이런 소소한 게 은근 힘 된다."],
      life: ["퇴근하고 집 앞 공원 한 바퀴. 바람 선선해서 좋았음.", "주말에 뭐 할지 고민만 하다 하루 다 감ㅋㅋ 그래도 나쁘지 않았어.", "저녁에 넷플 보다 그대로 잠듦. 평범한 하루."],
      relation: ["저녁에 남친이랑 통화 오래 했다. 별거 아닌 얘긴데 왜 이렇게 웃기지.", "대학 친구랑 오랜만에 술 한잔. 옛날 얘기하다 시간 가는 줄 몰랐다.", "엄마가 반찬 택배 보내주심. 별일 없냐 물으시는데 괜히 뭉클."],
      health: ["오랜만에 헬스장 갔다. 30분밖에 못 했지만 그래도 개운.", "요즘 잠은 잘 자는 편. 아침이 좀 덜 힘들다."],
      growth: ["퇴근하고 인강 한 챕터. 조금씩이라도 하니까 뿌듯하네.", "'미움받을 용기' 다시 펼침. 밑줄 그은 데 다시 읽으니 또 다르게 와닿아."],
    },
  },
  { // Q2 (주 13~25) 업무 과중·직무불만·번아웃 시작
    moodBase: 2.6, moodVar: 0.7, jobChange: 0.18,
    domains: ["career", "career", "health", "life", "relation"],
    emotions: ["답답함", "지침", "답답함", "지침", "성취감"],
    texts: {
      career: ["또 야근. 8시에 상사가 갑자기 자료 요청해서 결국 10시까지 있었다. 집 오니 진짜 아무것도 하기 싫음.", "회의 세 개 연속. 정작 내 일은 하나도 못 했다. 이게 일하는 건가 싶다.", "실적 미팅에서 숫자 얘기만 한 시간. 나 이거 하려고 취업했나…", "점심도 자리에서 김밥으로 때움. 화장실 갈 틈도 없었어."],
      health: ["요즘 아침에 일어나기가 너무 힘들다. 알람 다섯 번은 끄는 듯.", "머리 계속 아프고 소화도 안 됨. 몸이 신호 보내는 것 같은데 자꾸 무시하는 중.", "주말 내내 잤는데도 안 풀려. 이게 번아웃인가 싶다."],
      life: ["퇴근하고 소파에 누워서 폰만 봄. 진짜 의욕이 하나도 없다.", "그냥 다 놓고 어디 훌쩍 떠나고 싶다는 생각만."],
      relation: ["친구가 밥 먹자는데 나갈 기운이 없어서 또 미뤘다. 미안한데 몸이 안 움직임.", "남친한테 괜히 예민하게 굴었다. 회사 스트레스를 왜 여기다 푸는 건지.", "엄마 전화에 나도 모르게 짜증부터 냈다. 끊고 바로 후회."],
    },
  },
  { // Q3 (주 26~38) 이직 고민 본격화
    moodBase: 2.8, moodVar: 0.9, jobChange: 0.45,
    domains: ["career", "career", "growth", "life", "relation"],
    emotions: ["답답함", "설렘", "지침", "성취감", "답답함"],
    texts: {
      career: ["자기 전에 채용 사이트 또 들여다봄. 이직해야 하나 진지하게 고민된다.", "이력서 파일 드디어 열었다. 경력기술서 한 줄 쓰는 게 왜 이렇게 어렵지.", "두 군데 지원 버튼 눌렀다. 손 떨렸는데 그냥 눌러버림.", "헤드헌터한테 연락 옴. 면접 제안인데, 설레면서도 지금 회사 안정 놓기가 무섭다.", "퇴사하면 어떻게 될까 계속 상상만. 근데 막상 지르진 못하는 나."],
      growth: ["이직 준비하려고 포트폴리오 다시 정리. 내가 뭐 했나 보니 생각보단 많이 했네.", "지금 회사선 더 배울 게 없는 느낌이라 답답하다. 정체된 것 같아."],
      life: ["결정을 못 내리는 내가 제일 지친다. 이러지도 저러지도 못하고.", "주말에 혼자 등산. 정상에서 멍때리니 머리가 좀 정리됐다."],
      relation: ["친구한테 이직 고민 털어놨더니 '너 하고 싶은 대로 해'래. 그 말이 이상하게 위로됨.", "부모님은 지금 회사 계속 다니라셔. 안정이 최고라고. 이해는 되는데 답답.", "남친은 내 선택 응원한다는데, 정작 나는 확신이 없어서 미안하다."],
    },
  },
  { // Q4 (주 39~51) 결심·준비·회복
    moodBase: 3.6, moodVar: 0.6, jobChange: 0.3,
    domains: ["career", "growth", "health", "life", "relation"],
    emotions: ["설렘", "성취감", "설렘", "성취감", "지침"],
    texts: {
      career: ["결국 면접 보기로 답장 보냈다. 버튼 누르는 순간 오히려 개운했다.", "면접 봤다. 생각보다 분위기 좋았고 내 얘기를 잘 들어주는 느낌이었어.", "새 길 준비하니까 마음이 놓인다. 미루기만 하던 나를 움직인 게 뿌듯."],
      growth: ["요즘 배운 것들이 쌓이는 게 느껴진다. 반년 전 나랑 좀 다른 사람 같음.", "자격증 시험 접수 완료. 목표 생기니 하루가 다르게 간다."],
      health: ["운동 루틴 다시 잡음. 주 3회는 지키는 중. 몸이 확실히 가벼워졌다.", "요즘 잠이 다시 깊어졌다. 아침이 안 무섭다."],
      life: ["오랜만에 개운한 아침. 커피 내려 마시며 창밖 보는데 좀 살 것 같다.", "삶에 리듬이 돌아오는 느낌이 든다."],
      relation: ["남친이랑 오랜만에 제대로 데이트. 그동안 미안했다고 서로 얘기하고 풀었다.", "오래 연락 못 한 친구가 먼저 안부 물어줌. 이런 사람들 참 고맙다.", "엄마랑 통화하며 이직 얘기 편하게 했다. 응원해주셔서 든든."],
    },
  },
];

function phaseOf(week) {
  if (week <= 12) return PHASES[0];
  if (week <= 25) return PHASES[1];
  if (week <= 38) return PHASES[2];
  return PHASES[3];
}

const JOB_KW = ["요즘 자꾸 이직 생각이 든다.", "문득 퇴사하고 싶단 생각이 스쳤다.", "이력서를 만지작거렸다.", "면접 생각에 마음이 싱숭생숭."];

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
