/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#1E6B45",
        emerald: {
          50: "#f0fdf4",
          100: "#dcfce7",
          400: "#4ade80",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
        },
        status: {
          success: "#1E6B45",
          "success-bg": "#EAF4EE",
          warning: "#E8A020",
          "warning-bg": "#FEF3E2",
          danger: "#EF4444",
          "danger-bg": "#FEE2E2",
          neutral: "#6B7280",
          "neutral-bg": "#F4F2EE",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "zoom-in-95": {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        in: "fade-in 0.2s ease-out",
        "zoom-in-95": "zoom-in-95 0.15s ease-out",
      },
    },
  },
  plugins: [],
};
