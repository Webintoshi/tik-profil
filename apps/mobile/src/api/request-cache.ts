type RequestCacheEntry<T> = {
  data?: T;
  generation: number;
  inFlight?: Promise<T>;
  updatedAt: number;
};

export type CacheErrorDisposition = "retryable" | "terminal";

export interface CachedGetOptions {
  awaitRevalidation?: boolean;
  classifyError?: (error: unknown) => CacheErrorDisposition;
  force?: boolean;
}

const requestCache = new Map<string, RequestCacheEntry<unknown>>();
let nextGeneration = 0;

function createEntry<T>(data?: T, updatedAt = 0): RequestCacheEntry<T> {
  return {
    data,
    generation: ++nextGeneration,
    updatedAt
  };
}

function isCurrentEntry<T>(key: string, entry: RequestCacheEntry<T>) {
  return requestCache.get(key) === entry;
}

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

export function cachedGet<T>(
  key: string,
  loader: () => Promise<T>,
  ttlMs: number,
  options: CachedGetOptions = {}
): Promise<T> {
  const canonicalKey = canonicalRequestKey(key);
  const entry = requestCache.get(canonicalKey) as RequestCacheEntry<T> | undefined;
  const now = Date.now();

  if (entry?.data !== undefined && now - entry.updatedAt <= ttlMs && !options.force) {
    return Promise.resolve(entry.data);
  }

  if (entry?.data !== undefined) {
    if (!entry.inFlight) {
      entry.inFlight = loader()
        .then((data) => {
          if (isCurrentEntry(canonicalKey, entry)) {
            requestCache.set(canonicalKey, createEntry(data, Date.now()));
          }
          return data;
        })
        .catch((error) => {
          if (options.classifyError?.(error) === "terminal") {
            if (isCurrentEntry(canonicalKey, entry)) requestCache.delete(canonicalKey);
            throw error;
          }
          return entry.data as T;
        })
        .finally(() => {
          if (isCurrentEntry(canonicalKey, entry)) entry.inFlight = undefined;
        });
    }
    if (options.force || options.awaitRevalidation) return entry.inFlight;
    void entry.inFlight.catch(() => undefined);
    return Promise.resolve(entry.data);
  }

  if (entry?.inFlight) return entry.inFlight;

  const nextEntry = createEntry<T>();
  nextEntry.inFlight = loader()
    .then((data) => {
      if (isCurrentEntry(canonicalKey, nextEntry)) {
        requestCache.set(canonicalKey, createEntry(data, Date.now()));
      }
      return data;
    })
    .catch((error) => {
      if (isCurrentEntry(canonicalKey, nextEntry)) requestCache.delete(canonicalKey);
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
