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
          className={({ isActive }) =>
            `tap flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium transition-colors ${
              isActive ? "text-cyan" : "text-mut"
            }`
          }
        >
          {({ isActive }) => (
            <>
              <span className={`flex h-8 w-10 items-center justify-center rounded-xl ${isActive ? "bg-cyan/10" : ""}`}>
                <Icon size={20} strokeWidth={isActive ? 2.3 : 1.8} />
              </span>
              {label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
