/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1D2B4F",
        paper: "#F5F6F2",
        highlighter: "#D7FF3D",
        coral: "#FF5A3C",
        teal: "#16866B",
        slate: "#8A8F9C",
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
