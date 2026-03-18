import { NextResponse } from "next/server";
import { seed } from "@/lib/seed";

export async function POST() {
  try {
    await seed();
    return NextResponse.json({ success: true, message: "Database seeded" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
