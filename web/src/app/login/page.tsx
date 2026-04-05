'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      router.push('/');
      router.refresh();
    } else {
      setError('パスワードが正しくありません');
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-8"
      >
        <h1 className="text-xl font-semibold text-zinc-900">Lifelog</h1>
        <p className="mt-1 text-sm text-zinc-500">パスワードを入力してください</p>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="パスワード"
          className="mt-6 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
          autoFocus
        />

        {error && (
          <p className="mt-2 text-sm text-red-600">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-4 w-full rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {loading ? 'ログイン中...' : '��グイン'}
        </button>
      </form>
    </div>
  );
}
