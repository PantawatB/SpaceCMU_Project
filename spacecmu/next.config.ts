import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  reactCompiler: true,
  async rewrites() {
    return [
      {
        source: '/cmuEntraIDCallback',
        destination: 'http://localhost:3001/api/auth/cmu/callback',
      },
    ];
  },
};

export default nextConfig;
