export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { getRecentRecordings } from '@/lib/db/queries';

function formatDuration(seconds: number | null): string {
  if (seconds == null) return '-';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default async function TranscriptsPage() {
  const recordings = await getRecentRecordings(30);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-zinc-900">議事録</h2>
        {recordings.length > 0 && (
          <a
            href="/api/transcripts/download"
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
          >
            一括ダウンロード (ZIP)
          </a>
        )}
      </div>

      {recordings.length === 0 ? (
        <p className="mt-6 text-sm text-zinc-500">録音がありません。</p>
      ) : (
        <div className="mt-6 overflow-hidden rounded-lg border border-zinc-200 bg-white">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                <th className="px-4 py-3">日付</th>
                <th className="px-4 py-3">ファイル名</th>
                <th className="px-4 py-3">長さ</th>
                <th className="px-4 py-3">会話数</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {recordings.map((rec) => (
                <tr
                  key={rec.id}
                  className="transition-colors hover:bg-zinc-50"
                >
                  <td className="whitespace-nowrap px-4 py-3 text-zinc-600">
                    {rec.date}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/transcripts/${rec.id}`}
                      className="text-zinc-900 underline decoration-zinc-300 hover:decoration-zinc-600"
                    >
                      {rec.filename}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-zinc-600">
                    {formatDuration(rec.duration)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-zinc-600">
                    {rec.conversation_count ?? '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
