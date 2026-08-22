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
    qualities: [75, 100],
  },
};

export default nextConfig;
