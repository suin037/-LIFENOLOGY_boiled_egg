/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#09111F",
        card: "#111B2A",
        card2: "#172337",
        line: "#26354A",
        ink: "#F6F8FC",
        sub: "#B8C2D2",
        mut: "#748198",
        cyan: { DEFAULT: "#4C91FF", deep: "#2F6FE8" }, // 선택 A / primary
        gold: { DEFAULT: "#FF9F32", deep: "#E98418" }, // 선택 B
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
      // Desktop preview size. Real mobile screens still use w-full.
      maxWidth: { phone: "450px" },
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
