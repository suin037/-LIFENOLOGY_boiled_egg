import { Outlet, useLocation, useNavigate } from "react-router-dom";
import Stars from "./Stars.jsx";
import TabBar from "./TabBar.jsx";

// 탭바를 숨기는 경로 (랜딩·온보딩·로딩)
const NO_TABBAR = ["/", "/onboarding", "/simulate"];
// 프로필(설정) 아이콘을 숨기는 경로
const NO_PROFILE = ["/simulate", "/settings"];

export default function Layout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const showTabBar = !NO_TABBAR.includes(pathname);
  const showProfile = !NO_PROFILE.includes(pathname);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#05070F] p-0 sm:p-6">
      {/* 폰 프레임 — 데스크톱에선 중앙 카드, 모바일에선 풀스크린 */}
      <div
        className="relative flex h-screen w-full max-w-phone flex-col overflow-hidden bg-bg
                   sm:h-[860px] sm:max-h-[95vh] sm:rounded-[38px]
                   sm:shadow-[0_30px_90px_rgba(0,0,0,.6),0_0_0_10px_#05070F,0_0_0_11px_#22304d]"
      >
        <Stars />

        {/* 상단 상태바 + 프로필(설정) */}
        <div className="z-20 flex items-center justify-between px-6 pb-1 pt-4 text-[13px] font-semibold">
          <span>9:41</span>
          <div className="flex items-center gap-3">
            <span className="text-mut">●●● ▮</span>
            {showProfile && (
              <button
                onClick={() => navigate("/settings")}
                aria-label="프로필 · 설정"
                className="tap flex h-8 w-8 items-center justify-center rounded-full border border-line text-sub"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="12" cy="8" r="3.2" />
                  <path d="M5 20c0-3.3 3.1-5.5 7-5.5s7 2.2 7 5.5" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* 화면 본문 (스크롤) */}
        <main
          key={pathname}
          className="no-scrollbar relative z-10 flex-1 animate-fade overflow-y-auto px-6 pb-8 pt-2"
        >
          <Outlet />
        </main>

        {showTabBar && <TabBar />}
      </div>
    </div>
  );
}
