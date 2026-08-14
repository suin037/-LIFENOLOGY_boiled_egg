import { Outlet, useLocation, useNavigate } from "react-router-dom";
import TabBar from "./TabBar.jsx";

// 탭바를 숨기는 경로 (랜딩·온보딩·로딩)
const NO_TABBAR = ["/", "/onboarding", "/simulate"];
// 프로필(설정) 아이콘을 숨기는 경로
const NO_PROFILE = ["/simulate", "/settings"];
// PC 에서 넓게 쓰는 화면. /company 는 재무표·공시 목록이라 좁으면 읽기 나쁘다.
// (/checkin 은 오늘 하나를 적는 화면이라 일부러 좁게 둔다.)
const WIDE_DESKTOP = ["/home", "/input", "/result", "/my", "/archive", "/settings", "/company"];

export default function Layout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const showTabBar = !NO_TABBAR.includes(pathname);
  const showProfile = !NO_PROFILE.includes(pathname);
  const useWideDesktop = WIDE_DESKTOP.includes(pathname);
  const isLanding = pathname === "/";

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-[#111827] p-0 sm:p-6 lg:p-0"
      style={{
        backgroundImage:
          "radial-gradient(circle at 50% 12%, rgba(73,112,171,.22), transparent 36%), linear-gradient(145deg, #172033 0%, #0D1422 48%, #182235 100%)",
      }}
    >
      <div
        className={`relative flex h-screen w-full flex-col overflow-hidden bg-bg ${
          // 폰·태블릿에서는 기기 프레임처럼 보이게 두고,
          // PC(lg 이상)에서는 테두리·둥근 모서리·비율 제한을 전부 걷어 화면을 꽉 채운다.
          `max-w-phone sm:h-[900px] sm:max-h-[94vh] sm:rounded-[44px] sm:border sm:border-[#52627B]
               md:aspect-[16/10] md:h-auto md:max-h-[calc(100vh-48px)] md:max-w-[calc((100vh-48px)*1.6)] md:rounded-[32px]
               sm:ring-1 sm:ring-white/10
               sm:shadow-[0_30px_90px_rgba(0,0,0,.65),0_0_45px_rgba(65,118,190,.18)]
               lg:aspect-auto lg:h-screen lg:max-h-none lg:max-w-none lg:rounded-none
               lg:border-0 lg:ring-0 lg:shadow-none`
        }`}
        style={{ backgroundImage: "radial-gradient(circle at 85% 8%, rgba(47,111,232,.12), transparent 32%), linear-gradient(180deg, #0B1423 0%, #08101D 100%)" }}
      >
        {/* 서비스 헤더 */}
        {!isLanding && <header className="z-20 flex h-14 shrink-0 items-center justify-between border-b border-transparent px-5 lg:h-[72px] lg:border-line/70 lg:px-9">
          <button onClick={() => navigate("/home")} className="text-[17px] font-bold tracking-[-.035em] text-ink lg:text-[21px]">
            Parallel Me
          </button>
          <div>
            {showProfile && (
              <button
                onClick={() => navigate("/settings")}
                aria-label="프로필 · 설정"
                className="tap flex h-10 w-10 items-center justify-center rounded-full border border-violet-400/25 bg-violet-500/10 text-violet-400 transition-colors hover:bg-violet-500/15"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="12" cy="8" r="3.2" />
                  <path d="M5 20c0-3.3 3.1-5.5 7-5.5s7 2.2 7 5.5" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>
        </header>}

        {/* 화면 본문 (스크롤) */}
        <main
          key={pathname}
          className={`no-scrollbar relative z-10 flex-1 ${isLanding ? "overflow-hidden p-0 [&>*]:h-full [&>*]:w-full [&>*]:max-w-none" : "overflow-y-auto px-5 pb-7 pt-1 lg:px-9 lg:pb-8 lg:pt-6 [&>*]:mx-auto [&>*]:w-full"} ${
            isLanding
              ? ""
              : useWideDesktop
                // PC 에서는 프레임과 함께 본문도 넓힌다 — 배치는 그대로 두고 폭만 늘린다.
                ? "[&>*]:max-w-[1120px] xl:[&>*]:max-w-[1320px] 2xl:[&>*]:max-w-[1500px]"
                : "[&>*]:max-w-phone"
          }`}
        >
          <Outlet />
        </main>

        {showTabBar && <TabBar />}
      </div>
    </div>
  );
}
