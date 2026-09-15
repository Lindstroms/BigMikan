import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        sea: {
          bg: "#F5F8FA",
          surface: "#FFFFFF",
          border: "#DCE5EA",
          ink: "#122B3A",
          muted: "#5A7080",
          primary: "#0B4F6C",
          primaryDark: "#083A51",
          accent: "#1B8A5A",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
