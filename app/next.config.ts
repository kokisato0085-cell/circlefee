import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.9"],
  serverExternalPackages: ["web-push"],
  async rewrites() {
    return [
      { source: "/icon-192.png", destination: "/api/icon?size=192" },
      { source: "/icon-512.png", destination: "/api/icon?size=512" },
    ];
  },
};

export default nextConfig;
