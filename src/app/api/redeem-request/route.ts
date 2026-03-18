import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { PLACEHOLDER_INSTITUTION } from "@/lib/placeholder-entity";

export async function GET() {
  try {
    const requests = await prisma.redeemRequest.findMany({
      where: { institutionId: PLACEHOLDER_INSTITUTION.id },
      include: { stablecoin: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(requests);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { stablecoinSymbol, amount, sourceWallet, destinationBankAccount } = body;

    if (!stablecoinSymbol || !amount || !sourceWallet) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Ensure institution exists
    let institution = await prisma.institution.findUnique({
      where: { id: PLACEHOLDER_INSTITUTION.id },
    });

    if (!institution) {
      institution = await prisma.institution.create({
        data: {
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
    }

    const stablecoin = await prisma.stablecoinMint.findUnique({
      where: { symbol: stablecoinSymbol },
    });

    if (!stablecoin) {
      return NextResponse.json(
        { error: `Stablecoin ${stablecoinSymbol} not found` },
        { status: 404 }
      );
    }

    const travelRuleData = {
      originatorName: PLACEHOLDER_INSTITUTION.name,
      originatorLEI: PLACEHOLDER_INSTITUTION.leiCode,
      originatorWallet: sourceWallet,
      beneficiaryInstitution: "Settlement Bank",
      beneficiaryAccount: destinationBankAccount ?? "MASKED",
      amount,
      currency: stablecoinSymbol,
      timestamp: new Date().toISOString(),
      fatfCompliant: true,
    };

    const redeemRequest = await prisma.redeemRequest.create({
      data: {
        institutionId: PLACEHOLDER_INSTITUTION.id,
        stablecoinMintId: stablecoin.id,
        amount,
        sourceWallet,
        destinationBankAccount: destinationBankAccount ?? null,
        status: "COMPLIANCE_REVIEW",
        complianceStatus: "IN_REVIEW",
        kycVerified: true,
        travelRuleData,
      },
      include: { stablecoin: true },
    });

    // Auto-approve for demo
    const mockTxSig = `REDEEM_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const updated = await prisma.redeemRequest.update({
      where: { id: redeemRequest.id },
      data: {
        status: "COMPLETED",
        complianceStatus: "APPROVED",
        txSignature: mockTxSig,
      },
      include: { stablecoin: true },
    });

    return NextResponse.json({
      success: true,
      redeemRequest: updated,
      txSignature: mockTxSig,
    });
  } catch (error: any) {
    console.error("Redeem request error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
