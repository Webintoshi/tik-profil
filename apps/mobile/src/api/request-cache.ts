type RequestCacheEntry<T> = {
  data?: T;
  inFlight?: Promise<T>;
  updatedAt: number;
};

const requestCache = new Map<string, RequestCacheEntry<unknown>>();

export function canonicalRequestKey(key: string) {
  const trimmed = key.trim();
  try {
    const url = new URL(trimmed);
    url.hash = "";
    const entries = [...url.searchParams.entries()].sort(([firstKey, firstValue], [secondKey, secondValue]) => {
      return firstKey.localeCompare(secondKey) || firstValue.localeCompare(secondValue);
    });
    url.search = "";
    entries.forEach(([name, value]) => url.searchParams.append(name, value));
    return url.toString();
  } catch {
    return trimmed;
  }
}

export function cachedGet<T>(key: string, loader: () => Promise<T>, ttlMs: number): Promise<T> {
  const canonicalKey = canonicalRequestKey(key);
  const entry = requestCache.get(canonicalKey) as RequestCacheEntry<T> | undefined;
  const now = Date.now();

  if (entry?.data !== undefined && now - entry.updatedAt <= ttlMs) {
    return Promise.resolve(entry.data);
  }

  if (entry?.data !== undefined) {
    if (!entry.inFlight) {
      entry.inFlight = loader()
        .then((data) => {
          requestCache.set(canonicalKey, { data, updatedAt: Date.now() });
          return data;
        })
        .catch(() => entry.data as T)
        .finally(() => {
          const current = requestCache.get(canonicalKey) as RequestCacheEntry<T> | undefined;
          if (current === entry) entry.inFlight = undefined;
        });
    }
    return Promise.resolve(entry.data);
  }

  if (entry?.inFlight) return entry.inFlight;

  const nextEntry: RequestCacheEntry<T> = { updatedAt: 0 };
  nextEntry.inFlight = loader()
    .then((data) => {
      requestCache.set(canonicalKey, { data, updatedAt: Date.now() });
      return data;
    })
    .catch((error) => {
      if (requestCache.get(canonicalKey) === nextEntry) requestCache.delete(canonicalKey);
      throw error;
    });
  requestCache.set(canonicalKey, nextEntry);
  return nextEntry.inFlight;
}

export function invalidateRequestCache(key: string) {
  return requestCache.delete(canonicalRequestKey(key));
}

export function clearRequestCache() {
  requestCache.clear();
}
