import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@solana/web3.js", "@solana/spl-token", "bs58"],
  turbopack: {},
};

export default nextConfig;
