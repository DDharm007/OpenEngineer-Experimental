import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Warnings shouldn't block production builds - run `npm run lint` separately
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
