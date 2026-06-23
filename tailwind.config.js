/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // ── Client brand palette (Paleta de colores) ──────────────────────
        primary: { DEFAULT: "#1A2151", 600: "#151a42", 700: "#10142f" }, // navy
        secondary: { DEFAULT: "#00B8FF", 600: "#0096d6", 700: "#007bb3" }, // sky blue
        tertiary: { DEFAULT: "#9E00BE", 600: "#85009f" }, // purple
        "g-dark": "#5C5B5F",
        "g-mid": "#E3E4E8",
        "g-light": "#EDEDED",

        // ── Semantic aliases (so shared primitives follow the brand) ───────
        base: "#EDEDED",
        surface: {
          DEFAULT: "#FFFFFF",
          raised: "#F7F8FA",
          overlay: "#EDEDED",
        },
        line: {
          DEFAULT: "#E3E4E8",
          strong: "#D2D4DA",
        },
        ink: {
          DEFAULT: "#1A2151",
          muted: "#5C5B5F",
          faint: "#9A9CA6",
        },
        // brand == secondary blue (the interactive accent)
        brand: {
          50: "#e6f7ff",
          100: "#cceeff",
          300: "#66d4ff",
          400: "#33c6ff",
          500: "#00B8FF",
          600: "#0096d6",
          700: "#007bb3",
          glow: "rgba(0,184,255,0.35)",
        },
        telemetry: { 400: "#00B8FF", 500: "#0096d6", 600: "#007bb3", 700: "#005f8c" },
        ok: "#22C55E",
        warn: "#F59E0B",
        danger: "#EF4444",
      },
      fontFamily: {
        display: ['"Inter"', "system-ui", "sans-serif"],
        sans: ['"Inter"', "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem" }],
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1rem",
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(0,184,255,0.2), 0 8px 32px -8px rgba(0,184,255,0.35)",
        "glow-sm": "0 6px 18px -6px rgba(0,184,255,0.45)",
        panel: "0 1px 2px 0 rgba(26,33,81,0.04), 0 2px 8px -2px rgba(26,33,81,0.08)",
        card: "0 16px 48px rgba(26,33,81,0.11)",
        lift: "0 12px 32px -12px rgba(26,33,81,0.18)",
        nav: "0 8px 24px -8px rgba(26,33,81,0.35)",
      },
      backgroundImage: {
        "brand-sheen": "linear-gradient(135deg, #00B8FF 0%, #9E00BE 100%)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "panel-in": {
          "0%": { transform: "translateX(105%)" },
          "100%": { transform: "translateX(0)" },
        },
        "badge-pop": {
          "0%,100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.07)" },
        },
        shimmer: { "100%": { transform: "translateX(100%)" } },
      },
      animation: {
        "fade-up": "fade-up 0.45s ease-out both",
        "badge-pop": "badge-pop 2.2s ease-in-out infinite",
        shimmer: "shimmer 1.6s infinite",
      },
    },
  },
  plugins: [],
};
