"use client";

import { ArchiveProvider, type ArchiveBootstrapAuth } from "@/lib/archive/context";

export default function Providers({
  children,
  initialAuth,
}: Readonly<{
  children: React.ReactNode;
  initialAuth?: ArchiveBootstrapAuth;
}>) {
  return <ArchiveProvider initialAuth={initialAuth}>{children}</ArchiveProvider>;
}
