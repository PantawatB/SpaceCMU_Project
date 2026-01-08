import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  reactCompiler: true,
  async rewrites() {
    return [
      {
        source: '/cmuEntraIDCallback',
        destination: 'http://localhost:3001/auth/cmu/callback',
      },
    ];
  },
};

export default nextConfig;
