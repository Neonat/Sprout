import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root. Without this, Next walks up and finds a stray
  // package-lock.json in the home directory and infers the wrong root.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
