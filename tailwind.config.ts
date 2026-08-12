import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        mova: {
          violet: "#6d28d9",
          deep: "#4c1d95",
          bright: "#8b5cf6",
          soft: "#c4b5fd",
          mist: "#ede9fe",
          ink: "#1e1033",
          surface: "#f7f4ff",
        },
      },
      fontFamily: {
        display: ["var(--font-mova-display)", "Georgia", "serif"],
        body: ["var(--font-mova-body)", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "custom-image": "url('/images/mova-landing.png')",
        "auth-image": "url('/images/welcome-mova.png')",
        "error-image": "url('/images/notfoundimage.png')",
        "mova-hero":
          "linear-gradient(135deg, rgba(30,16,51,0.72) 0%, rgba(76,29,149,0.55) 45%, rgba(109,40,217,0.35) 100%), url('/images/mova-landing.png')",
        "mova-mesh":
          "radial-gradient(at 20% 20%, rgba(139,92,246,0.35) 0, transparent 50%), radial-gradient(at 80% 0%, rgba(109,40,217,0.25) 0, transparent 45%), radial-gradient(at 50% 100%, rgba(196,181,253,0.4) 0, transparent 50%)",
      },
      boxShadow: {
        mova: "0 18px 50px -20px rgba(109, 40, 217, 0.45)",
      },
    },
  },
  plugins: [],
};
export default config;
