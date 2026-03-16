// v2: use NEXT_PUBLIC_API_URL env for backend URL
import type { NextConfig } from "next";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const backendHostname = (() => {
  try { return new URL(BACKEND_URL).hostname; } catch { return 'localhost'; }
})();
const backendProtocol = BACKEND_URL.startsWith('https') ? 'https' : 'http';
const backendPort = (() => {
  try {
    const p = new URL(BACKEND_URL).port;
    return p || '';
  } catch { return '3001'; }
})();

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
        port: '',
        pathname: '/api/**',
      },
      {
        protocol: 'https',
        hostname: 'example.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: backendProtocol as 'http' | 'https',
        hostname: backendHostname,
        port: backendPort,
        pathname: '/uploads/**',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/cmuEntraIDCallback',
        destination: `${BACKEND_URL}/api/auth/cmu/callback`,
      },
    ];
  },
};

export default nextConfig;
