import type { Metadata, Viewport } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Школьные обращения — учебная копия",
  description: "Учебная копия сервиса школьных обращений. Данные только тестовые.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <header className="border-b border-slate-200 bg-white">
          <nav className="mx-auto flex max-w-3xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3">
            <Link href="/" className="w-full text-base font-semibold text-slate-900 sm:mr-auto sm:w-auto">
              Школьные обращения
            </Link>
            <Link href="/" className="text-sm text-slate-600 hover:text-slate-900">
              Подать
            </Link>
            <Link href="/status" className="text-sm text-slate-600 hover:text-slate-900">
              Статус
            </Link>
            <Link href="/moderator" className="text-sm text-slate-600 hover:text-slate-900">
              Модератор
            </Link>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">{children}</main>
        <footer className="border-t border-slate-200 bg-white">
          <p className="mx-auto max-w-3xl px-4 py-3 text-xs text-slate-500">
            Учебная копия. В прод не идёт, все данные тестовые.
          </p>
        </footer>
      </body>
    </html>
  );
}
