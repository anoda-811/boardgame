import type { NextConfig } from "next";

const isolationHeaders = [
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      { source: "/", headers: isolationHeaders },
      { source: "/:path*", headers: isolationHeaders },
    ];
  },
};

export default nextConfig;
