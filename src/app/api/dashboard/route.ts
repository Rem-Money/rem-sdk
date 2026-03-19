import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { PLACEHOLDER_INSTITUTION } from "@/lib/placeholder-entity";

export async function GET() {
  try {
    const [mintRequests, redeemRequests, complianceRecords, stablecoins] =
      await Promise.all([
        prisma.mintRequest.findMany({
          where: { institutionId: PLACEHOLDER_INSTITUTION.id },
          include: { stablecoin: true },
          orderBy: { createdAt: "desc" },
          take: 5,
        }),
        prisma.redeemRequest.findMany({
          where: { institutionId: PLACEHOLDER_INSTITUTION.id },
          include: { stablecoin: true },
          orderBy: { createdAt: "desc" },
          take: 5,
        }),
        prisma.complianceRecord.findMany({
          where: { institutionId: PLACEHOLDER_INSTITUTION.id },
          orderBy: { createdAt: "desc" },
          take: 10,
        }),
        prisma.stablecoinMint.findMany({ where: { active: true } }),
      ]);

    // Per-coin aggregates — all-time, not just the recent-5 slice
    const [allMints, allRedeems] = await Promise.all([
      prisma.mintRequest.findMany({
        where: { institutionId: PLACEHOLDER_INSTITUTION.id, status: "COMPLETED" },
        select: { stablecoinMintId: true, amount: true },
      }),
      prisma.redeemRequest.findMany({
        where: { institutionId: PLACEHOLDER_INSTITUTION.id, status: "COMPLETED" },
        select: { stablecoinMintId: true, amount: true },
      }),
    ]);

    const mintedByCoin: Record<string, number> = {};
    const redeemedByCoin: Record<string, number> = {};
    for (const m of allMints)
      mintedByCoin[m.stablecoinMintId] = (mintedByCoin[m.stablecoinMintId] ?? 0) + m.amount;
    for (const r of allRedeems)
      redeemedByCoin[r.stablecoinMintId] = (redeemedByCoin[r.stablecoinMintId] ?? 0) + r.amount;

    const enrichedStablecoins = stablecoins.map((coin) => ({
      ...coin,
      totalMinted: mintedByCoin[coin.id] ?? 0,
      totalRedeemed: redeemedByCoin[coin.id] ?? 0,
      netCirculating: (mintedByCoin[coin.id] ?? 0) - (redeemedByCoin[coin.id] ?? 0),
    }));

    const totalMinted = mintRequests
      .filter((r) => r.status === "COMPLETED")
      .reduce((sum, r) => sum + r.amount, 0);

    const totalRedeemed = redeemRequests
      .filter((r) => r.status === "COMPLETED")
      .reduce((sum, r) => sum + r.amount, 0);

    const pendingCompliance = complianceRecords.filter(
      (r) => r.status === "IN_REVIEW" || r.status === "PENDING"
    ).length;

    return NextResponse.json({
      stats: {
        totalMinted,
        totalRedeemed,
        pendingCompliance,
        activeStablecoins: stablecoins.length,
      },
      recentMintRequests: mintRequests,
      recentRedeemRequests: redeemRequests,
      recentCompliance: complianceRecords,
      stablecoins: enrichedStablecoins,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
