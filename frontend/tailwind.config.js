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
        cyan: { DEFAULT: "#8B6CCF", deep: "#8B6CCF" }, // single violet accent
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
      // 화면 프레임 폭 — 삼성 갤럭시 탭(세로) 기준 800px. (실제 기기는 w-full로 꽉 참)
      maxWidth: { phone: "800px" },
      keyframes: {
        fade: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "none" },
        },
        sheetUp: {
          from: { opacity: "0", transform: "translateY(100%)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        backdropIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        spin: { to: { transform: "rotate(360deg)" } },
        driftA: { "50%": { transform: "translateX(-18px)" } },
        driftB: { "50%": { transform: "translateX(18px)" } },
        twinkle: { "50%": { opacity: "0.2" } },
        cometOrbit: {
          from: { transform: "translate(-50%, -50%) rotate(0deg)" },
          to: { transform: "translate(-50%, -50%) rotate(360deg)" },
        },
        cometGlow: {
          "0%, 100%": { opacity: ".7", transform: "scale(.88)" },
          "50%": { opacity: "1", transform: "scale(1.14)" },
        },
      },
      animation: {
        fade: "fade .35s ease",
        "sheet-up": "sheetUp .28s cubic-bezier(.22,.8,.25,1)",
        "backdrop-in": "backdropIn .2s ease-out",
        "spin-slow": "spin 3s linear infinite",
        driftA: "driftA 3s ease-in-out infinite",
        driftB: "driftB 3s ease-in-out infinite",
        "comet-orbit": "cometOrbit 2.4s linear infinite",
        "comet-glow": "cometGlow 1.15s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
