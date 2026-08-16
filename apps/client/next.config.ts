import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["yjs", "y-protocols", "lib0"],
  transpilePackages: ["@repo/types"],
  reactStrictMode: false,
};

export default nextConfig;
