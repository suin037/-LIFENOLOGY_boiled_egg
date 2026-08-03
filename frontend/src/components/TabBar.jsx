import { NavLink } from "react-router-dom";
import { Home, BarChart3, Clock3, Bookmark } from "lucide-react";

const TABS = [
  { to: "/home", label: "홈", Icon: Home },
  { to: "/input", label: "시뮬레이션", Icon: BarChart3 },
  { to: "/my", label: "나의 우주", Icon: Clock3 },
  { to: "/archive", label: "보관함", Icon: Bookmark },
];

export default function TabBar() {
  return (
    <nav className="z-30 mx-3 mb-2 flex rounded-[22px] border border-line bg-[#111B2AF2] px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_12px_36px_rgba(0,0,0,.35)] backdrop-blur-xl">
      {TABS.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          aria-label={label}
          title={label}
          className={({ isActive }) =>
            `tap flex flex-1 flex-col items-center justify-center gap-0.5 py-1 transition-colors ${
              isActive ? "text-cyan" : "text-mut"
            }`
          }
        >
          {({ isActive }) => (
            <>
              <span className={`flex h-7 w-11 items-center justify-center rounded-lg ${isActive ? "bg-cyan/15" : ""}`}>
                <Icon size={20} strokeWidth={isActive ? 2.5 : 1.9} />
              </span>
              <span className={`text-[10px] leading-none ${isActive ? "font-semibold" : ""}`}>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
