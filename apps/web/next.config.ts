import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['@axiom/core'],
  experimental: {
    optimizePackageImports: ['@axiom/core'],
  },
};

export default nextConfig;
