import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { mintTokens, ensureMintExists } from "@/lib/solana";
import { PLACEHOLDER_INSTITUTION } from "@/lib/placeholder-entity";

// GET - list mint requests
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

// POST - create and process a mint request
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { stablecoinSymbol, amount, destinationWallet, travelRuleData } = body;

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

    // Get stablecoin
    let stablecoin = await prisma.stablecoinMint.findUnique({
      where: { symbol: stablecoinSymbol },
    });

    if (!stablecoin) {
      return NextResponse.json(
        { error: `Stablecoin ${stablecoinSymbol} not found` },
        { status: 404 }
      );
    }

    // Build travel rule data
    const travelRule = {
      originatorName: PLACEHOLDER_INSTITUTION.name,
      originatorLEI: PLACEHOLDER_INSTITUTION.leiCode,
      originatorJurisdiction: PLACEHOLDER_INSTITUTION.jurisdiction,
      originatorWallet: PLACEHOLDER_INSTITUTION.walletAddress,
      beneficiaryWallet: destinationWallet,
      amount,
      currency: stablecoinSymbol,
      timestamp: new Date().toISOString(),
      fatfCompliant: true,
      vasp: "Apex Capital LLC",
      vaspId: "APEX-001",
      ...travelRuleData,
    };

    // AML screening result (mock)
    const amlScreening = {
      screeningId: `AML-${Date.now()}`,
      result: "CLEAR",
      riskScore: Math.floor(Math.random() * 20) + 1, // 1–20 = low risk
      checks: ["OFAC", "FinCEN", "EU-Sanctions", "UN-Sanctions"],
      checksPassed: 4,
      timestamp: new Date().toISOString(),
    };

    // Create the mint request in DB
    const mintRequest = await prisma.mintRequest.create({
      data: {
        institutionId: PLACEHOLDER_INSTITUTION.id,
        stablecoinMintId: stablecoin.id,
        amount,
        destinationWallet,
        status: "COMPLIANCE_REVIEW",
        complianceStatus: "IN_REVIEW",
        kycVerified: institution.kycStatus === "VERIFIED",
        travelRuleData: travelRule,
        amlScreening,
      },
      include: { stablecoin: true },
    });

    // Create compliance record
    const complianceRecord = await prisma.complianceRecord.create({
      data: {
        institutionId: PLACEHOLDER_INSTITUTION.id,
        mintRequestId: mintRequest.id,
        recordType: "MINT_REQUEST",
        status: "IN_REVIEW",
        riskScore: amlScreening.riskScore,
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
        notes: "Auto-approved: KYC verified, AML clear, FATF compliant",
      },
    });

    // Auto-approve if KYC verified and AML clear (for this demo)
    if (institution.kycStatus === "VERIFIED" && institution.amlStatus === "CLEAR") {
      await prisma.mintRequest.update({
        where: { id: mintRequest.id },
        data: {
          status: "APPROVED",
          complianceStatus: "APPROVED",
        },
      });

      await prisma.complianceRecord.update({
        where: { id: complianceRecord.id },
        data: {
          status: "APPROVED",
          reviewedBy: "AutoCompliance Engine v2.1",
          reviewedAt: new Date(),
        },
      });

      // Now attempt to mint on Solana
      try {
        // For USDX: ensure mint exists and mint tokens
        if (stablecoinSymbol === "USDX") {
          const mintAddress = await ensureMintExists(stablecoin.mintAddress);

          // Update mint address if it changed
          if (mintAddress !== stablecoin.mintAddress) {
            await prisma.stablecoinMint.update({
              where: { id: stablecoin.id },
              data: { mintAddress },
            });
          }

          const txSignature = await mintTokens(
            mintAddress,
            destinationWallet,
            amount,
            stablecoin.decimals
          );

          const finalRequest = await prisma.mintRequest.update({
            where: { id: mintRequest.id },
            data: {
              status: "COMPLETED",
              txSignature,
            },
            include: { stablecoin: true, complianceRecord: true },
          });

          return NextResponse.json({
            success: true,
            mintRequest: finalRequest,
            txSignature,
            explorerUrl: `https://explorer.solana.com/tx/${txSignature}?cluster=devnet`,
          });
        } else {
          // For other stablecoins (USDC, EURC) in demo mode: mark as completed with simulated tx
          const mockTxSig = `DEMO_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
          const finalRequest = await prisma.mintRequest.update({
            where: { id: mintRequest.id },
            data: {
              status: "COMPLETED",
              txSignature: mockTxSig,
            },
            include: { stablecoin: true, complianceRecord: true },
          });

          return NextResponse.json({
            success: true,
            mintRequest: finalRequest,
            txSignature: mockTxSig,
            note: `${stablecoinSymbol} is simulated on devnet. USDX uses live Solana mint.`,
          });
        }
      } catch (solanaError: any) {
        // Solana mint failed – record error
        const failedRequest = await prisma.mintRequest.update({
          where: { id: mintRequest.id },
          data: {
            status: "FAILED",
            txError: solanaError.message,
          },
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
    }

    return NextResponse.json({
      success: true,
      mintRequest,
      message: "Mint request created and pending compliance review",
    });
  } catch (error: any) {
    console.error("Mint request error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
