import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const stablecoins = await prisma.stablecoinMint.findMany({
      where: { active: true },
      orderBy: { symbol: "asc" },
    });
    return NextResponse.json(stablecoins);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
