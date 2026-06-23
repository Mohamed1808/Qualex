import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        base: "#0f0f0f",
        card: "#161616",
        panel: "#1c1c22",
        border: "#2a2a2a",
        "telesales-accent": "#3B82F6",
        "ds-accent": "#14B8A6",
        "sla-breach": "#F26161",
        qualified: "#22C55E",
        warning: "#F59E0B",
        muted: "#6B7280",
        "muted-foreground": "#9CA3AF",
      },
      backgroundColor: {
        base: "#0f0f0f",
        card: "#161616",
        panel: "#1c1c22",
      },
      borderColor: {
        DEFAULT: "#2a2a2a",
      },
      animation: {
        pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [],
};
export default config;
