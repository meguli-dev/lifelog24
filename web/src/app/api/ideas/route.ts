import { NextResponse } from "next/server";
import { getAllIdeas } from "@/lib/db/queries";

export async function GET() {
  try {
    const ideas = await getAllIdeas();
    return NextResponse.json(ideas);
  } catch (error) {
    console.error("GET /api/ideas error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
