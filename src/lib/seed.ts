// Run this once to seed initial data: npx ts-node -e "import('./src/lib/seed').then(m => m.seed())"
// Or call via API: POST /api/seed

import { prisma } from "./db";
import { PLACEHOLDER_INSTITUTION } from "./placeholder-entity";
import { ensureMintExists } from "./solana";

export async function seed() {
  console.log("Seeding database...");

  // Upsert placeholder institution
  const institution = await prisma.institution.upsert({
    where: { id: PLACEHOLDER_INSTITUTION.id },
    update: {},
    create: {
      id: PLACEHOLDER_INSTITUTION.id,
      name: PLACEHOLDER_INSTITUTION.name,
      leiCode: PLACEHOLDER_INSTITUTION.leiCode,
      jurisdiction: PLACEHOLDER_INSTITUTION.jurisdiction,
      entityType: PLACEHOLDER_INSTITUTION.entityType,
      walletAddress: PLACEHOLDER_INSTITUTION.walletAddress,
      kycStatus: "VERIFIED",
      amlStatus: "CLEAR",
    },
  });

  console.log("Institution seeded:", institution.id);

  // Seed stablecoins
  const stablecoins = [
    {
      symbol: "USDX",
      name: "USD Extended (Mock)",
      mintAddress: process.env.MOCK_USDX_OPERATOR_PUBLIC_KEY ?? "GyQMwcby9mcvjZoxJpFuoiDQyhVTdAjdiYMX2worFi4e",
      decimals: 6,
    },
    {
      symbol: "USDC",
      name: "USD Coin",
      mintAddress: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU", // USDC devnet
      decimals: 6,
    },
    {
      symbol: "EURC",
      name: "Euro Coin (Mock)",
      mintAddress: "HzwqbKZw8HxMN6bF2yFZNrht3c2iXXzpKcFu7uBEDKtr", // placeholder devnet
      decimals: 6,
    },
  ];

  for (const coin of stablecoins) {
    await prisma.stablecoinMint.upsert({
      where: { symbol: coin.symbol },
      update: {},
      create: {
        symbol: coin.symbol,
        name: coin.name,
        mintAddress: coin.mintAddress,
        decimals: coin.decimals,
        network: "devnet",
        active: true,
      },
    });
    console.log("Stablecoin seeded:", coin.symbol);
  }

  console.log("Seed complete.");
}
