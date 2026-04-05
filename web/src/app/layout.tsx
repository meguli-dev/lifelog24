import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { NavLinks } from '@/components/nav-links';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Lifelog',
  description: 'Lifelog - 音声録音管理ダッシュボード',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex h-full min-h-screen bg-zinc-50 font-sans text-zinc-900">
        {/* Sidebar */}
        <aside className="fixed inset-y-0 left-0 z-10 flex w-56 flex-col border-r border-zinc-200 bg-white">
          <div className="flex h-14 items-center border-b border-zinc-200 px-4">
            <h1 className="text-lg font-semibold tracking-tight text-zinc-900">
              Lifelog
            </h1>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-4">
            <NavLinks />
          </div>
        </aside>

        {/* Main content */}
        <main className="ml-56 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-5xl px-8 py-8">{children}</div>
        </main>
      </body>
    </html>
  );
}
