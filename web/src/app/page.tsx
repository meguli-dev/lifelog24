export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { getDashboardStats, getRecentRecordings } from '@/lib/db/queries';

function formatDuration(seconds: number | null): string {
  if (seconds == null) return '-';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default async function DashboardPage() {
  const stats = await getDashboardStats();
  const recordings = await getRecentRecordings(7);

  return (
    <div>
      <h2 className="text-xl font-semibold text-zinc-900">ダッシュボード</h2>

      {/* Stat cards */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-zinc-200 bg-white p-5">
          <p className="text-sm text-zinc-500">録音数(7日)</p>
          <p className="mt-1 text-2xl font-semibold text-zinc-900">
            {stats.recordings_7d}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-5">
          <p className="text-sm text-zinc-500">未完了タスク</p>
          <p className="mt-1 text-2xl font-semibold text-zinc-900">
            {stats.pending_tasks}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-5">
          <p className="text-sm text-zinc-500">アイデア(7日)</p>
          <p className="mt-1 text-2xl font-semibold text-zinc-900">
            {stats.ideas_7d}
          </p>
        </div>
      </div>

      {/* Recent recordings */}
      <h3 className="mt-10 text-base font-semibold text-zinc-900">
        最近の録音
      </h3>

      {recordings.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500">録音がありません。</p>
      ) : (
        <div className="mt-4 overflow-hidden rounded-lg border border-zinc-200 bg-white">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                <th className="px-4 py-3">日付</th>
                <th className="px-4 py-3">ファイル名</th>
                <th className="px-4 py-3">長さ</th>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
