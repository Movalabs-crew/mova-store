/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  reactStrictMode: true,
  compress: true,
  poweredByHeader: false,

  async headers() {
    // Origins the app legitimately talks to. The configured RPC URL (if any) is
    // added on top of the network defaults so a self-hosted node keeps working.
    const rpcOrigins = new Set([
      "https://*.stellar.org",
      "https://soroban-rpc.mainnet.stellar.gateway.fm",
      "https://soroban-testnet.stellar.gateway.fm",
      "https://friendbot.stellar.org",
    ]);
    const configuredRpc = process.env.NEXT_PUBLIC_STELLAR_RPC_URL;
    if (configuredRpc) rpcOrigins.add(configuredRpc.replace(/\/$/, ""));

    const isDev = process.env.NODE_ENV !== "production";
    const contentSecurityPolicy = [
      "default-src 'self'",
      // Next.js injects inline bootstrap/hydration scripts and the theme
      // no-flash script, so 'unsafe-inline' is required. 'unsafe-eval' is only
      // needed by the dev server.
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.supabase.co https://lh3.googleusercontent.com https://images.unsplash.com",
      "font-src 'self' data:",
      `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.emailjs.com ${[...rpcOrigins].join(" ")}`,
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "object-src 'none'",
      "form-action 'self'",
    ].join("; ");

    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: contentSecurityPolicy,
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ];
  },

  experimental: {
    // Required for Next.js 14 to load the root `instrumentation.ts` hook.
    instrumentationHook: true,
    optimizePackageImports: [
      "react-icons",
      "@stellar/stellar-sdk",
      "@supabase/supabase-js",
    ],
  },
};

export default nextConfig;
