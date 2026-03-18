import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { PLACEHOLDER_INSTITUTION } from "@/lib/placeholder-entity";

export async function GET() {
  try {
    const records = await prisma.complianceRecord.findMany({
      where: { institutionId: PLACEHOLDER_INSTITUTION.id },
      include: { mintRequest: { include: { stablecoin: true } } },
      orderBy: { createdAt: "desc" },
    });

    const institution = await prisma.institution.findUnique({
      where: { id: PLACEHOLDER_INSTITUTION.id },
    });

    return NextResponse.json({ records, institution });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
