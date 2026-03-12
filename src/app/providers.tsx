"use client";

import { ArchiveProvider } from "@/lib/archive/context";

export default function Providers({ children }: Readonly<{ children: React.ReactNode }>) {
  return <ArchiveProvider>{children}</ArchiveProvider>;
}
