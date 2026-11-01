/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        navy: {
          950: "#070b14",
          900: "#0b1120",
          850: "#0f172a",
          800: "#1e293b",
          700: "#334155",
          600: "#475569"
        },
        brand: {
          blue: "#38bdf8",
          teal: "#14b8a6",
          emerald: "#10b981",
          purple: "#a855f7",
          amber: "#f59e0b",
          rose: "#f43f5e"
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif']
      }
    },
  },
  plugins: [],
}
