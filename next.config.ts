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
  // Disable TypeScript checking during build (run separately)
  typescript: {
    ignoreBuildErrors: true,
  },
  // Optimize CSS loading to reduce preload warnings
  experimental: {
    optimizeCss: false, // Disable CSS optimization for static export
  },
  // Optimize production bundle
  productionBrowserSourceMaps: false,
  compress: true,
};

export default nextConfig;
