import { sql } from "@vercel/postgres";
import type { Recording, Conversation, Task, Idea } from "@/lib/types";

// ---------------------------------------------------------------------------
// Recordings
// ---------------------------------------------------------------------------

export async function getRecentRecordings(days: number): Promise<Recording[]> {
  const result = await sql`
    SELECT id, filename, date, duration, created_at
    FROM recordings
    WHERE date >= CURRENT_DATE - ${days}::int
    ORDER BY date DESC, created_at DESC
  `;
  return result.rows as Recording[];
}

export async function getRecordingById(id: number): Promise<Recording | null> {
  const result = await sql`
    SELECT * FROM recordings WHERE id = ${id}
  `;
  return (result.rows[0] as Recording) ?? null;
}

// ---------------------------------------------------------------------------
// Conversations
// ---------------------------------------------------------------------------

export async function getConversationsByRecordingId(recordingId: number): Promise<Conversation[]> {
  const result = await sql`
    SELECT * FROM conversations
    WHERE recording_id = ${recordingId}
    ORDER BY start_time ASC
  `;
  return result.rows as Conversation[];
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

export async function getTasksByRecordingId(recordingId: number): Promise<Task[]> {
  const result = await sql`
    SELECT * FROM tasks
    WHERE recording_id = ${recordingId}
    ORDER BY created_at ASC
  `;
  return result.rows as Task[];
}

export async function getPendingTasks(): Promise<Task[]> {
  const result = await sql`
    SELECT t.*, r.filename, r.date AS recording_date
    FROM tasks t
    LEFT JOIN recordings r ON r.id = t.recording_id
    WHERE t.status = 'pending'
    ORDER BY
      CASE t.priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
      t.created_at DESC
  `;
  return result.rows as Task[];
}

export async function getAllTasks(): Promise<Task[]> {
  const result = await sql`
    SELECT t.*, r.filename, r.date AS recording_date
    FROM tasks t
    LEFT JOIN recordings r ON r.id = t.recording_id
    ORDER BY t.created_at DESC
  `;
  return result.rows as Task[];
}

export async function updateTaskStatus(id: number, status: string) {
  const result = await sql`
    UPDATE tasks SET status = ${status} WHERE id = ${id}
    RETURNING *
  `;
  return result.rows[0] ?? null;
}

// ---------------------------------------------------------------------------
// Ideas
// ---------------------------------------------------------------------------

export async function getRecentIdeas(limit: number): Promise<Idea[]> {
  const result = await sql`
    SELECT i.*, r.filename, r.date AS recording_date
    FROM ideas i
    LEFT JOIN recordings r ON r.id = i.recording_id
    ORDER BY i.created_at DESC
    LIMIT ${limit}
  `;
  return result.rows as Idea[];
}

export async function getIdeasByRecordingId(recordingId: number): Promise<Idea[]> {
  const result = await sql`
    SELECT * FROM ideas
    WHERE recording_id = ${recordingId}
    ORDER BY created_at ASC
  `;
  return result.rows as Idea[];
}

export async function getAllIdeas(): Promise<Idea[]> {
  const result = await sql`
    SELECT i.*, r.filename, r.date AS recording_date
    FROM ideas i
    LEFT JOIN recordings r ON r.id = i.recording_id
    ORDER BY i.created_at DESC
  `;
  return result.rows as Idea[];
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export async function getDashboardStats() {
  const result = await sql`
    SELECT
      (SELECT COUNT(*) FROM recordings WHERE date >= CURRENT_DATE - 7)::int AS recordings_7d,
      (SELECT COUNT(*) FROM tasks WHERE status = 'pending')::int            AS pending_tasks,
      (SELECT COUNT(*) FROM ideas WHERE created_at >= NOW() - INTERVAL '7 days')::int AS ideas_7d
  `;
  return result.rows[0];
}

// ---------------------------------------------------------------------------
// Transactional insert
// ---------------------------------------------------------------------------

interface ConversationInput {
  start_time?: string;
  end_time?: string;
  participants?: string[];
  summary?: string;
  context?: string;
}

interface TaskInput {
  description: string;
  priority?: "high" | "medium" | "low";
  conversation_index?: number; // index into conversations array to link
}

interface IdeaInput {
  content: string;
  tags?: string[];
}

interface InsertRecordingData {
  filename: string;
  date: string;
  duration?: number;
  transcript?: string;
  raw_result?: unknown;
  conversations?: ConversationInput[];
  tasks?: TaskInput[];
  ideas?: IdeaInput[];
}

export async function insertRecordingWithRelations(data: InsertRecordingData) {
  const {
    filename,
    date,
    duration = null,
    transcript = null,
    raw_result = null,
    conversations = [],
    tasks = [],
    ideas = [],
  } = data;

  // Start transaction
  await sql`BEGIN`;

  try {
    // 1. Insert recording
    const recResult = await sql`
      INSERT INTO recordings (filename, date, duration, transcript, raw_result)
      VALUES (${filename}, ${date}, ${duration}, ${transcript}, ${JSON.stringify(raw_result)})
      RETURNING id
    `;
    const recordingId: number = recResult.rows[0].id;

    // 2. Insert conversations and collect their IDs (by index)
    const conversationIds: (number | null)[] = [];
    for (const conv of conversations) {
      const participants = conv.participants ?? [];
      const convResult = await sql`
        INSERT INTO conversations (recording_id, start_time, end_time, participants, summary, context)
        VALUES (
          ${recordingId},
          ${conv.start_time ?? null},
          ${conv.end_time ?? null},
          ${participants as unknown as string},
          ${conv.summary ?? null},
          ${conv.context ?? null}
        )
        RETURNING id
      `;
      conversationIds.push(convResult.rows[0].id);
    }

    // 3. Insert tasks (optionally linking to a conversation by index)
    for (const task of tasks) {
      const conversationId =
        task.conversation_index != null
          ? conversationIds[task.conversation_index] ?? null
          : null;
      await sql`
        INSERT INTO tasks (recording_id, conversation_id, description, priority)
        VALUES (
          ${recordingId},
          ${conversationId},
          ${task.description},
          ${task.priority ?? "medium"}
        )
      `;
    }

    // 4. Insert ideas
    for (const idea of ideas) {
      const tags = idea.tags ?? [];
      await sql`
        INSERT INTO ideas (recording_id, content, tags)
        VALUES (${recordingId}, ${idea.content}, ${tags as unknown as string})
      `;
    }

    await sql`COMMIT`;
    return recordingId;
  } catch (error) {
    await sql`ROLLBACK`;
    throw error;
  }
}
