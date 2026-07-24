import { NavLink } from "react-router-dom";

const TABS = [
  { to: "/home", label: "홈", icon: "☰" },
  { to: "/input", label: "시뮬레이션", icon: "✦" },
  { to: "/my", label: "나의 우주", icon: "🪐" },
  { to: "/archive", label: "보관함", icon: "🗂" },
  { to: "/settings", label: "설정", icon: "⚙" },
];

export default function TabBar() {
  return (
    <nav className="z-30 flex border-t border-line bg-[#0a1020]">
      {TABS.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          className={({ isActive }) =>
            `tap flex flex-1 flex-col items-center justify-center gap-1 py-2 pb-4 text-[10px] transition-colors ${
              isActive ? "text-cyan" : "text-mut"
            }`
          }
        >
          <span className="text-[17px] leading-none">{t.icon}</span>
          {t.label}
        </NavLink>
      ))}
    </nav>
  );
}
