import { NextRequest, NextResponse } from "next/server";
import { getErrorMessage } from "@/lib/demo-types";
import { getTokenBalance } from "@/lib/solana";

export async function GET(req: NextRequest) {
  try {
    const wallet = req.nextUrl.searchParams.get("wallet");
    const mint = req.nextUrl.searchParams.get("mint");

    if (!wallet || !mint) {
      return NextResponse.json(
        { error: "Missing required query params: wallet and mint" },
        { status: 400 }
      );
    }

    const balance = await getTokenBalance(mint, wallet);
    return NextResponse.json({ balance });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
