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
      stablecoins,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
