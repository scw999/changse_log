"use client";

import { ArchiveProvider, type ArchiveBootstrapState } from "@/lib/archive/context";

export default function Providers({
  children,
  initialState,
}: Readonly<{
  children: React.ReactNode;
  initialState?: ArchiveBootstrapState;
}>) {
  return <ArchiveProvider initialState={initialState}>{children}</ArchiveProvider>;
}
