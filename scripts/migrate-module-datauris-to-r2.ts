import path from 'node:path';
import dotenv from 'dotenv';
import { getCollectionREST, updateDocumentREST } from '../src/lib/documentStore';
import { uploadBytesToR2WithKey } from '../src/lib/r2Storage';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

type DataUri = { mime: string; bytes: Uint8Array };

function parseDataImageUri(value: string): DataUri | null {
  const trimmed = value.trim();
  const m = trimmed.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/);
  if (!m) return null;
  const mime = m[1];
  const b64 = m[2];
  const buf = Buffer.from(b64, 'base64');
  return { mime, bytes: new Uint8Array(buf) };
}

function extFromMime(mime: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/avif': 'avif',
    'image/svg+xml': 'svg',
  };
  return map[mime] || 'bin';
}

function getString(doc: Record<string, unknown>, key: string): string | undefined {
  const v = doc[key];
  return typeof v === 'string' ? v : undefined;
}

function getBusinessIdFF(doc: Record<string, unknown>): string | null {
  const v = doc['businessId'];
  return typeof v === 'string' && v ? v : null;
}

function getBusinessIdFFExtra(doc: Record<string, unknown>, groupBusinessMap: Map<string, string>): string | null {
  const direct = getBusinessIdFF(doc);
  if (direct) return direct;
  const groupId = doc['groupId'];
  if (typeof groupId === 'string' && groupId) {
    return groupBusinessMap.get(groupId) || null;
  }
  return null;
}

function getBusinessIdFB(doc: Record<string, unknown>): string | null {
  const v = doc['business_id'];
  return typeof v === 'string' && v ? v : null;
}

async function migrateCollection(params: {
  collection: string;
  field: string;
  modulePrefix: string;
  fileLabel: string;
  businessIdOf: (doc: Record<string, unknown>) => string | null;
}) {
  const docs = await getCollectionREST(params.collection);
  let processed = 0;
  let migrated = 0;
  let skipped = 0;
  let errors = 0;

  for (const doc of docs) {
    processed++;
    const id = typeof (doc as any).id === 'string' ? (doc as any).id : String((doc as any).id ?? '');
    const value = getString(doc, params.field);
    if (!id || !value || !value.trim().startsWith('data:image/')) {
      skipped++;
      continue;
    }

    const businessId = params.businessIdOf(doc);
    if (!businessId) {
      skipped++;
      continue;
    }

    try {
      const parsed = parseDataImageUri(value);
      if (!parsed) {
        skipped++;
        continue;
      }
      const ext = extFromMime(parsed.mime);
      const ts = Date.now();
      const key = `${params.modulePrefix}/${businessId}/${ts}_${params.fileLabel}_${id}.${ext}`;
      const { url } = await uploadBytesToR2WithKey({
        key,
        bytes: parsed.bytes,
        contentType: parsed.mime,
      });

      await updateDocumentREST(params.collection, id, { [params.field]: url });
      migrated++;
    } catch (err) {
      errors++;
      console.error(`Error in ${params.collection}/${id}:`, err);
    }
  }

  return { processed, migrated, skipped, errors };
}

async function main() {
  const ffExtraGroups = await getCollectionREST('ff_extra_groups');
  const groupBusinessMap = new Map<string, string>();
  for (const g of ffExtraGroups) {
    const id = typeof (g as any).id === 'string' ? (g as any).id : String((g as any).id ?? '');
    const businessId = typeof (g as any).businessId === 'string' ? (g as any).businessId : '';
    if (id && businessId) groupBusinessMap.set(id, businessId);
  }

  const ffProducts = await migrateCollection({
    collection: 'ff_products',
    field: 'imageUrl',
    modulePrefix: 'fastfood',
    fileLabel: 'product',
    businessIdOf: getBusinessIdFF,
  });

  const ffExtras = await migrateCollection({
    collection: 'ff_extras',
    field: 'imageUrl',
    modulePrefix: 'fastfood',
    fileLabel: 'extra',
    businessIdOf: (doc) => getBusinessIdFFExtra(doc, groupBusinessMap),
  });

  const fbProducts = await migrateCollection({
    collection: 'fb_products',
    field: 'image',
    modulePrefix: 'restaurant',
    fileLabel: 'product',
    businessIdOf: getBusinessIdFB,
  });

  console.log('Module data:image/* -> R2 migration');
  console.log('---------------------------------');
  console.log('ff_products:', ffProducts);
  console.log('ff_extras:', ffExtras);
  console.log('fb_products:', fbProducts);
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
