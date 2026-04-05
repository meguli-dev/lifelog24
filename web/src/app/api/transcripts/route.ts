import { NextRequest, NextResponse } from "next/server";
import { getRecentRecordings } from "@/lib/db/queries";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") ?? "30", 10);

    const recordings = await getRecentRecordings(days);
    return NextResponse.json(recordings);
  } catch (error) {
    console.error("GET /api/transcripts error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
