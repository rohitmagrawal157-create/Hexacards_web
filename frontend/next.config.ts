import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // The experimental React compiler can add significant CPU/memory overhead
  // on larger Next.js apps and make local dev/build feel stuck.
  // Keep the default compiler to avoid the heavy compile path.
  turbopack: {
    root: rootDir,
  },
  images: {
    // Vercel Services deployment: /_next/image optimizer returns 404.
    // Serve public/Images/* directly (works on production CDN).
    unoptimized: true,
    qualities: [75, 100],
  },
};

export default nextConfig;
