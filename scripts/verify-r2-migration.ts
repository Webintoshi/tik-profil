import path from 'node:path';
import dotenv from 'dotenv';
import { getCollectionREST } from '../src/lib/documentStore';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

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

function isLegacyUrl(url: unknown): url is string {
  return typeof url === 'string' && legacyRegex !== null && legacyRegex.test(url);
}

function isR2Url(url: unknown): url is string {
  return typeof url === 'string' && url.includes('cdn.tikprofil.com/');
}

type Finding = { collection: string; docId: string; field: string; url: string };

function getDocId(doc: any): string {
  return typeof doc?.id === 'string' ? doc.id : String(doc?.id ?? '');
}

async function main() {
  const findings: Finding[] = [];
  let legacyCount = 0;
  let r2Count = 0;
  let totalUrls = 0;

  if (!legacyRegex) {
    console.warn('No legacy matcher configured. Set LEGACY_STORAGE_REGEX or LEGACY_STORAGE_DOMAINS to scan.');
  }

  const businesses = await getCollectionREST('businesses');
  for (const doc of businesses) {
    const docId = getDocId(doc);
    for (const field of ['logo', 'logoUrl', 'cover']) {
      const url = doc[field];
      if (isLegacyUrl(url)) {
        legacyCount++;
        totalUrls++;
        findings.push({ collection: 'businesses', docId, field, url });
      } else if (isR2Url(url)) {
        r2Count++;
        totalUrls++;
      }
    }
  }

  const ffProducts = await getCollectionREST('ff_products');
  for (const doc of ffProducts) {
    const docId = getDocId(doc);
    const url = doc.imageUrl;
    if (isLegacyUrl(url)) {
      legacyCount++;
      totalUrls++;
      findings.push({ collection: 'ff_products', docId, field: 'imageUrl', url });
    } else if (isR2Url(url)) {
      r2Count++;
      totalUrls++;
    }
  }

  const ffExtras = await getCollectionREST('ff_extras');
  for (const doc of ffExtras) {
    const docId = getDocId(doc);
    const url = doc.imageUrl;
    if (isLegacyUrl(url)) {
      legacyCount++;
      totalUrls++;
      findings.push({ collection: 'ff_extras', docId, field: 'imageUrl', url });
    } else if (isR2Url(url)) {
      r2Count++;
      totalUrls++;
    }
  }

  const ecProducts = await getCollectionREST('ec_products');
  for (const doc of ecProducts) {
    const docId = getDocId(doc);
    const url = doc.imageUrl;
    if (isLegacyUrl(url)) {
      legacyCount++;
      totalUrls++;
      findings.push({ collection: 'ec_products', docId, field: 'imageUrl', url });
    } else if (isR2Url(url)) {
      r2Count++;
      totalUrls++;
    }
  }

  const ecCategories = await getCollectionREST('ec_categories');
  for (const doc of ecCategories) {
    const docId = getDocId(doc);
    const url = doc.image;
    if (isLegacyUrl(url)) {
      legacyCount++;
      totalUrls++;
      findings.push({ collection: 'ec_categories', docId, field: 'image', url });
    } else if (isR2Url(url)) {
      r2Count++;
      totalUrls++;
    }
  }

  const emProperties = await getCollectionREST('em_properties');
  for (const doc of emProperties) {
    const docId = getDocId(doc);
    const images = doc.images;
    if (!Array.isArray(images)) continue;
    for (let i = 0; i < images.length; i++) {
      const url = images[i]?.url;
      if (isLegacyUrl(url)) {
        legacyCount++;
        totalUrls++;
        findings.push({ collection: 'em_properties', docId, field: `images[${i}].url`, url });
      } else if (isR2Url(url)) {
        r2Count++;
        totalUrls++;
      }
    }
  }

  console.log('Verification Summary');
  console.log('--------------------');
  console.log('Total URLs scanned:', totalUrls);
  console.log('R2 URLs:', r2Count);
  console.log('Legacy URLs remaining:', legacyCount);

  if (findings.length) {
    console.log('');
    console.log('Sample legacy URLs (first 10):');
    for (const f of findings.slice(0, 10)) {
      console.log(`${f.collection}/${f.docId} ${f.field}: ${f.url}`);
    }
    process.exitCode = 2;
  }
}

main().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
