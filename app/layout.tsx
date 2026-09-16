import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Big Mikan - Tilmelding",
  description: "Tilmelding til Big Mikans sejladser for besætningen.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="da" className="scroll-smooth">
      <body className="min-h-screen font-sans">
        <header className="border-b border-sea-border bg-sea-surface">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <Link href="/" className="text-lg font-semibold text-sea-primary">
              ⛵ Big Mikan
            </Link>
            <nav className="flex gap-4 text-sm text-sea-muted">
              <Link href="/" className="hover:text-sea-primary">
                Tilmelding
              </Link>
              <Link href="/overblik" className="hover:text-sea-primary">
                Overblik
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
