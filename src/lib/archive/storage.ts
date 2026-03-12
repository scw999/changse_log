import { ArchiveRecord } from "@/lib/archive/types";

export const ARCHIVE_STORAGE_KEY = "changselog.archive.records.v1";
const listeners = new Set<() => void>();

export function readRecordsFromStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  const value = window.localStorage.getItem(ARCHIVE_STORAGE_KEY);

  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as ArchiveRecord[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeRecordsToStorage(records: ArchiveRecord[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(ARCHIVE_STORAGE_KEY, JSON.stringify(records));
}

export function getArchiveSnapshot(fallback: ArchiveRecord[]) {
  const stored = readRecordsFromStorage();
  return stored && stored.length > 0 ? stored : fallback;
}

export function ensureArchiveSeeded(seed: ArchiveRecord[]) {
  if (typeof window === "undefined") {
    return;
  }

  const stored = readRecordsFromStorage();
  if (!stored || stored.length === 0) {
    writeRecordsToStorage(seed);
  }
}

export function subscribeArchiveStore(listener: () => void) {
  listeners.add(listener);

  if (typeof window === "undefined") {
    return () => listeners.delete(listener);
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === ARCHIVE_STORAGE_KEY) {
      listener();
    }
  };

  window.addEventListener("storage", handleStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", handleStorage);
  };
}

export function publishArchiveStoreChange() {
  listeners.forEach((listener) => listener());
}
