import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */

   eslint: {
    ignoreDuringBuilds: true,
  },

  // ✅ (Optional) Allow build even if TypeScript type errors exist
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:3001/api/:path*",
      },
    ];
  },
};

export default nextConfig;