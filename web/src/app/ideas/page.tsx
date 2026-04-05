export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { getAllIdeas } from '@/lib/db/queries';

export default async function IdeasPage() {
  const ideas = await getAllIdeas();

  return (
    <div>
      <h2 className="text-xl font-semibold text-zinc-900">アイデア</h2>

      {ideas.length === 0 ? (
        <p className="mt-6 text-sm text-zinc-500">
          アイデアがありません。
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {ideas.map((idea) => (
            <div
              key={idea.id}
              className="flex flex-col rounded-lg border border-zinc-200 bg-white p-5"
            >
              <p className="flex-1 text-sm leading-relaxed text-zinc-700">
                {idea.content}
              </p>

              {idea.tags && idea.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
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

              <div className="mt-3 flex items-center justify-between text-xs text-zinc-400">
                <span>
                  {new Date(idea.created_at).toLocaleDateString('ja-JP')}
                </span>
                {idea.recording_id && (
                  <Link
                    href={`/transcripts/${idea.recording_id}`}
                    className="hover:text-zinc-600"
                  >
                    録音を見る
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
