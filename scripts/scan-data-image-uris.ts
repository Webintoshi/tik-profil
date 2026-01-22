import path from 'node:path';
import { readdir, readFile } from 'node:fs/promises';
import dotenv from 'dotenv';
import { getCollectionREST } from '../src/lib/documentStore';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

type Match = { collection: string; docId: string; fieldPath: string; prefix: string };

function getDocId(doc: any): string {
  return typeof doc?.id === 'string' ? doc.id : String(doc?.id ?? '');
}

function isDataImage(value: unknown): value is string {
  return typeof value === 'string' && value.trim().startsWith('data:image/');
}

function walk(value: unknown, onMatch: (path: string, v: string) => void, basePath = ''): void {
  if (isDataImage(value)) {
    onMatch(basePath || '(root)', value);
    return;
  }
  if (!value) return;
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) walk(value[i], onMatch, `${basePath}[${i}]`);
    return;
  }
  if (typeof value === 'object') {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const next = basePath ? `${basePath}.${k}` : k;
      walk(v, onMatch, next);
    }
  }
}

async function listAllCollectionIds(): Promise<string[]> {
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

  const dynamic = await extractCollectionsFromCodebase();
  return Array.from(new Set<string>([...staticCollections, ...dynamic])).sort();
}

async function listSourceFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) files.push(...(await listSourceFiles(full)));
    else if (e.isFile() && (full.endsWith('.ts') || full.endsWith('.tsx'))) files.push(full);
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

async function main() {
  const collections = await listAllCollectionIds();
  const matches: Match[] = [];
  const perCollection: Record<string, number> = {};
  let docs = 0;
  let total = 0;

  for (const col of collections) {
    let colDocs: Record<string, unknown>[];
    try {
      colDocs = await getCollectionREST(col);
    } catch {
      continue;
    }
    docs += colDocs.length;
    let colCount = 0;
    for (const d of colDocs) {
      const docId = getDocId(d);
      walk(d, (fieldPath, v) => {
        colCount++;
        total++;
        if (matches.length < 50) {
          matches.push({ collection: col, docId, fieldPath, prefix: v.slice(0, 40) });
        }
      });
    }
    if (colCount) perCollection[col] = colCount;
  }

  console.log('Data URI Image Scan');
  console.log('-------------------');
  console.log('Collections scanned:', collections.length);
  console.log('Documents scanned:', docs);
  console.log('data:image/* matches:', total);
  console.log('');

  if (Object.keys(perCollection).length) {
    console.log('Matches by collection:');
    for (const [k, c] of Object.entries(perCollection).sort((a, b) => b[1] - a[1])) {
      console.log(`- ${k}: ${c}`);
    }
  }

  if (matches.length) {
    console.log('');
    console.log('Sample matches:');
    for (const m of matches) {
      console.log(`${m.collection}/${m.docId} ${m.fieldPath}: ${m.prefix}...`);
    }
  }
}

main().catch((err) => {
  console.error('Scan failed:', err);
  process.exit(1);
});
