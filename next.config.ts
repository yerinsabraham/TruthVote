import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export for Firebase Hosting
  output: 'export',
  images: {
    // Disable Next.js image optimization (not supported in static export)
    // We'll use custom optimization with Firebase Storage
    unoptimized: true,
  },
  // Production optimizations
  reactStrictMode: true,
  // Trailing slash for better Firebase hosting compatibility
  trailingSlash: true,
};

export default nextConfig;
