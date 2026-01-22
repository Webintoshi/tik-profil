import path from 'node:path';
import dotenv from 'dotenv';
import { getCollectionREST } from '../src/lib/documentStore';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const CDN_BASE = (process.env.CLOUDFLARE_R2_PUBLIC_URL || '').replace(/\/+$/, '');
const CDN_REGEX = CDN_BASE ? new RegExp(`^${CDN_BASE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/`, 'i') : null;

function getDocId(doc: any): string {
  return typeof doc?.id === 'string' ? doc.id : String(doc?.id ?? '');
}

function isCdnUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  if (!CDN_REGEX) return value.includes('cdn.tikprofil.com/');
  return CDN_REGEX.test(value);
}

function extractKey(url: string): string {
  if (CDN_BASE && url.toLowerCase().startsWith(CDN_BASE.toLowerCase() + '/')) {
    return url.slice(CDN_BASE.length + 1);
  }
  const idx = url.indexOf('cdn.tikprofil.com/');
  if (idx >= 0) return url.slice(idx + 'cdn.tikprofil.com/'.length);
  return url;
}

function walk(value: unknown, onMatch: (path: string, url: string) => void, basePath = ''): void {
  if (isCdnUrl(value)) {
    onMatch(basePath || '(root)', value);
    return;
  }

  if (!value) return;

  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      walk(value[i], onMatch, `${basePath}[${i}]`);
    }
    return;
  }

  if (typeof value === 'object') {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const nextPath = basePath ? `${basePath}.${k}` : k;
      walk(v, onMatch, nextPath);
    }
  }
}

const COLLECTIONS_TO_SCAN = [
  'businesses',
  'ff_products',
  'ff_extras',
  'fb_products',
  'em_listings',
  'em_consultants',
  'hotel_rooms',
  'room_types',
  'beauty_services',
  'beauty_staff',
] as const;

async function main() {
  const keys = new Set<string>();
  let totalUrls = 0;

  for (const collection of COLLECTIONS_TO_SCAN) {
    try {
      const docs = await getCollectionREST(collection);
      for (const doc of docs) {
        const docId = getDocId(doc);
        walk(doc, (fieldPath, url) => {
          totalUrls++;
          keys.add(extractKey(url));
        });
      }
    } catch {
      continue;
    }
  }

  console.log('CDN URL Scan Summary');
  console.log('--------------------');
  console.log('CDN base:', CDN_BASE || '(unknown)');
  console.log('Total CDN URLs found:', totalUrls);
  console.log('Unique object keys:', keys.size);
  console.log('');
  console.log('Sample keys (first 30):');
  for (const k of Array.from(keys).slice(0, 30)) console.log('-', k);
}

main().catch((err) => {
  console.error('Scan failed:', err);
  process.exit(1);
});

