import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getErrorMessage } from "@/lib/demo-types";
import { PLACEHOLDER_INSTITUTION } from "@/lib/placeholder-entity";

const AML_BLOCK_THRESHOLD = 50;

type RedeemRequestBody = {
  stablecoinSymbol?: string;
  amount?: number;
  sourceWallet?: string;
  destinationBankAccount?: string;
  network?: string;
  settlementDetails?: Prisma.InputJsonObject;
};

export async function GET() {
  try {
    const requests = await prisma.redeemRequest.findMany({
      where: { institutionId: PLACEHOLDER_INSTITUTION.id },
      include: { stablecoin: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(requests);
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as RedeemRequestBody;
    const { stablecoinSymbol, amount, sourceWallet, destinationBankAccount, network, settlementDetails } = body;

    if (!stablecoinSymbol || !amount || !sourceWallet) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // ── Step 1: KYC ───────────────────────────────────────────────────────
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

    if (institution.kycStatus !== "VERIFIED") {
      return NextResponse.json(
        { error: `KYC not verified (status: ${institution.kycStatus}). Cannot process redeem request.` },
        { status: 403 }
      );
    }

    // ── Step 2: Stablecoin ────────────────────────────────────────────────
    const stablecoin = await prisma.stablecoinMint.findUnique({
      where: { symbol: stablecoinSymbol },
    });

    if (!stablecoin) {
      return NextResponse.json({ error: `Stablecoin ${stablecoinSymbol} not found` }, { status: 404 });
    }

    // ── Step 3: AML screening ─────────────────────────────────────────────
    const riskScore = Math.floor(Math.random() * 30) + 1;
    const amlFlagged =
      institution.amlStatus === "FLAGGED" ||
      institution.amlStatus === "BLOCKED" ||
      riskScore > AML_BLOCK_THRESHOLD;

    const amlScreening = {
      screeningId: `AML-${Date.now()}`,
      result: amlFlagged ? "FLAGGED" : "CLEAR",
      riskScore,
      checks: ["OFAC", "FinCEN", "EU-Sanctions", "UN-Sanctions"],
      checksPassed: amlFlagged ? 3 : 4,
      timestamp: new Date().toISOString(),
      ...(amlFlagged && { flags: ["MANUAL_REVIEW_REQUIRED"] }),
    };

    const beneficiaryBank =
      typeof settlementDetails?.beneficiaryBank === "string"
        ? settlementDetails.beneficiaryBank
        : "Settlement Bank";
    const paymentRails =
      typeof settlementDetails?.paymentRails === "string"
        ? settlementDetails.paymentRails
        : "SWIFT";
    const transferReference =
      typeof settlementDetails?.transferReference === "string"
        ? settlementDetails.transferReference
        : null;

    // ── Step 4: Travel Rule filing ────────────────────────────────────────
    const travelRuleData: Prisma.InputJsonObject = {
      originatorName: PLACEHOLDER_INSTITUTION.name,
      originatorLEI: PLACEHOLDER_INSTITUTION.leiCode,
      originatorJurisdiction: PLACEHOLDER_INSTITUTION.jurisdiction,
      originatorWallet: sourceWallet,
      beneficiaryInstitution: beneficiaryBank,
      beneficiaryAccount: destinationBankAccount ? "MASKED" : null,
      amount,
      currency: stablecoinSymbol,
      network: network ?? "solana-devnet",
      timestamp: new Date().toISOString(),
      fatfCompliant: !amlFlagged,
      vasp: "Apex Capital LLC",
      ...(settlementDetails ? { settlementDetails } : {}),
    };

    // ── Create request record ─────────────────────────────────────────────
    const redeemRequest = await prisma.redeemRequest.create({
      data: {
        institution: { connect: { id: institution.id } },
        stablecoin: { connect: { id: stablecoin.id } },
        amount,
        sourceWallet,
        destinationBankAccount: destinationBankAccount ?? null,
        status: "COMPLIANCE_REVIEW",
        complianceStatus: "IN_REVIEW",
        kycVerified: true,
        travelRuleData,
        amlScreening,
        fiatSettlementStatus: "NOT_INITIATED",
      },
      include: { stablecoin: true },
    });

    // ── Gate: AML must be clear ───────────────────────────────────────────
    if (amlFlagged) {
      return NextResponse.json(
        {
          success: false,
          blocked: true,
          blockedAt: "AML_SCREENING",
          redeemRequest,
          message: `Redeem blocked — AML risk score ${riskScore} requires manual compliance review. No tokens will be burned until cleared.`,
        },
        { status: 202 }
      );
    }

    // ── All compliance gates passed ───────────────────────────────────────
    await prisma.redeemRequest.update({
      where: { id: redeemRequest.id },
      data: { complianceStatus: "APPROVED", status: "APPROVED" },
    });

    // ── Step 5: On-chain burn/lock (simulated) ────────────────────────────
    // In production this would submit a burn transaction to the chain.
    // Here we record a mock signature representing the burn.
    const burnTxSig = `REDEEM_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

    // Tokens are now locked on-chain. Fiat settlement must be confirmed separately.
    const onChainConfirmed = await prisma.redeemRequest.update({
      where: { id: redeemRequest.id },
      data: {
        status: "ON_CHAIN_CONFIRMED",
        txSignature: burnTxSig,
        fiatSettlementStatus: "INITIATED",
        // Store payment rails + reference from settlementDetails
        fiatReference: transferReference,
      },
      include: { stablecoin: true },
    });

    // ── Intentionally stop here ───────────────────────────────────────────
    // The request is NOT marked COMPLETED. The issuer must send the wire and
    // the institution must confirm receipt before the request closes.
    return NextResponse.json({
      success: true,
      redeemRequest: onChainConfirmed,
      txSignature: burnTxSig,
      nextStep: "FIAT_CONFIRMATION",
      message: `Tokens burned on-chain (${burnTxSig}). The issuer will now send the fiat wire to ${beneficiaryBank} via ${paymentRails}. Confirm receipt once funds arrive to close this request.`,
    });
  } catch (error: unknown) {
    console.error("Redeem request error:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
