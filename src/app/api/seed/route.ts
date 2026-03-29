import { NextResponse } from "next/server";
import { getErrorMessage } from "@/lib/demo-types";
import { seed, fixCompletedRecords } from "@/lib/seed";

export async function POST() {
  try {
    await seed();
    return NextResponse.json({ success: true, message: "Database seeded" });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

// GET /api/seed — patch existing COMPLETED records without wiping the DB
export async function GET() {
  try {
    const count = await fixCompletedRecords();
    return NextResponse.json({ success: true, patched: count });
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
