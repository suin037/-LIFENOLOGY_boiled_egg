/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#101216",
        card: "#191C22",
        card2: "#20242C",
        line: "#2A2F39",
        ink: "#F4F6F8",
        sub: "#B2B8C3",
        mut: "#767E8C",
        cyan: { DEFAULT: "#7C9BFF", deep: "#5878E8" }, // 선택 A / primary
        gold: { DEFAULT: "#F3B867", deep: "#D99338" }, // 선택 B
        danger: "#FF7B7B",
      },
      fontFamily: {
        sans: [
          "Pretendard",
          "Pretendard Variable",
          "-apple-system",
          "BlinkMacSystemFont",
          "system-ui",
          "Roboto",
          "sans-serif",
        ],
      },
      maxWidth: { phone: "430px" },
      keyframes: {
        fade: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "none" },
        },
        spin: { to: { transform: "rotate(360deg)" } },
        driftA: { "50%": { transform: "translateX(-18px)" } },
        driftB: { "50%": { transform: "translateX(18px)" } },
        twinkle: { "50%": { opacity: "0.2" } },
      },
      animation: {
        fade: "fade .35s ease",
        "spin-slow": "spin 3s linear infinite",
        driftA: "driftA 3s ease-in-out infinite",
        driftB: "driftB 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
