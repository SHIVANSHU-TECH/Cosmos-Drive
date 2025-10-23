import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ✅ Allow builds to continue despite lint or TS errors (for local/dev)
  eslint: {
    ignoreDuringBuilds: true,
  },

  typescript: {
    ignoreBuildErrors: true,
  },

  // ✅ Proxy API calls to backend (Express, Flask, etc.)
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:3001/api/:path*", // your backend API
      },
      {
        source: "/api/embed",
        destination: "http://localhost:3001/api/embed", // explicitly handle /api/embed route
      },
    ];
  },

  // ✅ Allow image loading from Google Drive thumbnails
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },

  // ✅ (Optional but good practice)
  reactStrictMode: true,

  // ✅ Remove console.* in production bundles
  compiler: {
    removeConsole: true,
  },
};

export default nextConfig;
