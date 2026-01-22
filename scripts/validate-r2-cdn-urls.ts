import path from 'node:path';
import { readdir, readFile } from 'node:fs/promises';
import dotenv from 'dotenv';
import { getCollectionREST } from '../src/lib/documentStore';
import { existsInR2 } from '../src/lib/r2Storage';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const baseUrl = (process.env.CLOUDFLARE_R2_PUBLIC_URL || 'https://cdn.tikprofil.com').replace(/\/+$/, '');
const legacyRegex = buildLegacyStorageRegex();

function buildLegacyStorageRegex(): RegExp | null {
  const rawRegex = process.env.LEGACY_STORAGE_REGEX?.trim();
  if (rawRegex) {
    try {
      return new RegExp(rawRegex, 'i');
    } catch (error: any) {
      console.warn('Invalid LEGACY_STORAGE_REGEX:', error?.message || error);
    }
  }

  const rawDomains = process.env.LEGACY_STORAGE_DOMAINS?.trim();
  if (!rawDomains) return null;
  const domains = rawDomains
    .split(',')
    .map((d) => d.trim())
    .filter(Boolean)
    .map(escapeRegex);

  if (!domains.length) return null;
  return new RegExp(`https?://(?:${domains.join('|')})(?:/|$)`, 'i');
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getArgValue(flag: string): string | undefined {
  const arg = process.argv.find((a) => a === flag || a.startsWith(`${flag}=`));
  if (!arg) return undefined;
  if (arg === flag) {
    const idx = process.argv.indexOf(arg);
    const next = process.argv[idx + 1];
    return next && !next.startsWith('--') ? next : undefined;
  }
  return arg.split('=')[1];
}

const limitArg = getArgValue('--limit');
const limitPerCollection = limitArg ? Number.parseInt(limitArg, 10) : 200;
const allDocs = process.argv.includes('--all');
const checkCdn = process.argv.includes('--check-cdn');

function getDocId(doc: any): string {
  return typeof doc?.id === 'string' ? doc.id : String(doc?.id ?? '');
}

function parseLegacyObjectName(url: string): string | null {
  try {
    const u = new URL(url);

    const oIdx = u.pathname.indexOf('/o/');
    if (oIdx >= 0) {
      const encoded = u.pathname.slice(oIdx + 3);
      return decodeURIComponent(encoded);
    }

    const host = u.host.toLowerCase();
    if (host === 'storage.googleapis.com') {
      const parts = u.pathname.split('/').filter(Boolean);
      if (parts.length >= 2) {
        return parts.slice(1).join('/');
      }
    }
  } catch {
    return null;
  }

  return null;
}

function parseR2KeyFromPublicUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const key = u.pathname.replace(/^\/+/, '');
    return key ? decodeURIComponent(key) : null;
  } catch {
    return null;
  }
}

function walk(value: unknown, onUrl: (path: string, url: string) => void, basePath = ''): void {
  if (typeof value === 'string') {
    const s = value.trim();
    if (!s) return;
    if ((legacyRegex && legacyRegex.test(s)) || s.startsWith(baseUrl)) {
      onUrl(basePath || '(root)', s);
    }
    return;
  }

  if (!value) return;

  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      walk(value[i], onUrl, `${basePath}[${i}]`);
    }
    return;
  }

  if (typeof value === 'object') {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const nextPath = basePath ? `${basePath}.${k}` : k;
      walk(v, onUrl, nextPath);
    }
  }
}

async function listSourceFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      files.push(...(await listSourceFiles(full)));
    } else if (e.isFile() && (full.endsWith('.ts') || full.endsWith('.tsx'))) {
      files.push(full);
    }
  }
  return files;
}

async function extractCollectionsFromCodebase(): Promise<Set<string>> {
  const srcRoot = path.resolve(process.cwd(), 'src');
  const files = await listSourceFiles(srcRoot);
  const collections = new Set<string>();

  const patterns: RegExp[] = [
    /getCollectionREST\(\s*['"]([^'"]+)['"]\s*\)/g,
    /getDocumentREST\(\s*['"]([^'"]+)['"]\s*,/g,
    /collectionId\s*:\s*['"]([^'"]+)['"]/g,
  ];

  for (const file of files) {
    let text: string;
    try {
      text = await readFile(file, 'utf8');
    } catch {
      continue;
    }
    for (const re of patterns) {
      re.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = re.exec(text))) {
        const name = m[1]?.trim();
        if (name) collections.add(name);
      }
    }
  }

  return collections;
}

async function headCdn(url: string): Promise<number | null> {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return res.status;
  } catch {
    return null;
  }
}

async function main() {
  const dynamicCollections = await extractCollectionsFromCodebase();
  const staticCollections = [
    'businesses',
    'business_owners',
    'industry_definitions',
    'admins',
    'active_modules',
    'qr_scans',
    'activity_logs',
    'business_staff',
    'staff_permissions',
    'password_reset_tokens',

    'ff_products',
    'ff_categories',
    'ff_extra_groups',
    'ff_extras',
    'ff_campaigns',
    'ff_orders',
    'ff_settings',
    'ff_coupons',
    'ff_coupon_usages',

    'ecommerce_products',
    'ecommerce_categories',
    'ecommerce_settings',
    'ecommerce_orders',
    'ecommerce_coupons',
    'ecommerce_customers',

    'fb_products',
    'fb_categories',
    'fb_tables',
    'fb_orders',

    'beauty_services',
    'beauty_categories',
    'beauty_staff',
    'beauty_appointments',

    'hotel_rooms',
    'room_types',
    'room_requests',
    'hotel_requests',
    'room_service_orders',

    'em_listings',
    'em_consultants',
    'em_properties',
    'ec_products',
    'ec_categories',
  ];

  const collectionsToScan = Array.from(
    new Set<string>([...staticCollections, ...dynamicCollections])
  ).sort();

  const totals = {
    collections: collectionsToScan.length,
    docs: 0,
    urls: 0,
    legacyUrls: 0,
    publicUrls: 0,
    missingInR2: 0,
    cdn404: 0,
  };

  const missingSamples: Array<{
    collection: string;
    docId: string;
    fieldPath: string;
    url: string;
    key: string | null;
    existsInR2: boolean;
    cdnStatus?: number | null;
  }> = [];

  const candidates: Array<{ collection: string; docId: string; fieldPath: string; url: string; key: string }> = [];
  const candidateKeys = new Set<string>();

  for (const collection of collectionsToScan) {
    let docs: Record<string, unknown>[] = [];
    try {
      docs = await getCollectionREST(collection);
    } catch {
      continue;
    }

    const slice = allDocs ? docs : docs.slice(0, Math.max(1, limitPerCollection));
    totals.docs += slice.length;

    for (const doc of slice) {
      const docId = getDocId(doc);
      walk(doc, (fieldPath, url) => {
        totals.urls++;
        if (legacyRegex && legacyRegex.test(url)) totals.legacyUrls++;
        if (url.startsWith(baseUrl)) totals.publicUrls++;

        const key = legacyRegex && legacyRegex.test(url)
          ? parseLegacyObjectName(url)
          : url.startsWith(baseUrl)
            ? parseR2KeyFromPublicUrl(url)
            : null;

        if (!key) return;
        if (candidateKeys.has(key)) return;
        candidateKeys.add(key);
        candidates.push({ collection, docId, fieldPath, url, key });
      });
    }
  }

  const concurrency = 20;
  let idx = 0;
  const workers = Array.from({ length: concurrency }, async () => {
    while (true) {
      const myIdx = idx++;
      if (myIdx >= candidates.length) return;
      const c = candidates[myIdx];
      const ok = await existsInR2(c.key);
      if (!ok) totals.missingInR2++;
      let cdnStatus: number | null | undefined = undefined;
      if (checkCdn && c.url.startsWith(baseUrl)) {
        cdnStatus = await headCdn(c.url);
        if (cdnStatus === 404) totals.cdn404++;
      }
      if ((!ok || cdnStatus === 404) && missingSamples.length < 200) {
        missingSamples.push({ ...c, existsInR2: ok, cdnStatus });
      }
    }
  });
  await Promise.all(workers);

  console.log('R2/CDN URL Validation Summary');
  console.log('----------------------------');
  console.log('Public baseUrl:', baseUrl);
  console.log('Legacy regex:', legacyRegex ? legacyRegex.source : 'none');
  console.log('Collections scanned:', totals.collections);
  console.log('Documents scanned:', totals.docs);
  console.log('URLs found:', totals.urls);
  console.log('Legacy URLs found:', totals.legacyUrls);
  console.log('Public (baseUrl) URLs found:', totals.publicUrls);
  console.log('Missing in R2 (HEAD failed):', totals.missingInR2);
  if (checkCdn) console.log('CDN 404 (HEAD):', totals.cdn404);

  if (missingSamples.length) {
    console.log('');
    console.log('Sample problems (first 50):');
    for (const m of missingSamples.slice(0, 50)) {
      const cdn = checkCdn ? ` cdn=${m.cdnStatus ?? 'ERR'}` : '';
      console.log(
        `${m.collection}/${m.docId} ${m.fieldPath} r2=${m.existsInR2 ? 'OK' : 'MISSING'}${cdn} ${m.url}`
      );
    }
  }
}

main().catch((err) => {
  console.error('Validation failed:', err);
  process.exit(1);
});
