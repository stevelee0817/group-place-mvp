import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "단체 모임 장소 찾기",
  description: "대학가 단체 모임을 위한 착석 가능성 기반 매장 탐색 MVP",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-slate-50 text-slate-950 antialiased">
        <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-white shadow-sm">
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
            <nav className="flex items-center justify-between text-sm">
              <Link href="/" className="font-bold text-slate-950">
                GroupSeat MVP
              </Link>
              <div className="flex items-center gap-3 text-slate-600">
                <Link href="/results" className="hover:text-slate-950">
                  결과
                </Link>
                <Link href="/manager" className="hover:text-slate-950">
                  관리자
                </Link>
              </div>
            </nav>
          </header>
          <main className="flex-1 px-4 py-5">{children}</main>
        </div>
      </body>
    </html>
  );
}
