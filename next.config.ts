import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  // No floating Next.js badge in development previews.
  devIndicators: false,
  images: {
    // Static export: media is pre-optimized with ffmpeg into public/media.
    unoptimized: true,
  },
};

export default nextConfig;
