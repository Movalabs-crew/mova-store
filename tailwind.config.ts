import type { Config } from "tailwindcss";

const config: Config = {
  // Only real source directories are scanned. `./pages/**` used to be listed for
  // a Pages Router directory that does not exist in this App Router project, so
  // the glob resolved to nothing and advertised coverage the build did not have.
  //
  // `./lib/**` matters: `lib/accessibility.ts` applies the `sr-only` utility to
  // its live region. `styles/global.css` currently hand-writes a `.sr-only`
  // rule as well, so the class survives today by accident; scanning `lib/`
  // removes that dependency on the duplicate definition. `./hooks/**` and
  // `./context/**` are listed for the same reason - a utility introduced there
  // must not be purged.
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./context/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
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
