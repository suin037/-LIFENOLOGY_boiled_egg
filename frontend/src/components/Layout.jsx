import { Outlet, useLocation, useNavigate } from "react-router-dom";
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
    <div className="flex min-h-screen items-center justify-center bg-[#0b0c0f] p-0 sm:p-6">
      <div
        className="relative flex h-screen w-full max-w-phone flex-col overflow-hidden bg-bg
                   sm:h-[820px] sm:max-h-[92vh] sm:rounded-[28px] sm:border sm:border-line/60
                   sm:shadow-[0_24px_70px_rgba(0,0,0,.45)]"
      >
        {/* 서비스 헤더 */}
        <header className="z-20 flex h-14 shrink-0 items-center justify-between px-5">
          <button onClick={() => navigate("/home")} className="text-[15px] font-bold tracking-[-.03em] text-ink">
            Parallel Me
          </button>
          <div>
            {showProfile && (
              <button
                onClick={() => navigate("/settings")}
                aria-label="프로필 · 설정"
                className="tap flex h-10 w-10 items-center justify-center rounded-full bg-card text-sub transition-colors hover:bg-card2"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="12" cy="8" r="3.2" />
                  <path d="M5 20c0-3.3 3.1-5.5 7-5.5s7 2.2 7 5.5" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>
        </header>

        {/* 화면 본문 (스크롤) */}
        <main
          key={pathname}
          className="no-scrollbar relative z-10 flex-1 animate-fade overflow-y-auto px-5 pb-7 pt-1"
        >
          <Outlet />
        </main>

        {showTabBar && <TabBar />}
      </div>
    </div>
  );
}
