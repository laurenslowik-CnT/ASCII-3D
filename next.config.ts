import { fileURLToPath } from "node:url";
import createJiti from "jiti";
import type { NextConfig } from "next";
const jiti = createJiti(fileURLToPath(import.meta.url));

// Import env here to validate during build. Using jiti we can import .ts files
jiti("./src/env");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  reactCompiler: true,
  cacheComponents: true,
};

export default nextConfig;
