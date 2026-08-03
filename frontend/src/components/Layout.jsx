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
    <div
      className="flex min-h-screen items-center justify-center bg-[#111827] p-0 sm:p-6"
      style={{
        backgroundImage:
          "radial-gradient(circle at 50% 12%, rgba(73,112,171,.22), transparent 36%), linear-gradient(145deg, #172033 0%, #0D1422 48%, #182235 100%)",
      }}
    >
      <div
        className="relative flex h-screen w-full max-w-phone flex-col overflow-hidden bg-bg
                   sm:h-[900px] sm:max-h-[94vh] sm:rounded-[44px] sm:border sm:border-[#52627B]
                   sm:ring-1 sm:ring-white/10
                   sm:shadow-[0_30px_90px_rgba(0,0,0,.65),0_0_45px_rgba(65,118,190,.18)]"
        style={{ backgroundImage: "radial-gradient(circle at 85% 8%, rgba(47,111,232,.12), transparent 32%), linear-gradient(180deg, #0B1423 0%, #08101D 100%)" }}
      >
        {/* 서비스 헤더 */}
        <header className="z-20 flex h-14 shrink-0 items-center justify-between px-5">
          <button onClick={() => navigate("/home")} className="text-[17px] font-bold tracking-[-.035em] text-ink">
            Parallel Me
          </button>
          <div>
            {showProfile && (
              <button
                onClick={() => navigate("/settings")}
                aria-label="프로필 · 설정"
                className="tap flex h-10 w-10 items-center justify-center rounded-full border border-line bg-card/80 text-sub transition-colors hover:bg-card2"
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
