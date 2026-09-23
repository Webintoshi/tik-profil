import { createHash } from 'node:crypto';
import { createClient } from 'redis';

type BudgetWindow = { key: string; limit: number; ttlSeconds: number };
const LUA = `
for i, key in ipairs(KEYS) do
  if tonumber(redis.call('GET', key) or '0') >= tonumber(ARGV[i]) then return 0 end
end
for i, key in ipairs(KEYS) do
  redis.call('INCR', key)
  redis.call('EXPIRE', key, ARGV[#KEYS + i])
end
return 1`;

let client: ReturnType<typeof createClient> | undefined;
let connecting: Promise<unknown> | undefined;
const memory = new Map<string, { count: number; expires: number }>();

export function routeBudgetWindows(owner: string, now = Date.now()): BudgetWindow[] {
  const minute = Math.floor(now / 60_000);
  const hour = Math.floor(now / 3_600_000);
  const day = Math.floor(now / 86_400_000);
  const month = new Date(now).toISOString().slice(0, 7);
  const ownerHash = createHash('sha256').update(owner).digest('hex').slice(0, 20);
  return [
    { key: `nav:month:${month}`, limit: 80_000, ttlSeconds: 35 * 86_400 },
    { key: `nav:day:${day}`, limit: 2_500, ttlSeconds: 2 * 86_400 },
    { key: `nav:minute:${minute}`, limit: 90, ttlSeconds: 120 },
    { key: `nav:owner:${ownerHash}:${hour}`, limit: 40, ttlSeconds: 7_200 }
  ];
}

export async function reserveNavigationRequest(owner: string): Promise<boolean> {
  const windows = routeBudgetWindows(owner);
  if (!process.env.REDIS_URL) {
    if (process.env.NODE_ENV === 'production') return false;
    if (memory.size > 5000) return false;
    const now = Date.now();
    for (const [key, value] of memory) if (value.expires <= now) memory.delete(key);
    if (windows.some(window => (memory.get(window.key)?.count ?? 0) >= window.limit)) return false;
    for (const window of windows) memory.set(window.key, {
      count: (memory.get(window.key)?.count ?? 0) + 1,
      expires: now + window.ttlSeconds * 1000
    });
    return true;
  }
  try {
    if (!client) {
      client = createClient({ url: process.env.REDIS_URL,
        socket: { connectTimeout: 800, reconnectStrategy: false }, disableOfflineQueue: true });
      client.on('error', () => undefined);
    }
    if (!client.isReady) {
      connecting ??= client.connect().finally(() => { connecting = undefined; });
      await connecting;
    }
    // Each window has its own threshold; reserve atomically to avoid overshooting the free tier.
    const limits = windows.map(window => window.limit);
    return await client.eval(LUA, {
      keys: windows.map(window => window.key),
      arguments: [...limits.map(String), ...windows.map(window => String(window.ttlSeconds))]
    }) === 1;
  } catch {
    return false;
  }
}
