import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { mintTokens, ensureMintExists } from "@/lib/solana";
import { PLACEHOLDER_INSTITUTION } from "@/lib/placeholder-entity";

// AML risk score above this threshold blocks the request for manual review
const AML_BLOCK_THRESHOLD = 50;

export async function GET() {
  try {
    const requests = await prisma.mintRequest.findMany({
      where: { institutionId: PLACEHOLDER_INSTITUTION.id },
      include: { stablecoin: true, complianceRecord: true },
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
    const { stablecoinSymbol, amount, destinationWallet, travelRuleData, bankTransferDetails, network } = body;

    if (!stablecoinSymbol || !amount || !destinationWallet) {
      return NextResponse.json(
        { error: "Missing required fields: stablecoinSymbol, amount, destinationWallet" },
        { status: 400 }
      );
    }

    if (amount <= 0 || amount > 10_000_000) {
      return NextResponse.json(
        { error: "Amount must be between 0 and 10,000,000" },
        { status: 400 }
      );
    }

    // ── Step 1: Institution & KYC ────────────────────────────────────────
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

    const kycVerified = institution.kycStatus === "VERIFIED";
    if (!kycVerified) {
      return NextResponse.json(
        { error: `KYC not verified. Current status: ${institution.kycStatus}. Complete KYC before submitting a mint request.` },
        { status: 403 }
      );
    }

    // ── Step 2: Stablecoin lookup ────────────────────────────────────────
    const stablecoin = await prisma.stablecoinMint.findUnique({
      where: { symbol: stablecoinSymbol },
    });

    if (!stablecoin) {
      return NextResponse.json({ error: `Stablecoin ${stablecoinSymbol} not found` }, { status: 404 });
    }

    // ── Step 3: AML screening ────────────────────────────────────────────
    // Risk score is simulated; in production this would call a screening provider.
    const riskScore = Math.floor(Math.random() * 30) + 1; // 1–30 = low-medium
    const amlFlagged = institution.amlStatus === "FLAGGED" || institution.amlStatus === "BLOCKED" || riskScore > AML_BLOCK_THRESHOLD;

    const amlScreening = {
      screeningId: `AML-${Date.now()}`,
      result: amlFlagged ? "FLAGGED" : "CLEAR",
      riskScore,
      checks: ["OFAC", "FinCEN", "EU-Sanctions", "UN-Sanctions"],
      checksPassed: amlFlagged ? 3 : 4,
      timestamp: new Date().toISOString(),
      ...(amlFlagged && { flags: ["MANUAL_REVIEW_REQUIRED"] }),
    };

    // ── Step 4: Travel Rule ──────────────────────────────────────────────
    const travelRule = {
      originatorName: PLACEHOLDER_INSTITUTION.name,
      originatorLEI: PLACEHOLDER_INSTITUTION.leiCode,
      originatorJurisdiction: PLACEHOLDER_INSTITUTION.jurisdiction,
      originatorWallet: PLACEHOLDER_INSTITUTION.walletAddress,
      beneficiaryWallet: destinationWallet,
      amount,
      currency: stablecoinSymbol,
      network: network ?? "solana-devnet",
      timestamp: new Date().toISOString(),
      fatfCompliant: !amlFlagged,
      vasp: "Apex Capital LLC",
      vaspId: "APEX-001",
      ...(bankTransferDetails && { bankTransferDetails }),
      ...travelRuleData,
    };

    // ── Create request record ─────────────────────────────────────────────
    const mintRequest = await prisma.mintRequest.create({
      data: {
        institution: { connect: { id: institution.id } },
        stablecoin: { connect: { id: stablecoin.id } },
        amount,
        destinationWallet,
        status: "COMPLIANCE_REVIEW",
        complianceStatus: "IN_REVIEW",
        kycVerified: true,
        travelRuleData: travelRule,
        amlScreening,
      },
      include: { stablecoin: true },
    });

    const complianceRecord = await prisma.complianceRecord.create({
      data: {
        institution: { connect: { id: institution.id } },
        mintRequest: { connect: { id: mintRequest.id } },
        recordType: "MINT_REQUEST",
        status: "IN_REVIEW",
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
        fatfStatus: amlFlagged ? "UNDER_REVIEW" : "COMPLIANT",
        ofacScreening: amlFlagged ? "PENDING" : "CLEAR",
        notes: amlFlagged
          ? `AML flagged — risk score ${riskScore} exceeds threshold ${AML_BLOCK_THRESHOLD}. Manual review required before mint can proceed.`
          : "Auto-approved: KYC verified, AML clear, FATF compliant",
      },
    });

    // ── Gate: AML must be clear before proceeding ─────────────────────────
    if (amlFlagged) {
      return NextResponse.json(
        {
          success: false,
          blocked: true,
          blockedAt: "AML_SCREENING",
          mintRequest,
          message: `Mint blocked — AML risk score ${riskScore} requires manual compliance review. Request has been filed and will be reviewed within 1 business day.`,
        },
        { status: 202 }
      );
    }

    // ── All compliance gates passed — approve ─────────────────────────────
    await prisma.mintRequest.update({
      where: { id: mintRequest.id },
      data: { status: "APPROVED", complianceStatus: "APPROVED" },
    });

    await prisma.complianceRecord.update({
      where: { id: complianceRecord.id },
      data: {
        status: "APPROVED",
        reviewedBy: "AutoCompliance Engine v2.1",
        reviewedAt: new Date(),
      },
    });

    // ── Step 5: On-chain mint ─────────────────────────────────────────────
    try {
      if (stablecoinSymbol === "USDX") {
        const mintAddress = await ensureMintExists(stablecoin.mintAddress);

        if (mintAddress !== stablecoin.mintAddress) {
          await prisma.stablecoinMint.update({
            where: { id: stablecoin.id },
            data: { mintAddress },
          });
        }

        const txSignature = await mintTokens(mintAddress, destinationWallet, amount, stablecoin.decimals);

        const finalRequest = await prisma.mintRequest.update({
          where: { id: mintRequest.id },
          data: { status: "COMPLETED", txSignature },
          include: { stablecoin: true, complianceRecord: true },
        });

        return NextResponse.json({
          success: true,
          mintRequest: finalRequest,
          txSignature,
          explorerUrl: `https://explorer.solana.com/tx/${txSignature}?cluster=devnet`,
        });
      } else {
        // USDC / EURC — simulated on devnet
        const mockTxSig = `DEMO_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
        const finalRequest = await prisma.mintRequest.update({
          where: { id: mintRequest.id },
          data: { status: "COMPLETED", txSignature: mockTxSig },
          include: { stablecoin: true, complianceRecord: true },
        });

        return NextResponse.json({
          success: true,
          mintRequest: finalRequest,
          txSignature: mockTxSig,
          note: `${stablecoinSymbol} is simulated on devnet. USDX uses a live Solana mint.`,
        });
      }
    } catch (solanaError: any) {
      const failedRequest = await prisma.mintRequest.update({
        where: { id: mintRequest.id },
        data: { status: "FAILED", txError: solanaError.message },
        include: { stablecoin: true, complianceRecord: true },
      });

      return NextResponse.json(
        {
          success: false,
          mintRequest: failedRequest,
          error: `Compliance approved but on-chain mint failed: ${solanaError.message}`,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Mint request error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
