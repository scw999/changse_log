const cache = new Map<string, { url: string; expiresAt: number }>();
const BUFFER_MS = 5 * 60 * 1000;

export function getCachedSignedUrl(storagePath: string): string | null {
  const entry = cache.get(storagePath);
  if (!entry || Date.now() >= entry.expiresAt) {
    if (entry) cache.delete(storagePath);
    return null;
  }
  return entry.url;
}

export function setCachedSignedUrl(storagePath: string, url: string, ttlSeconds: number) {
  cache.set(storagePath, {
    url,
    expiresAt: Date.now() + ttlSeconds * 1000 - BUFFER_MS,
  });
}
