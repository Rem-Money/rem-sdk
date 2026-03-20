import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { PLACEHOLDER_INSTITUTION } from "@/lib/placeholder-entity";

// POST /api/redeem-request/:id/confirm-fiat
// Called when the institution confirms that the fiat wire has been received.
// This is the final gate before a redeem request is marked COMPLETED.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { bankConfirmationRef, confirmedBy } = body as {
      bankConfirmationRef?: string;
      confirmedBy?: string;
    };

    const request = await prisma.redeemRequest.findUnique({
      where: { id },
      include: { stablecoin: true, institution: true },
    });

    if (!request) {
      return NextResponse.json({ error: "Redeem request not found" }, { status: 404 });
    }

    // Only the owning institution can confirm
    if (request.institutionId !== PLACEHOLDER_INSTITUTION.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Must be in ON_CHAIN_CONFIRMED state — all prior steps must be done
    if (request.status !== "ON_CHAIN_CONFIRMED") {
      const reason =
        request.status === "COMPLETED"
          ? "This redeem request is already completed."
          : request.status === "COMPLIANCE_REVIEW" || request.status === "PENDING"
          ? "Compliance review has not been completed yet. Fiat cannot be confirmed until the on-chain burn is done."
          : request.status === "FAILED" || request.status === "REJECTED"
          ? `This request is ${request.status.toLowerCase()} and cannot be confirmed.`
          : `Cannot confirm fiat at current status: ${request.status}.`;

      return NextResponse.json({ error: reason }, { status: 409 });
    }

    // Fiat must be in INITIATED or WIRE_SENT state
    if (
      request.fiatSettlementStatus !== "INITIATED" &&
      request.fiatSettlementStatus !== "WIRE_SENT"
    ) {
      return NextResponse.json(
        { error: `Fiat settlement status is ${request.fiatSettlementStatus}. Cannot confirm.` },
        { status: 409 }
      );
    }

    const now = new Date();
    const completed = await prisma.redeemRequest.update({
      where: { id },
      data: {
        status: "COMPLETED",
        fiatSettlementStatus: "CONFIRMED",
        fiatReference: bankConfirmationRef ?? request.fiatReference,
        fiatConfirmedAt: now,
        // Append confirmation to travel rule data for audit trail
        travelRuleData: {
          ...(request.travelRuleData as object),
          fiatConfirmation: {
            confirmedAt: now.toISOString(),
            confirmedBy: confirmedBy ?? "Institution Operator",
            bankConfirmationRef: bankConfirmationRef ?? null,
          },
        },
      },
      include: { stablecoin: true },
    });

    return NextResponse.json({
      success: true,
      redeemRequest: completed,
      message: `Fiat receipt confirmed. Redeem request for ${request.amount.toLocaleString()} ${request.stablecoin.symbol} is now complete.`,
    });
  } catch (error: any) {
    console.error("Confirm fiat error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
