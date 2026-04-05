import { NextResponse } from 'next/server';
import {
  getRecordingById,
  getConversationsByRecordingId,
  getTasksByRecordingId,
  getIdeasByRecordingId,
} from '@/lib/db/queries';
import { recordingToMarkdown } from '@/lib/markdown';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const recordingId = Number(id);
  if (Number.isNaN(recordingId)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  const recording = await getRecordingById(recordingId);
  if (!recording) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const conversations = await getConversationsByRecordingId(recordingId);
  const tasks = await getTasksByRecordingId(recordingId);
  const ideas = await getIdeasByRecordingId(recordingId);

  const md = recordingToMarkdown(recording, conversations, tasks, ideas);
  const filename = recording.filename.replace(/\.[^.]+$/, '') + '.md';

  return new Response(md, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
