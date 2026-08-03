import { NavLink } from "react-router-dom";
import { Home, Sparkles, Orbit, Bookmark } from "lucide-react";

const TABS = [
  { to: "/home", label: "홈", Icon: Home },
  { to: "/input", label: "시뮬레이션", Icon: Sparkles },
  { to: "/my", label: "나의 우주", Icon: Orbit },
  { to: "/archive", label: "보관함", Icon: Bookmark },
];

export default function TabBar() {
  return (
    <nav className="z-30 mx-3 mb-2 flex rounded-[22px] border border-line/60 bg-[#191C22F2] px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_12px_36px_rgba(0,0,0,.28)] backdrop-blur-xl">
      {TABS.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          aria-label={label}
          title={label}
          className={({ isActive }) =>
            `tap flex flex-1 items-center justify-center py-1.5 transition-colors ${
              isActive ? "text-cyan" : "text-mut"
            }`
          }
        >
          {({ isActive }) => (
            <>
              <span className={`flex h-9 w-12 items-center justify-center rounded-xl ${isActive ? "bg-cyan/10" : ""}`}>
                <Icon size={20} strokeWidth={isActive ? 2.3 : 1.8} />
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
