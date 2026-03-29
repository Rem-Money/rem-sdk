import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getErrorMessage } from "@/lib/demo-types";

export async function GET() {
  try {
    const stablecoins = await prisma.stablecoinMint.findMany({
      where: { active: true },
      orderBy: { symbol: "asc" },
    });
    return NextResponse.json(stablecoins);
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
