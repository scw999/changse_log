"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowRight,
  BookMarked,
  BookOpenText,
  Compass,
  Dumbbell,
  Home,
  NotebookPen,
  Search,
  Settings2,
  Sparkles,
} from "lucide-react";

import { NAV_ITEMS } from "@/lib/archive/config";
import { useArchive } from "@/lib/archive/context";
import { cx } from "@/lib/archive/utils";

const navIcons = {
  "/": Home,
  "/recent": Search,
  "/thoughts": NotebookPen,
  "/words": BookMarked,
  "/content": BookOpenText,
  "/places": Compass,
  "/activities": Dumbbell,
  "/review": Sparkles,
  "/admin": Settings2,
};

export function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const { records, isAuthenticated, signOut, userEmail } = useArchive();

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[-10%] top-[-6rem] h-72 w-72 rounded-full bg-amber-200/35 blur-3xl" />
        <div className="absolute right-[-8%] top-[10rem] h-80 w-80 rounded-full bg-rose-200/35 blur-3xl" />
        <div className="absolute bottom-[-8rem] left-[28%] h-96 w-96 rounded-full bg-emerald-200/30 blur-3xl" />
      </div>

      <div className="mx-auto max-w-[1500px] px-3 py-3 sm:px-4 md:px-6 md:py-6">
        <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-6">
          <aside className="hidden lg:block">
            <div className="sticky top-6 space-y-4">
              <div className="panel overflow-hidden p-6">
                <p className="text-xs uppercase tracking-[0.34em] text-stone-500">Private Archive</p>
                <h1 className="mt-4 font-display text-[2.15rem] leading-none text-stone-950">창세록</h1>
                <p className="mt-4 text-sm leading-7 text-stone-600">
                  삶의 기록을 구조화해 저장하고, 다시 읽고 연결을 발견하는 개인 아카이브입니다.
                </p>
                <div className="mt-6 soft-panel px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-stone-500">Archive Direction</p>
                  <p className="mt-2 text-sm leading-6 text-stone-700">
                    웹에서는 탐색과 편집을, 창세봇과 internal API는 정리된 기록의 안전한 저장과 보정을 담당합니다.
                  </p>
                </div>
              </div>

              <nav className="panel p-3">
                <ul className="space-y-1.5">
                  {NAV_ITEMS.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = navIcons[item.href as keyof typeof navIcons];

                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={cx(
                            "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition",
                            isActive
                              ? "border border-amber-200/80 bg-gradient-to-r from-amber-100 via-rose-50 to-white text-stone-900 shadow-lg shadow-amber-100/60"
                              : "text-stone-600 hover:bg-white/60 hover:text-stone-900",
                          )}
                        >
                          <Icon className={cx("h-4 w-4", isActive && "text-amber-700")} />
                          <span>{item.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </nav>

              <div className="soft-panel px-5 py-5">
                <p className="text-xs uppercase tracking-[0.3em] text-stone-500">Current Size</p>
                <p className="mt-3 font-display text-3xl text-stone-950">{records.length}개</p>
                <p className="mt-2 text-sm leading-6 text-stone-600">
                  생각, 단어, 콘텐츠, 장소, 활동 기록을 한 흐름 안에서 같이 탐색합니다.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {isAuthenticated ? (
                    <>
                      <Link
                        href="/admin"
                        className="rounded-full border border-amber-200/80 bg-white/90 px-3 py-2 text-xs text-stone-700"
                      >
                        관리자
                      </Link>
                      <button
                        type="button"
                        onClick={() => void signOut()}
                        className="rounded-full border border-stone-200 bg-white/90 px-3 py-2 text-xs text-stone-700"
                      >
                        로그아웃
                      </button>
                    </>
                  ) : (
                    <Link
                      href="/login"
                      className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/80 bg-white/90 px-3 py-2 text-xs text-stone-700"
                    >
                      로그인
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  )}
                </div>
                {userEmail ? <p className="mt-3 truncate text-xs text-stone-500">{userEmail}</p> : null}
              </div>
            </div>
          </aside>

          <div className="min-w-0 space-y-4 lg:space-y-6">
            <header className="panel px-4 py-4 sm:px-5 lg:hidden">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.3em] text-stone-500">Private Archive</p>
                  <h1 className="mt-2 break-keep font-display text-[2rem] leading-none text-stone-950">
                    창세록
                  </h1>
                </div>
                <div className="shrink-0 rounded-full border border-amber-200/80 bg-white/80 px-3 py-1.5 text-[11px] text-stone-700">
                  {records.length}개
                </div>
              </div>

              <p className="mt-3 text-sm leading-6 text-stone-600">
                개인 기록을 저장하고 다시 이어 보는 private archive.
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {isAuthenticated ? (
                  <>
                    <Link
                      href="/admin"
                      className="rounded-full border border-amber-200/80 bg-white/90 px-3 py-2 text-xs text-stone-700"
                    >
                      관리자
                    </Link>
                    <button
                      type="button"
                      onClick={() => void signOut()}
                      className="rounded-full border border-stone-200 bg-white/90 px-3 py-2 text-xs text-stone-700"
                    >
                      로그아웃
                    </button>
                  </>
                ) : (
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/80 bg-white/90 px-3 py-2 text-xs text-stone-700"
                  >
                    로그인
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {NAV_ITEMS.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = navIcons[item.href as keyof typeof navIcons];

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cx(
                        "flex min-w-0 items-center justify-center gap-1.5 rounded-2xl border px-2 py-2.5 text-xs transition",
                        isActive
                          ? "border-amber-200/80 bg-gradient-to-r from-amber-100 via-rose-50 to-white text-stone-900 shadow-sm"
                          : "border-stone-200 bg-white/70 text-stone-600",
                      )}
                    >
                      <Icon className={cx("h-3.5 w-3.5 shrink-0", isActive && "text-amber-700")} />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </header>

            <main className="min-w-0">{children}</main>
          </div>
        </div>
      </div>
    </div>
  );
}
