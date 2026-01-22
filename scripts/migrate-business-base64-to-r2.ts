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

async function migrateOne(businessId: string, kind: 'logo' | 'cover', value: string): Promise<string | null> {
  const parsed = parseDataImageUri(value);
  if (!parsed) return null;

  const ext = extFromMime(parsed.mime);
  const ts = Date.now();
  const key = `${kind === 'logo' ? 'logos' : 'covers'}/${businessId}/${ts}_${kind}.${ext}`;

  const { url } = await uploadBytesToR2WithKey({
    key,
    bytes: parsed.bytes,
    contentType: parsed.mime,
  });

  return url;
}

async function main() {
  const businesses = await getCollectionREST('businesses');
  let scanned = 0;
  let migratedLogo = 0;
  let migratedCover = 0;
  let skipped = 0;
  let errors = 0;

  for (const b of businesses) {
    scanned++;
    const id = typeof (b as any).id === 'string' ? (b as any).id : String((b as any).id ?? '');
    if (!id) {
      skipped++;
      continue;
    }

    const logo = (b as any).logo;
    const cover = (b as any).cover;
    const updates: Record<string, unknown> = {};

    try {
      if (typeof logo === 'string' && logo.trim().startsWith('data:image/')) {
        const newUrl = await migrateOne(id, 'logo', logo);
        if (newUrl) {
          updates.logo = newUrl;
          migratedLogo++;
        }
      }

      if (typeof cover === 'string' && cover.trim().startsWith('data:image/')) {
        const newUrl = await migrateOne(id, 'cover', cover);
        if (newUrl) {
          updates.cover = newUrl;
          migratedCover++;
        }
      }

      if (Object.keys(updates).length === 0) {
        skipped++;
        continue;
      }

      await updateDocumentREST('businesses', id, updates);
    } catch (err) {
      errors++;
      console.error(`Error in businesses/${id}:`, err);
    }
  }

  console.log('Business base64 -> R2 migration');
  console.log('------------------------------');
  console.log('Businesses scanned:', scanned);
  console.log('Logo migrated:', migratedLogo);
  console.log('Cover migrated:', migratedCover);
  console.log('Skipped (no change / no id):', skipped);
  console.log('Errors:', errors);
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});

