import { ArchiveRecord } from "@/lib/archive/types";

export const ARCHIVE_STORAGE_KEY = "changselog.archive.records.v1";
const REMOTE_ARCHIVE_CACHE_PREFIX = "changselog.archive.remote.v1";
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

export function readRemoteRecordsCache(userId: string) {
  if (typeof window === "undefined") {
    return null;
  }

  const value = window.localStorage.getItem(`${REMOTE_ARCHIVE_CACHE_PREFIX}.${userId}`);
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as {
      cachedAt?: string;
      records?: ArchiveRecord[];
    };

    if (!Array.isArray(parsed.records)) {
      return null;
    }

    return parsed.records;
  } catch {
    return null;
  }
}

export function writeRemoteRecordsCache(userId: string, records: ArchiveRecord[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    `${REMOTE_ARCHIVE_CACHE_PREFIX}.${userId}`,
    JSON.stringify({
      cachedAt: new Date().toISOString(),
      records,
    }),
  );
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
