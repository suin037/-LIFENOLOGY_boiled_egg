import { useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Bell, Bookmark, BookOpen, HelpCircle, Orbit, Sparkles } from "lucide-react";
import TabBar from "./TabBar.jsx";
import UserGuide from "./UserGuide.jsx";

// 탭바를 숨기는 경로 (랜딩·온보딩·로딩)
const NO_TABBAR = ["/", "/onboarding", "/simulate"];
// 프로필(설정) 아이콘을 숨기는 경로
const NO_PROFILE = ["/simulate", "/onboarding"];
const WIDE_DESKTOP = ["/home", "/input", "/result", "/my", "/archive", "/settings", "/simulate"];
const DESKTOP_TABS = [
  ["/my", "홈", Orbit],
  ["/input", "시뮬레이션", Sparkles],
  ["/home", "일기", BookOpen],
  ["/archive", "보관함", Bookmark],
];

export default function Layout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const showTabBar = !NO_TABBAR.includes(pathname);
  const showProfile = !NO_PROFILE.includes(pathname);
  const useWideDesktop = WIDE_DESKTOP.includes(pathname);
  const isLanding = pathname === "/";
  const isDesktopWorkspace = ["/home", "/input", "/result", "/my", "/archive", "/settings"].includes(pathname);
  const isUniverseCanvas = pathname === "/my";
  const isOnboarding = pathname === "/onboarding";
  const useFullDesktop = isDesktopWorkspace || isOnboarding || pathname === "/simulate";
  const [guideOpen, setGuideOpen] = useState(() => {
    try { return localStorage.getItem("pm.guide.seen.v1") !== "1"; } catch { return true; }
  });
  const closeGuide = () => {
    try { localStorage.setItem("pm.guide.seen.v1", "1"); } catch { /* 저장 불가 환경 */ }
    setGuideOpen(false);
  };
  const showBack = !["/", "/my"].includes(pathname);
  const goBack = () => window.history.length > 1 ? navigate(-1) : navigate("/my");

  return (
    <div
      className={`flex min-h-screen items-center justify-center bg-[#111827] p-0 ${isLanding ? "sm:p-0 lg:block lg:p-0" : `sm:p-6 ${useFullDesktop ? "lg:block lg:p-0" : "lg:p-8"}`}`}
      style={{
        backgroundImage:
          "radial-gradient(circle at 50% 12%, rgba(73,112,171,.22), transparent 36%), linear-gradient(145deg, #172033 0%, #0D1422 48%, #182235 100%)",
      }}
    >
      <div id="app-shell"
        className={`relative flex h-screen w-full flex-col overflow-hidden bg-bg ${
          `max-w-phone sm:h-[900px] sm:max-h-[94vh] sm:rounded-[44px] sm:border sm:border-[#52627B]
               md:aspect-[16/10] md:h-auto md:max-h-[calc(100vh-48px)] md:max-w-[calc((100vh-48px)*1.6)] md:rounded-[32px]
               lg:max-w-[1240px] sm:ring-1 sm:ring-white/10
               sm:shadow-[0_30px_90px_rgba(0,0,0,.65),0_0_45px_rgba(65,118,190,.18)]`
        } ${useFullDesktop ? "lg:aspect-auto lg:h-auto lg:min-h-screen lg:max-h-none lg:max-w-none lg:overflow-visible lg:rounded-none lg:border-0 lg:ring-0 lg:shadow-none" : ""} ${isLanding ? "sm:h-screen sm:max-h-none sm:max-w-none sm:rounded-none sm:border-0 sm:ring-0 sm:shadow-none md:aspect-auto md:h-screen md:max-h-none md:max-w-none md:rounded-none lg:max-w-none" : ""}`}
        style={{ backgroundImage: "radial-gradient(circle at 85% 8%, rgba(47,111,232,.12), transparent 32%), linear-gradient(180deg, #0B1423 0%, #08101D 100%)" }}
      >
        {/* 서비스 헤더 */}
        {!isLanding && <header className={`z-20 flex h-14 shrink-0 items-center justify-between border-b border-transparent px-5 lg:h-[76px] lg:border-line/70 lg:px-10 xl:px-14 ${useFullDesktop ? "lg:sticky lg:top-0 lg:bg-[#091321]/90 lg:backdrop-blur-xl" : ""}`}>
          <div className="flex items-center gap-2">
            {showBack && <button type="button" onClick={goBack} aria-label="이전 화면" className="tap flex h-10 w-10 items-center justify-center rounded-full bg-white/[.05] text-sub lg:hidden"><ArrowLeft size={19}/></button>}
          <button onClick={() => navigate("/my")} className={`${showBack ? "hidden lg:flex" : "flex"} items-center gap-2 text-[17px] font-bold tracking-[-.035em] text-ink lg:text-[20px]`}>
            <Sparkles size={18} className="hidden text-violet-400 lg:block" /> Parallel Me
          </button>
          </div>
          {isDesktopWorkspace && <nav className="absolute left-1/2 hidden h-full -translate-x-1/2 items-stretch gap-10 lg:flex xl:gap-14">
            {DESKTOP_TABS.map(([to,label,Icon])=><NavLink key={to} to={to} className={({isActive})=>`relative flex min-w-[84px] items-center justify-center gap-2 px-2 text-[14px] transition-colors after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-violet-400 ${isActive?"font-semibold text-violet-300 after:opacity-100":"text-sub hover:text-ink after:opacity-0"}`}><Icon size={15}/>{label}</NavLink>)}
          </nav>}
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setGuideOpen(true)} aria-label="Parallel Me 사용 방법" className="tap flex h-10 w-10 items-center justify-center rounded-full text-mut hover:bg-white/[.05]"><HelpCircle size={18}/></button>
            {isDesktopWorkspace && <button type="button" aria-label="알림" className="tap hidden h-10 w-10 items-center justify-center rounded-full text-mut hover:bg-white/[.05] lg:flex"><Bell size={18}/></button>}
            {showProfile && (
              <button
                onClick={() => navigate("/settings")}
                aria-label="프로필 · 설정"
                className="tap flex h-10 w-10 items-center justify-center rounded-full border border-violet-400/25 bg-violet-500/10 text-violet-400 transition-colors hover:bg-violet-500/15 lg:w-auto lg:gap-2 lg:px-3"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="12" cy="8" r="3.2" />
                  <path d="M5 20c0-3.3 3.1-5.5 7-5.5s7 2.2 7 5.5" strokeLinecap="round" />
                </svg>
                <span className="hidden text-[12px] font-semibold text-sub lg:inline">탐험가님</span>
              </button>
            )}
          </div>
        </header>}

        {/* 화면 본문 (스크롤) */}
        <main
          key={pathname}
          className={`no-scrollbar relative z-10 flex-1 ${isLanding ? "overflow-hidden p-0 [&>*]:h-full [&>*]:w-full [&>*]:max-w-none" : `overflow-y-auto px-5 pb-7 pt-1 lg:px-9 lg:pb-8 lg:pt-8 [&>*]:mx-auto [&>*]:w-full ${useFullDesktop ? "lg:overflow-visible xl:px-14" : ""} ${isUniverseCanvas ? "lg:!overflow-hidden lg:!p-0" : ""}`} ${
            isLanding ? "" : isUniverseCanvas ? "[&>*]:max-w-none" : isOnboarding ? "[&>*]:max-w-[1280px]" : isDesktopWorkspace ? "[&>*]:max-w-[1440px]" : useWideDesktop ? "[&>*]:max-w-[1120px]" : "[&>*]:max-w-phone"
          }`}
        >
          <Outlet />
        </main>

        {showTabBar && <TabBar />}
        {isLanding && <button type="button" onClick={() => setGuideOpen(true)} className="tap absolute right-5 top-5 z-30 flex items-center gap-1.5 rounded-full border border-white/15 bg-black/20 px-3 py-2 text-[11px] font-semibold text-white/80 backdrop-blur-md"><HelpCircle size={15}/> 사용 방법</button>}
        <UserGuide open={guideOpen} onClose={closeGuide} />
      </div>
    </div>
  );
}
