// 첫 사용 안내 — 화면의 실제 버튼을 하나씩 짚고, 다음 화면으로 넘어가며 이어진다.
//
// 글로 된 도움말은 안 읽는다. 그래서 화면을 어둡게 덮고 그 버튼만 뚫어 보여준 뒤,
// 무엇을 하는 곳인지 한 줄로 말한다. 다음을 누르면 그 기능이 있는 화면으로 실제로
// 데려간다 — 설명만 듣는 것과 한 번 가 보는 것은 다르다.
//
// 대상은 data-tour="키" 로 찾는다. 화면에 없는 단계(예: 알림이 안 뜬 날)는 조용히
// 건너뛴다 — 빈 스포트라이트가 뜨면 안내가 아니라 고장으로 보인다.
const KEY = "pm.tour.v1";

export const TOUR_STEPS = [
  {
    id: "simulate", route: "/home",
    title: "두 갈래를 나란히 놓아요",
    body: "고민 중인 선택 두 개를 적으면, 각각이 어떤 하루가 되는지 비교해서 보여줘요.",
  },
  {
    id: "alert", route: "/home",
    title: "일기가 먼저 말을 걸어요",
    body: "기록에서 힘든 영역이 보이면 여기에 떠요. 누르면 그 영역에 맞는 비교가 바로 열려요.",
  },
  {
    id: "diary", route: "/home",
    title: "오늘 하루를 남기는 곳",
    body: "기분만 눌러도 되고, 마스코트와 대화하듯 적어도 돼요. 이 기록이 모든 분석의 재료가 돼요.",
  },
  {
    id: "suggest", route: "/home",
    title: "오늘 해볼 만한 것",
    body: "최근 기록을 보고 몸·쉼·사람 쪽으로 작게 권해요. 노래도 취향에 맞춰 골라줘요.",
  },
  {
    id: "input-choices", route: "/input",
    title: "여기가 시뮬레이션이에요",
    body: "두 갈래 길을 적는 칸이에요. 홈의 알림에서 들어오면 이미 채워진 채로 열려요.",
  },
  {
    id: "universe-map", route: "/my",
    title: "기록이 별이 된 곳",
    body: "남긴 하루가 별이 되고, 삶의 영역마다 행성으로 모여요. 행성을 누르면 그 영역의 기록·기회·N년 뒤가 열려요.",
  },
  {
    id: "archive-list", route: "/archive",
    title: "고른 미래를 모아두는 곳",
    body: "시뮬레이션 결과를 저장하고, 나중에 그래서 어떻게 됐는지 회고를 적어요.",
  },
  {
    id: "tabbar", route: "/home",
    title: "네 곳을 오갑니다",
    body: "홈 · 시뮬레이션 · 나의 우주 · 보관함. 언제든 여기로 돌아올 수 있어요. 이제 시작해볼까요?",
  },
];

export function tourSeen() {
  try { return localStorage.getItem(KEY) === "1"; } catch { return true; }
}

export function markTourSeen() {
  try { localStorage.setItem(KEY, "1"); } catch { /* 무시 */ }
}

/** 설정의 '안내 다시 보기' / 랜딩의 '시작하기' — 다시 볼 수 있게 표시만 지운다. */
export function resetTour() {
  try { localStorage.removeItem(KEY); } catch { /* 무시 */ }
}

/**
 * 안내를 실제로 띄운다. 처음 만든 계정에서만 부른다.
 *
 * 첫 진입이라고 무조건 띄우면 '이미 계정이 있어요'로 들어온 사람에게도 뜬다.
 * 그래서 자동으로 시작하지 않고, 온보딩을 마쳤을 때와 설정에서 눌렀을 때만 시작한다.
 * (화면 전환 직후엔 대상이 아직 안 붙어 있어 한 박자 늦춘다.)
 */
export function startTourIfNew() {
  if (typeof window === "undefined" || tourSeen()) return;
  setTimeout(() => window.dispatchEvent(new Event("pm:tour-start")), 600);
}

/** 설정에서 부르는 강제 시작 — 이미 본 사람도 다시 볼 수 있다. */
export function startTour() {
  resetTour();
  if (typeof window !== "undefined") {
    setTimeout(() => window.dispatchEvent(new Event("pm:tour-start")), 400);
  }
}
