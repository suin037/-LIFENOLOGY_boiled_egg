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
      career: ["새 프로젝트 킥오프. 팀장이 UI 파트 맡겼는데 부담되면서도 은근 설렌다.", "출근길에 좋아하는 노래 나와서 기분 좋게 시작. 오전 회의도 무난.", "점심에 부장님이 커피 사주심. 이런 소소한 게 힘 된다.", "맡은 작업 예상보다 빨리 끝나서 정시 퇴근. 뿌듯.", "회의에서 처음으로 의견 냈는데 반응 나쁘지 않았다.", "새 툴 익히느라 반나절 썼는데 그래도 재밌음.", "동료가 내 아이디어 좋다고 해줘서 기분 좋았다."],
      life: ["퇴근하고 집 앞 공원 한 바퀴. 바람 선선해서 좋았음.", "주말에 뭐 할지 고민만 하다 하루 감ㅋㅋ 그래도 나쁘지 않았어.", "저녁에 넷플 보다 그대로 잠듦. 평범한 하루.", "오랜만에 방 정리했더니 마음도 정리되는 느낌.", "카페에서 멍때리며 두 시간. 이런 여유 오랜만.", "장 봐서 간단히 요리해 먹음. 별거 아닌데 뿌듯."],
      relation: ["저녁에 남친이랑 통화 오래 했다. 별거 아닌 얘긴데 왜 이렇게 웃기지.", "대학 친구랑 오랜만에 술 한잔. 옛날 얘기하다 시간 가는 줄 몰랐다.", "엄마가 반찬 택배 보내주심. 별일 없냐 물으시는데 괜히 뭉클.", "남친이랑 주말 데이트 약속 잡음. 벌써 기대돼.", "동생이랑 오랜만에 통화. 다 컸네 싶어 웃김.", "친구 생일이라 케이크 사들고 감. 좋아해줘서 다행."],
      health: ["오랜만에 헬스장. 30분밖에 못 했지만 개운.", "요즘 잠은 잘 자는 편. 아침이 좀 덜 힘들다.", "점심 산책 30분. 햇빛 쬐니 기분 좋아짐.", "일찍 자려고 폰 멀리 뒀더니 확실히 개운.", "물 많이 마시려 노력 중. 컨디션 나쁘지 않아."],
      growth: ["퇴근하고 인강 한 챕터. 조금씩이라도 하니까 뿌듯.", "'미움받을 용기' 다시 펼침. 밑줄 그은 데 또 다르게 와닿아.", "내가 뭐 할 때 제일 몰입하나 생각해봤다. 역시 만드는 일.", "올해 이루고 싶은 것 세 개 적어봄. 조금 또렷해짐.", "새 분야 강의 결제. 배우는 건 언제나 설렌다."],
    },
  },
  { // Q2 (주 13~25) 업무 과중·직무불만·번아웃 시작
    moodBase: 2.6, moodVar: 0.7, jobChange: 0.18,
    domains: ["career", "career", "health", "life", "relation"],
    emotions: ["답답함", "지침", "답답함", "지침", "성취감"],
    texts: {
      career: ["또 야근. 8시에 상사가 갑자기 자료 요청해서 결국 10시까지. 집 오니 아무것도 하기 싫음.", "회의 세 개 연속. 정작 내 일은 하나도 못 했다. 이게 일하는 건가.", "실적 미팅에서 숫자 얘기만 한 시간. 나 이거 하려고 취업했나…", "점심도 자리에서 김밥. 화장실 갈 틈도 없었어.", "상사가 또 말 바꿈. 어제 하란 대로 했는데 오늘 다시 하래.", "퇴근 직전에 일 던져짐. 결국 주말 출근각.", "일은 느는데 인정은 없다. 허무하다."],
      health: ["아침에 일어나기가 너무 힘들다. 알람 다섯 번은 끄는 듯.", "머리 계속 아프고 소화도 안 됨. 몸이 신호 보내는데 무시하는 중.", "주말 내내 잤는데도 안 풀려. 번아웃인가.", "요즘 잠들기까지 한참 걸린다. 생각이 안 멈춤.", "운동은커녕 걸을 기운도 없음.", "스트레스 때문인지 자꾸 군것질."],
      life: ["퇴근하고 소파에 누워 폰만 봄. 의욕이 하나도 없다.", "그냥 다 놓고 어디 훌쩍 떠나고 싶단 생각만.", "주말이 순삭. 쉰 것 같지도 않다.", "뭘 해도 재미가 없다. 그냥 버티는 느낌."],
      relation: ["친구가 밥 먹자는데 나갈 기운이 없어 또 미뤘다. 미안.", "남친한테 괜히 예민하게 굴었다. 회사 스트레스를 왜 여기다.", "엄마 전화에 나도 모르게 짜증부터. 끊고 바로 후회.", "친구랑 만나 회사 욕 실컷 함. 그래도 좀 풀림.", "남친이 요즘 왜 이렇게 예민하냐고. 할 말이 없었다."],
      growth: ["공부는 무슨, 눈뜨고 있기도 벅차다.", "이대로 있으면 도태되는 거 아닌가 불안."],
    },
  },
  { // Q3 (주 26~38) 이직 고민 본격화
    moodBase: 2.8, moodVar: 0.9, jobChange: 0.45,
    domains: ["career", "career", "growth", "life", "relation"],
    emotions: ["답답함", "설렘", "지침", "성취감", "답답함"],
    texts: {
      career: ["자기 전에 채용 사이트 또 들여다봄. 이직해야 하나 진지하게 고민.", "이력서 파일 드디어 열었다. 경력기술서 한 줄 쓰는 게 왜 이렇게 어렵지.", "두 군데 지원 버튼 눌렀다. 손 떨렸는데 눌러버림.", "헤드헌터 연락 옴. 면접 제안인데 설레면서도 안정 놓기가 무섭다.", "퇴사하면 어떻게 될까 계속 상상. 근데 막상 지르진 못하는 나.", "지금 연봉 다시 계산해봄. 옮기면 얼마나 오를까.", "면접 예상 질문 정리하다 새벽 됨."],
      growth: ["이직 준비하려고 포트폴리오 다시 정리. 생각보단 많이 했네.", "지금 회사선 더 배울 게 없는 느낌이라 답답. 정체된 것 같아.", "면접 대비 스터디 참여. 자극받음."],
      life: ["결정을 못 내리는 내가 제일 지친다. 이러지도 저러지도.", "주말에 혼자 등산. 정상에서 멍때리니 머리가 좀 정리.", "안정이냐 성장이냐, 밤새 저울질."],
      relation: ["친구한테 이직 고민 털어놨더니 '너 하고 싶은 대로 해'래. 이상하게 위로됨.", "부모님은 지금 회사 계속 다니라셔. 안정이 최고라고. 답답하지만 이해는 돼.", "남친은 내 선택 응원한다는데 정작 나는 확신이 없어 미안.", "선배랑 커피. 자기도 그맘때 똑같았다고. 조금 안심."],
      health: ["고민 때문인지 잠을 설침. 새벽 3시에 눈 떠짐.", "스트레스 받을 때마다 두통."],
    },
  },
  { // Q4 (주 39~51) 결심·준비·회복
    moodBase: 3.6, moodVar: 0.6, jobChange: 0.3,
    domains: ["career", "growth", "health", "life", "relation"],
    emotions: ["설렘", "성취감", "설렘", "성취감", "지침"],
    texts: {
      career: ["결국 면접 보기로 답장 보냈다. 버튼 누르는 순간 오히려 개운.", "면접 봤다. 생각보다 분위기 좋았고 내 얘기 잘 들어주는 느낌.", "새 길 준비하니 마음이 놓인다. 미루던 나를 움직인 게 뿌듯.", "최종 결과 기다리는 중. 떨리지만 후회는 없다.", "합격 연락! 아직 실감 안 나는데 웃음이 나온다."],
      growth: ["요즘 배운 것들이 쌓이는 게 느껴진다. 반년 전 나랑 다른 사람 같음.", "자격증 시험 접수 완료. 목표 생기니 하루가 다르게 감.", "새로 시작한 공부가 생각보다 재밌다."],
      health: ["운동 루틴 다시 잡음. 주 3회는 지키는 중. 몸이 가벼워졌다.", "요즘 잠이 다시 깊어졌다. 아침이 안 무섭다.", "산책이 습관이 됨. 확실히 기분이 안정적."],
      life: ["오랜만에 개운한 아침. 커피 내려 마시며 창밖 보는데 좀 살 것 같다.", "삶에 리듬이 돌아오는 느낌.", "주말에 하고 싶던 전시 보러 감. 채워지는 기분."],
      relation: ["남친이랑 오랜만에 제대로 데이트. 미안했다고 서로 얘기하고 풀었다.", "오래 연락 못 한 친구가 먼저 안부 물어줌. 고마운 사람들.", "엄마랑 통화하며 이직 얘기 편하게 함. 응원해주셔서 든든.", "친구 결혼식. 다들 각자 자리에서 잘 살고 있구나 싶어 뭉클."],
    },
  },
];

function phaseOf(week) {
  if (week <= 12) return PHASES[0];
  if (week <= 25) return PHASES[1];
  if (week <= 38) return PHASES[2];
  return PHASES[3];
}

const JOB_KW = ["요즘 자꾸 이직 생각이 든다.", "문득 퇴사하고 싶단 생각이 스쳤다.", "이력서를 만지작거렸다.", "면접 생각에 마음이 싱숭생숭.", "다른 회사는 어떨까 자꾸 상상.", "옮길지 남을지 계속 저울질."];

/** 1년치(약 250건) 예시 데이터를 넣는다. 기존 기록은 지우고 채운다. */
export function seedDemoYear() {
  resetUniverse();
  const today = todayKey();
  const thisMon = weekStartKey(today);
  const start = addDays(thisMon, -51 * 7); // 51주 전 월요일

  // 풀을 랜덤이 아니라 '순환(round-robin)'으로 뽑아 같은 문장이 뭉치는 중복을 줄인다.
  const cursor = {}; // key: `${phaseIdx}-${domain}` → 다음 인덱스
  const pick = (arr, key) => { if (!arr || !arr.length) return ""; const i = cursor[key] || 0; cursor[key] = i + 1; return arr[i % arr.length]; };
  let jobCursor = 0;

  for (let w = 0; w < 52; w++) {
    const phaseIdx = w <= 12 ? 0 : w <= 25 ? 1 : w <= 38 ? 2 : 3;
    const ph = PHASES[phaseIdx];
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

      // 약 45%에 일기 본문 — 풀 순환으로 고르게(중복 최소).
      let text = "";
      if (rng(seed + 4) < 0.45) {
        text = pick(ph.texts[domain] || ph.texts.life || [], `${phaseIdx}-${domain}`);
      }
      if (domain === "career" && rng(seed + 6) < ph.jobChange) {
        text = (text ? text + " " : "") + JOB_KW[jobCursor++ % JOB_KW.length];
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

// jy 데모의 은우 페르소나는 1년 동안 워라밸과 이직 고민이 변화하는 동일한 장기 시계열을 사용한다.
export function seedDemoEunwoo() {
  return seedDemoYear();
}
