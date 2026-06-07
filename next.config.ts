import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a self-contained build at .next/standalone for a minimal Docker image.
  output: 'standalone',
};

export default nextConfig;
