import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getErrorMessage } from "@/lib/demo-types";
import { PLACEHOLDER_INSTITUTION } from "@/lib/placeholder-entity";

type MintRequestBody = {
  stablecoinSymbol?: string;
  amount?: number;
  destinationWallet?: string;
  travelRuleData?: Prisma.InputJsonObject;
  bankTransferDetails?: Prisma.InputJsonObject;
  network?: string;
};

export async function GET() {
  try {
    const requests = await prisma.mintRequest.findMany({
      where: { institutionId: PLACEHOLDER_INSTITUTION.id },
      include: { stablecoin: true, complianceRecord: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(requests);
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as MintRequestBody;
    const { stablecoinSymbol, amount, destinationWallet, travelRuleData, bankTransferDetails, network } = body;

    if (!stablecoinSymbol || !amount || !destinationWallet) {
      return NextResponse.json(
        { error: "Missing required fields: stablecoinSymbol, amount, destinationWallet" },
        { status: 400 }
      );
    }
    if (amount <= 0 || amount > 10_000_000) {
      return NextResponse.json({ error: "Amount must be between 0 and 10,000,000" }, { status: 400 });
    }

    // ── Step 1: KYC gate ─────────────────────────────────────────────────
    let institution = await prisma.institution.findUnique({ where: { id: PLACEHOLDER_INSTITUTION.id } });
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

    if (institution.kycStatus !== "VERIFIED") {
      return NextResponse.json(
        { error: `KYC not verified (status: ${institution.kycStatus}). Complete KYC before submitting.` },
        { status: 403 }
      );
    }

    // ── Step 2: Stablecoin lookup ─────────────────────────────────────────
    const stablecoin = await prisma.stablecoinMint.findUnique({ where: { symbol: stablecoinSymbol } });
    if (!stablecoin) {
      return NextResponse.json({ error: `Stablecoin ${stablecoinSymbol} not found` }, { status: 404 });
    }

    // ── Step 3: AML screening (simulated) ────────────────────────────────
    const riskScore = Math.floor(Math.random() * 25) + 1; // 1–25 = low risk in demo
    const amlResult = institution.amlStatus === "CLEAR" ? "CLEAR" : "FLAGGED";
    const amlScreening = {
      screeningId: `AML-${Date.now()}`,
      result: amlResult,
      riskScore,
      checks: ["OFAC", "FinCEN", "EU-Sanctions", "UN-Sanctions"],
      checksPassed: 4,
      timestamp: new Date().toISOString(),
    };

    if (amlResult !== "CLEAR") {
      return NextResponse.json(
        { error: `AML screening flagged this institution (status: ${institution.amlStatus}). Request blocked.` },
        { status: 403 }
      );
    }

    // ── Step 4: Travel Rule filing ────────────────────────────────────────
    const travelRule: Prisma.InputJsonObject = {
      originatorName: PLACEHOLDER_INSTITUTION.name,
      originatorLEI: PLACEHOLDER_INSTITUTION.leiCode,
      originatorJurisdiction: PLACEHOLDER_INSTITUTION.jurisdiction,
      originatorWallet: PLACEHOLDER_INSTITUTION.walletAddress,
      beneficiaryWallet: destinationWallet,
      amount,
      currency: stablecoinSymbol,
      network: network ?? "solana-devnet",
      timestamp: new Date().toISOString(),
      fatfCompliant: true,
      vasp: "AMINA Bank AG ",
      vaspId: "APEX-001",
      ...(bankTransferDetails ? { bankTransferDetails } : {}),
      ...(travelRuleData ?? {}),
    };

    // ── Create request — all compliance steps already verified ────────────
    // Status is APPROVED immediately (KYC ✅ AML ✅ Travel Rule ✅ Compliance ✅).
    // On-chain mint is NOT triggered here — it requires an issuer action (script).
    const mintRequest = await prisma.mintRequest.create({
      data: {
        institution: { connect: { id: institution.id } },
        stablecoin: { connect: { id: stablecoin.id } },
        amount,
        destinationWallet,
        status: "APPROVED",
        complianceStatus: "APPROVED",
        kycVerified: true,
        travelRuleData: travelRule,
        amlScreening,
      },
      include: { stablecoin: true },
    });

    await prisma.complianceRecord.create({
      data: {
        institution: { connect: { id: institution.id } },
        mintRequest: { connect: { id: mintRequest.id } },
        recordType: "MINT_REQUEST",
        status: "APPROVED",
        riskScore,
        jurisdiction: PLACEHOLDER_INSTITUTION.jurisdiction,
        travelRuleData: travelRule,
        kycData: {
          status: institution.kycStatus,
          verifiedAt: "2025-01-15T00:00:00Z",
          provider: "Jumio",
          documentType: "LEI_CERTIFICATE",
        },
        amlData: amlScreening,
        fatfStatus: "COMPLIANT",
        ofacScreening: "CLEAR",
        notes: "KYC verified · AML clear · Travel Rule filed · Awaiting issuer on-chain mint",
        reviewedBy: "AutoCompliance Engine v2.1",
        reviewedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      mintRequest,
      nextStep: "ISSUER_MINT",
      message: "All compliance checks passed. Request is APPROVED and queued for on-chain mint by the issuer.",
    });
  } catch (error: unknown) {
    console.error("Mint request error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
