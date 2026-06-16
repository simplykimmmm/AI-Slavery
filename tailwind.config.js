/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        "neon-blue": "0 0 24px rgba(34, 211, 238, 0.18)",
        "neon-red": "0 0 24px rgba(248, 113, 113, 0.18)",
        "panel": "0 18px 60px rgba(0, 0, 0, 0.35)",
      },
      colors: {
        command: {
          black: "#050608",
          panel: "#0d1117",
          panel2: "#12121b",
          line: "rgba(148, 163, 184, 0.18)",
          cyan: "#22d3ee",
          violet: "#a78bfa",
          red: "#fb7185",
          amber: "#f59e0b",
          green: "#34d399",
        },
      },
      fontFamily: {
        display: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: [
          "JetBrains Mono",
          "SFMono-Regular",
          "Consolas",
          "Liberation Mono",
          "monospace",
        ],
      },
    },
  },
  plugins: [],
};
