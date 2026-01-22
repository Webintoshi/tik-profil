import path from 'node:path';
import dotenv from 'dotenv';
import { getCollectionREST } from '../src/lib/documentStore';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

function hostOf(url: string): string {
  try {
    return new URL(url).host.toLowerCase();
  } catch {
    return '(invalid)';
  }
}

async function main() {
  const businesses = await getCollectionREST('businesses');

  let logoCount = 0;
  let coverCount = 0;
  const logoHosts: Record<string, number> = {};
  const coverHosts: Record<string, number> = {};
  const logoShapes: Record<string, number> = {};
  const coverShapes: Record<string, number> = {};

  const samples: Array<{ id: string; slug?: string; logo?: string; cover?: string }> = [];

  for (const b of businesses) {
    const id = String((b as any).id || '');
    const slug = typeof (b as any).slug === 'string' ? (b as any).slug : undefined;
    const logo = (b as any).logo;
    const cover = (b as any).cover;

    if (isNonEmptyString(logo)) {
      logoCount++;
      const shape = logo.startsWith('http') ? 'http' : logo.startsWith('/') ? 'relative' : 'other';
      logoShapes[shape] = (logoShapes[shape] || 0) + 1;
      if (shape === 'http') {
        const h = hostOf(logo);
        logoHosts[h] = (logoHosts[h] || 0) + 1;
      }
    }

    if (isNonEmptyString(cover)) {
      coverCount++;
      const shape = cover.startsWith('http') ? 'http' : cover.startsWith('/') ? 'relative' : 'other';
      coverShapes[shape] = (coverShapes[shape] || 0) + 1;
      if (shape === 'http') {
        const h = hostOf(cover);
        coverHosts[h] = (coverHosts[h] || 0) + 1;
      }
    }

    if (samples.length < 30 && (isNonEmptyString(logo) || isNonEmptyString(cover))) {
      samples.push({ id, slug, logo: isNonEmptyString(logo) ? logo : undefined, cover: isNonEmptyString(cover) ? cover : undefined });
    }
  }

  const sortDesc = (obj: Record<string, number>) => Object.entries(obj).sort((a, b) => b[1] - a[1]);

  console.log('Businesses Branding Report');
  console.log('-------------------------');
  console.log('Businesses scanned:', businesses.length);
  console.log('Has logo:', logoCount);
  console.log('Has cover:', coverCount);
  console.log('');
  console.log('Logo shapes:', logoShapes);
  console.log('Cover shapes:', coverShapes);
  console.log('');
  console.log('Logo hosts (top 10):');
  for (const [h, c] of sortDesc(logoHosts).slice(0, 10)) console.log(`- ${h}: ${c}`);
  console.log('');
  console.log('Cover hosts (top 10):');
  for (const [h, c] of sortDesc(coverHosts).slice(0, 10)) console.log(`- ${h}: ${c}`);
  console.log('');
  if (samples.length) {
    console.log('Sample (first 10):');
    for (const s of samples.slice(0, 10)) {
      const logoShort = s.logo ? s.logo.slice(0, 120) : '';
      const coverShort = s.cover ? s.cover.slice(0, 120) : '';
      console.log(`- ${s.id} slug=${s.slug || ''} logo=${logoShort} cover=${coverShort}`);
    }
  }
}

main().catch((err) => {
  console.error('Failed:', err?.message || err);
  process.exit(1);
});

