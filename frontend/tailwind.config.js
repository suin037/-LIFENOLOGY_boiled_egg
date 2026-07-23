/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0B0F1C",
        card: "#141B2E",
        card2: "#1B2440",
        line: "#28324D",
        ink: "#EAF0FB",
        sub: "#9FB0CE",
        mut: "#5A6B8C",
        cyan: { DEFAULT: "#7FD4FF", deep: "#4A90E2" }, // 이직(A)
        gold: { DEFAULT: "#F5C86B", deep: "#E0954A" }, // 잔류(B)
        danger: "#EE8888",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Malgun Gothic",
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
