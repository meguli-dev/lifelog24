export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getRecordingById,
  getConversationsByRecordingId,
  getTasksByRecordingId,
} from '@/lib/db/queries';
import { getAllIdeas } from '@/lib/db/queries';

function formatDuration(seconds: number | null): string {
  if (seconds == null) return '-';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function PriorityBadge({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    high: 'bg-red-100 text-red-700',
    medium: 'bg-yellow-100 text-yellow-700',
    low: 'bg-green-100 text-green-700',
  };
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${colors[priority] ?? 'bg-zinc-100 text-zinc-600'}`}
    >
      {priority}
    </span>
  );
}

export default async function RecordingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const recordingId = Number(id);

  if (Number.isNaN(recordingId)) notFound();

  const recording = await getRecordingById(recordingId);
  if (!recording) notFound();

  const conversations = await getConversationsByRecordingId(recordingId);
  const tasks = await getTasksByRecordingId(recordingId);

  // Get ideas for this recording - filter from all ideas
  // (assumes getAllIdeas returns ideas with recording_id)
  const allIdeas = await getAllIdeas();
  const ideas = allIdeas.filter((idea) => idea.recording_id === recordingId);

  return (
    <div>
      {/* Back link */}
      <Link
        href="/transcripts"
        className="text-sm text-zinc-500 hover:text-zinc-700"
      >
        &larr; 議事録一覧
      </Link>

      {/* Recording metadata */}
      <div className="mt-4 rounded-lg border border-zinc-200 bg-white p-5">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-zinc-900">
              {recording.filename}
            </h2>
            <div className="mt-2 flex gap-6 text-sm text-zinc-500">
              <span>日付: {recording.date}</span>
              <span>長さ: {formatDuration(recording.duration)}</span>
            </div>
          </div>
          <a
            href={`/api/transcripts/${recording.id}/download`}
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
          >
            MD ダウンロード
          </a>
        </div>
      </div>

      {/* Full transcript */}
      {recording.transcript && (
        <div className="mt-6">
          <h3 className="text-base font-semibold text-zinc-900">
            トランスクリプト
          </h3>
          <div className="mt-3 rounded-lg border border-zinc-200 bg-white p-5">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">
              {recording.transcript}
            </p>
          </div>
        </div>
      )}

      {/* Conversations */}
      {conversations.length > 0 && (
        <div className="mt-8">
          <h3 className="text-base font-semibold text-zinc-900">会話</h3>
          <div className="mt-3 space-y-3">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className="rounded-lg border border-zinc-200 bg-white p-4"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs text-zinc-400">
                    {conv.start_time} - {conv.end_time}
                  </span>
                  {conv.context && (
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
                      {conv.context}
                    </span>
                  )}
                </div>
                {conv.participants && conv.participants.length > 0 && (
                  <p className="mt-1 text-xs text-zinc-500">
                    参加者: {conv.participants.join(', ')}
                  </p>
                )}
                {conv.summary && (
                  <p className="mt-2 text-sm text-zinc-700">{conv.summary}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Related tasks */}
      {tasks.length > 0 && (
        <div className="mt-8">
          <h3 className="text-base font-semibold text-zinc-900">
            関連タスク
          </h3>
          <div className="mt-3 space-y-2">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3"
              >
                <PriorityBadge priority={task.priority} />
                <span
                  className={`flex-1 text-sm ${task.status === 'done' ? 'text-zinc-400 line-through' : 'text-zinc-800'}`}
                >
                  {task.description}
                </span>
                <span className="text-xs text-zinc-400">{task.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Related ideas */}
      {ideas.length > 0 && (
        <div className="mt-8">
          <h3 className="text-base font-semibold text-zinc-900">
            関連アイデア
          </h3>
          <div className="mt-3 space-y-2">
            {ideas.map((idea) => (
              <div
                key={idea.id}
                className="rounded-lg border border-zinc-200 bg-white p-4"
              >
                <p className="text-sm text-zinc-700">{idea.content}</p>
                {idea.tags && idea.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {idea.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
