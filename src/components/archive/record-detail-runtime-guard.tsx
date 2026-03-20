"use client";

import { Component, ReactNode, useSyncExternalStore } from "react";

import { RecordDetailSafeFallback } from "@/components/archive/record-detail-safe-fallback";
import { ArchiveRecord } from "@/lib/archive/types";

type RuntimeGuardProps = {
  id: string;
  record: ArchiveRecord | null;
  children: ReactNode;
};

type BoundaryProps = RuntimeGuardProps & {
  hydrated: boolean;
};

type BoundaryState = {
  error: Error | null;
};

class RecordDetailBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("[record-detail-runtime-guard] client render failed", error);
  }

  render() {
    const { error } = this.state;
    const { id, record, hydrated, children } = this.props;

    if (error) {
      return <RecordDetailSafeFallback id={id} record={record} reason={error.message} />;
    }

    if (!hydrated) {
      return <RecordDetailSafeFallback id={id} record={record} reason="hydration_pending" />;
    }

    return <>{children}</>;
  }
}

function subscribe() {
  return () => undefined;
}

function getServerSnapshot() {
  return false;
}

function getClientSnapshot() {
  return true;
}

export function RecordDetailRuntimeGuard({ id, record, children }: Readonly<RuntimeGuardProps>) {
  const hydrated = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);

  return (
    <RecordDetailBoundary id={id} record={record} hydrated={hydrated}>
      {children}
    </RecordDetailBoundary>
  );
}
