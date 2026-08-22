import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Pin Turbopack to the frontend app so the parent HexaCards lockfile
  // is not treated as the workspace root.
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
