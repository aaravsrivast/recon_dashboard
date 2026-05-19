import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: { DEFAULT: "#0A0C10", subtle: "#0F1117" },
        surface: { DEFAULT: "#141720", raised: "#1C2030", overlay: "#242840" },
        border: { DEFAULT: "#252A3A", strong: "#353B52" },
        text: {
          primary: "#F0F2F7",
          secondary: "#8B92A8",
          muted: "#555C73",
          inverse: "#0A0C10",
        },
        accent: { DEFAULT: "#4F7EFF", hover: "#6B93FF", muted: "#1A2E5A" },
        success: { DEFAULT: "#1DB87E", muted: "#0D3326" },
        warning: { DEFAULT: "#F5A623", muted: "#3D2800" },
        danger: { DEFAULT: "#E8455A", muted: "#3D0E14" },
        info: { DEFAULT: "#38BDF8", muted: "#0C2A3D" },
        severity: {
          low: "#1DB87E",
          medium: "#F5A623",
          high: "#E8455A",
          critical: "#FF2D55",
        },
      },
      fontFamily: {
        display: ["'IBM Plex Mono'", "monospace"],
        body: ["'DM Sans'", "sans-serif"],
        data: ["'JetBrains Mono'", "monospace"],
      },
      fontSize: {
        "display-lg": ["2.25rem", { lineHeight: "1.1", letterSpacing: "-0.03em" }],
        display: ["1.75rem", { lineHeight: "1.15", letterSpacing: "-0.025em" }],
        heading: ["1.25rem", { lineHeight: "1.3", letterSpacing: "-0.015em" }],
        subheading: ["0.9375rem", { lineHeight: "1.5" }],
        body: ["0.875rem", { lineHeight: "1.6" }],
        caption: ["0.75rem", { lineHeight: "1.5", letterSpacing: "0.01em" }],
        data: ["0.8125rem", { lineHeight: "1.4", letterSpacing: "0.005em" }],
        "mono-sm": ["0.6875rem", { lineHeight: "1.4", letterSpacing: "0.04em" }],
      },
      borderRadius: {
        xs: "3px",
        sm: "5px",
        md: "8px",
        lg: "12px",
        xl: "16px",
        "2xl": "20px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.4), 0 1px 1px rgba(0,0,0,0.3)",
        raised: "0 4px 12px rgba(0,0,0,0.5), 0 1px 3px rgba(0,0,0,0.4)",
        "glow-accent": "0 0 20px rgba(79,126,255,0.2)",
        "glow-danger": "0 0 20px rgba(232,69,90,0.2)",
        "glow-success": "0 0 20px rgba(29,184,126,0.2)",
      },
      animation: {
        "fade-in": "fadeIn 0.2s ease-out",
        "slide-up": "slideUp 0.25s ease-out",
        "pulse-slow": "pulse 3s cubic-bezier(0.4,0,0.6,1) infinite",
        "count-up": "countUp 0.6s ease-out",
        shimmer: "shimmer 1.5s infinite",
      },
      keyframes: {
        fadeIn: { from: { opacity: "0" }, to: { opacity: "1" } },
        slideUp: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        countUp: {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
