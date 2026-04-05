export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { getAllTasks } from '@/lib/db/queries';
import { TaskStatusToggle } from '@/components/task-status-toggle';

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

export default async function TasksPage() {
  const allTasks = await getAllTasks();

  const pendingTasks = allTasks.filter((t) => t.status === 'pending');
  const doneTasks = allTasks.filter((t) => t.status === 'done');

  return (
    <div>
      <h2 className="text-xl font-semibold text-zinc-900">タスク</h2>

      {allTasks.length === 0 ? (
        <p className="mt-6 text-sm text-zinc-500">タスクがありません。</p>
      ) : (
        <>
          {/* Pending tasks */}
          {pendingTasks.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-zinc-500">
                未完了 ({pendingTasks.length})
              </h3>
              <div className="mt-2 space-y-2">
                {pendingTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3"
                  >
                    <PriorityBadge priority={task.priority} />
                    <span className="flex-1 text-sm text-zinc-800">
                      {task.description}
                    </span>
                    {task.recording_id && (
                      <Link
                        href={`/transcripts/${task.recording_id}`}
                        className="text-xs text-zinc-400 hover:text-zinc-600"
                      >
                        録音を見る
                      </Link>
                    )}
                    <TaskStatusToggle
                      taskId={task.id}
                      currentStatus={task.status}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Done tasks */}
          {doneTasks.length > 0 && (
            <div className="mt-8">
              <h3 className="text-sm font-medium text-zinc-500">
                完了 ({doneTasks.length})
              </h3>
              <div className="mt-2 space-y-2">
                {doneTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3"
                  >
                    <PriorityBadge priority={task.priority} />
                    <span className="flex-1 text-sm text-zinc-400 line-through">
                      {task.description}
                    </span>
                    {task.recording_id && (
                      <Link
                        href={`/transcripts/${task.recording_id}`}
                        className="text-xs text-zinc-400 hover:text-zinc-600"
                      >
                        録音を見る
                      </Link>
                    )}
                    <TaskStatusToggle
                      taskId={task.id}
                      currentStatus={task.status}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
