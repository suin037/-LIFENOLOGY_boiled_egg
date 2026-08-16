import { NavLink } from "react-router-dom";
import { Home, Orbit, Bookmark } from "lucide-react";

function SparkleDiamond({ size = 20, strokeWidth: _strokeWidth, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M12 2.5c.7 5.35 4.15 8.8 9.5 9.5-5.35.7-8.8 4.15-9.5 9.5-.7-5.35-4.15-8.8-9.5-9.5 5.35-.7 8.8-4.15 9.5-9.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

const TABS = [
  { to: "/home", label: "홈", Icon: Home },
  { to: "/input", label: "시뮬레이션", Icon: SparkleDiamond },
  { to: "/my", label: "나의 우주", Icon: Orbit },
  { to: "/archive", label: "보관함", Icon: Bookmark },
];

export default function TabBar() {
  return (
    <nav data-tour="tabbar" className="z-30 mx-3 mb-2 flex rounded-[22px] border border-line bg-[#111B2AF2] px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_12px_36px_rgba(0,0,0,.35)] backdrop-blur-xl lg:mx-auto lg:mb-4 lg:w-[min(720px,calc(100%-48px))] lg:rounded-full lg:px-3 lg:py-1">
      {TABS.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          aria-label={label}
          title={label}
          className={({ isActive }) =>
            `tap flex flex-1 flex-col items-center justify-center gap-0.5 py-1 transition-colors lg:flex-row lg:gap-2 lg:py-2 ${
              isActive ? "text-violet-400" : "text-mut"
            }`
          }
        >
          {({ isActive }) => (
            <>
              <span className={`flex h-7 w-11 items-center justify-center rounded-lg ${isActive ? "bg-violet-500/15" : ""}`}>
                <Icon size={20} strokeWidth={isActive ? 2.5 : 1.9} />
              </span>
              <span className={`text-[10px] leading-none lg:text-[12px] ${isActive ? "font-semibold" : ""}`}>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
