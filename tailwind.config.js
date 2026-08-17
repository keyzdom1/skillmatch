/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "rgb(var(--color-ink) / <alpha-value>)",
        paper: "rgb(var(--color-paper) / <alpha-value>)",
        card: "rgb(var(--color-card) / <alpha-value>)",
        highlighter: "rgb(var(--color-highlighter) / <alpha-value>)",
        coral: "rgb(var(--color-coral) / <alpha-value>)",
        teal: "rgb(var(--color-teal) / <alpha-value>)",
        slate: "rgb(var(--color-slate) / <alpha-value>)",
      },
      fontFamily: {
        display: ["var(--font-space-grotesk)", "sans-serif"],
        body: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-plex-mono)", "monospace"],
      },
      borderRadius: {
        control: "8px",
        card: "16px",
      },
      spacing: {
        // 4px base scale — use alongside Tailwind's default scale
        18: "4.5rem",
      },
    },
  },
  plugins: [],
};
