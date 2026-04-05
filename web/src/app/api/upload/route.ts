import { NextRequest, NextResponse } from "next/server";
import { insertRecordingWithRelations } from "@/lib/db/queries";

export async function POST(request: NextRequest) {
  try {
    // Authenticate
    const apiKey = request.headers.get("x-api-key");
    if (!apiKey || apiKey !== process.env.API_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Basic validation
    if (!body.filename || !body.date) {
      return NextResponse.json(
        { error: "filename and date are required" },
        { status: 400 },
      );
    }

    const recordingId = await insertRecordingWithRelations({
      filename: body.filename,
      date: body.date,
      duration: body.duration,
      transcript: body.transcript,
      raw_result: body.raw_result,
      conversations: body.conversations ?? [],
      tasks: body.tasks ?? [],
      ideas: body.ideas ?? [],
    });

    return NextResponse.json({ id: recordingId }, { status: 201 });
  } catch (error: unknown) {
    // Handle UNIQUE constraint violation on filename
    const pgError = error as { code?: string; constraint?: string };
    if (
      pgError.code === "23505" &&
      pgError.constraint?.includes("filename")
    ) {
      return NextResponse.json(
        { error: "Recording with this filename already exists" },
        { status: 409 },
      );
    }

    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
