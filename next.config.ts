import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["@solana/web3.js", "@solana/spl-token", "bs58"],
  turbopack: {},
  typescript: {
    ignoreBuildErrors: true,
  }
};

export default nextConfig;
