'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function TaskStatusToggle({
  taskId,
  currentStatus,
}: {
  taskId: number;
  currentStatus: 'pending' | 'done';
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const nextStatus = currentStatus === 'pending' ? 'done' : 'pending';

  async function handleToggle() {
    setLoading(true);
    try {
      await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, status: nextStatus }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`rounded border px-2 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
        currentStatus === 'pending'
          ? 'border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-50'
          : 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
      }`}
    >
      {loading ? '...' : currentStatus === 'pending' ? '完了にする' : '未完了に戻す'}
    </button>
  );
}
