import path from 'node:path';
import dotenv from 'dotenv';
import { getCollectionREST } from '../src/lib/documentStore';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const INTERESTING_FIELD_RE = /(logo|cover|photo|avatar|image|gallery|banner|thumbnail)/i;
const CDN_HOST = 'cdn.tikprofil.com';

type Hit = {
  collection: string;
  docId: string;
  fieldPath: string;
  url: string;
};

function getDocId(doc: any): string {
  return typeof doc?.id === 'string' ? doc.id : String(doc?.id ?? '');
}

function isHttpUrl(value: unknown): value is string {
  return typeof value === 'string' && /^https?:\/\//i.test(value.trim());
}

function safeHost(url: string): string {
  try {
    return new URL(url).host.toLowerCase();
  } catch {
    return '(invalid)';
  }
}

function cdnTopPrefix(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.host.toLowerCase() !== CDN_HOST) return null;
    const clean = u.pathname.replace(/^\/+/, '');
    const top = clean.split('/')[0];
    return top || null;
  } catch {
    return null;
  }
}

function walk(
  value: unknown,
  onHit: (fieldPath: string, url: string) => void,
  basePath = '',
  lastKey = ''
): void {
  if (isHttpUrl(value)) {
    const keyToCheck = lastKey || basePath.split('.').pop() || '';
    if (INTERESTING_FIELD_RE.test(keyToCheck) || INTERESTING_FIELD_RE.test(basePath)) {
      onHit(basePath || '(root)', value.trim());
    }
    return;
  }

  if (!value) return;

  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      walk(value[i], onHit, `${basePath}[${i}]`, lastKey);
    }
    return;
  }

  if (typeof value === 'object') {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const nextPath = basePath ? `${basePath}.${k}` : k;
      walk(v, onHit, nextPath, k);
    }
  }
}

async function main() {
  const collections = [
    'businesses',
    'business_owners',
    'business_staff',
    'beauty_staff',
    'beauty_services',
    'em_consultants',
    'em_listings',
    'hotel_rooms',
    'room_types',
    'ff_products',
    'ff_extras',
    'ecommerce_products',
    'ecommerce_categories',
    'ecommerce_settings',
    'fb_products',
  ];

  const hostCounts: Record<string, number> = {};
  const cdnPrefixCounts: Record<string, number> = {};
  const hits: Hit[] = [];
  let docsScanned = 0;

  for (const col of collections) {
    let docs: Record<string, unknown>[];
    try {
      docs = await getCollectionREST(col);
    } catch {
      continue;
    }

    docsScanned += docs.length;
    for (const doc of docs) {
      const docId = getDocId(doc);
      walk(doc, (fieldPath, url) => {
        const host = safeHost(url);
        hostCounts[host] = (hostCounts[host] || 0) + 1;

        const top = cdnTopPrefix(url);
        if (top) cdnPrefixCounts[top] = (cdnPrefixCounts[top] || 0) + 1;

        if (hits.length < 200) hits.push({ collection: col, docId, fieldPath, url });
      });
    }
  }

  const sortedHosts = Object.entries(hostCounts).sort((a, b) => b[1] - a[1]);
  const sortedPrefixes = Object.entries(cdnPrefixCounts).sort((a, b) => b[1] - a[1]);

  console.log('Image Field URL Report');
  console.log('----------------------');
  console.log('Collections checked:', collections.length);
  console.log('Documents scanned:', docsScanned);
  console.log('Interesting URL hits:', Object.values(hostCounts).reduce((a, b) => a + b, 0));
  console.log('');
  console.log('Top hosts:');
  for (const [host, count] of sortedHosts.slice(0, 20)) {
    console.log(`- ${host}: ${count}`);
  }

  console.log('');
  console.log(`Top CDN prefixes on ${CDN_HOST}:`);
  if (!sortedPrefixes.length) {
    console.log('- (none)');
  } else {
    for (const [p, count] of sortedPrefixes.slice(0, 30)) {
      console.log(`- ${p}/: ${count}`);
    }
  }

  if (hits.length) {
    console.log('');
    console.log('Sample hits (first 30):');
    for (const h of hits.slice(0, 30)) {
      console.log(`${h.collection}/${h.docId} ${h.fieldPath}: ${h.url}`);
    }
  }
}

main().catch((err) => {
  console.error('Failed:', err?.message || err);
  process.exit(1);
});

