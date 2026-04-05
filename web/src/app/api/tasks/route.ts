import { NextRequest, NextResponse } from "next/server";
import { getAllTasks, updateTaskStatus } from "@/lib/db/queries";

export async function GET() {
  try {
    const tasks = await getAllTasks();
    return NextResponse.json(tasks);
  } catch (error) {
    console.error("GET /api/tasks error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.id || !body.status) {
      return NextResponse.json(
        { error: "id and status are required" },
        { status: 400 },
      );
    }

    if (!["pending", "done"].includes(body.status)) {
      return NextResponse.json(
        { error: "status must be 'pending' or 'done'" },
        { status: 400 },
      );
    }

    const task = await updateTaskStatus(body.id, body.status);

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error("PATCH /api/tasks error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
