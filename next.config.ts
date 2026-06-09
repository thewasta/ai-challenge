import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack is enabled by default in Next.js 16
  // Server external packages for better-sqlite3
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
