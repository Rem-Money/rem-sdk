import { NextResponse } from "next/server";
import { seed, fixCompletedRecords } from "@/lib/seed";

export async function POST() {
  try {
    await seed();
    return NextResponse.json({ success: true, message: "Database seeded" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET /api/seed — patch existing COMPLETED records without wiping the DB
export async function GET() {
  try {
    const count = await fixCompletedRecords();
    return NextResponse.json({ success: true, patched: count });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
