import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { getCollectionREST, updateDocumentREST } from '../src/lib/documentStore';
import { uploadBytesToR2 } from '../src/lib/r2Storage';

function assertEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

assertEnv('CLOUDFLARE_R2_ACCOUNT_ID');
assertEnv('CLOUDFLARE_R2_ACCESS_KEY_ID');
assertEnv('CLOUDFLARE_R2_SECRET_ACCESS_KEY');
assertEnv('CLOUDFLARE_R2_BUCKET_NAME');
assertEnv('CLOUDFLARE_R2_PUBLIC_URL');

type CollectionName =
  | 'businesses'
  | 'ff_products'
  | 'ec_products'
  | 'em_properties'
  | 'em_listings'
  | 'em_consultants'
  | 'ff_extras'
  | 'ec_categories';

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

const onlyArg = getArgValue('--only');
const onlyCollections: Set<string> | undefined = onlyArg
  ? new Set(
      onlyArg
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    )
  : undefined;

const limitArg = getArgValue('--limit');
const limitPerCollection = limitArg ? Number.parseInt(limitArg, 10) : undefined;

function shouldRun(name: CollectionName): boolean {
  if (!onlyCollections) return true;
  return onlyCollections.has(name);
}

function applyLimit<T>(items: T[]): T[] {
  if (!limitPerCollection || Number.isNaN(limitPerCollection) || limitPerCollection <= 0) return items;
  return items.slice(0, limitPerCollection);
}

const legacyStorageRegex = buildLegacyStorageRegex();
if (!legacyStorageRegex) {
  console.warn('No legacy matcher configured. Set LEGACY_STORAGE_REGEX or LEGACY_STORAGE_DOMAINS to migrate.');
}

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

interface MigrationStats {
  totalProcessed: number;
  successCount: number;
  errorCount: number;
  skippedCount: number;
  collections: {
    name: string;
    processed: number;
    success: number;
    error: number;
  }[];
}

const stats: MigrationStats = {
  totalProcessed: 0,
  successCount: 0,
  errorCount: 0,
  skippedCount: 0,
  collections: [],
};

function addCollectionStats(collectionName: string, processed: number, success: number, error: number) {
  const existing = stats.collections.find(c => c.name === collectionName);
  if (existing) {
    existing.processed += processed;
    existing.success += success;
    existing.error += error;
  } else {
    stats.collections.push({ name: collectionName, processed, success, error });
  }
}

async function downloadImage(url: string): Promise<{ bytes: Uint8Array; contentType: string }> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const contentType = response.headers.get('content-type') || getMimeTypeFromUrl(url);
  return {
    bytes: new Uint8Array(arrayBuffer),
    contentType,
  };
}

async function uploadFromUrl(params: {
  sourceUrl: string;
  fileName: string;
  moduleName: string;
  businessId: string;
}): Promise<string> {
  const downloaded = await downloadImage(params.sourceUrl);
  const { url } = await uploadBytesToR2({
    bytes: downloaded.bytes,
    contentType: downloaded.contentType,
    fileName: params.fileName,
    moduleName: params.moduleName,
    businessId: params.businessId,
  });
  return url;
}

function getMimeTypeFromUrl(url: string): string {
  const extension = url.split('.').pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'webp': 'image/webp',
    'gif': 'image/gif',
    'avif': 'image/avif',
  };
  return mimeTypes[extension || 'jpg'] || 'image/jpeg';
}

function isLegacyUrl(url: unknown): url is string {
  return typeof url === 'string' && legacyStorageRegex !== null && legacyStorageRegex.test(url);
}

function extractFileExtension(url: string): string {
  const match = url.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  return match ? match[1] : 'jpg';
}

async function migrateBusinesses() {
  console.log('\n🏢 Migrating businesses collection...');
  let processed = 0;
  let success = 0;
  let error = 0;

  try {
    const allBusinesses = await getCollectionREST('businesses');
    const businesses = applyLimit(allBusinesses);
    console.log(`   Found ${allBusinesses.length} businesses${limitPerCollection ? ` (processing first ${businesses.length})` : ''}`);

    for (const business of businesses) {
      const businessId = typeof (business as any).id === 'string' ? (business as any).id : '';
      if (!businessId) {
        stats.skippedCount++;
        processed++;
        continue;
      }
      const updates: Record<string, string> = {};

      try {
        let migrated = false;

        if (isLegacyUrl(business.logoUrl)) {
          console.log(`   Migrating logo for business: ${business.name || businessId}`);
          const extension = extractFileExtension(business.logoUrl);
          const newUrl = await uploadFromUrl({
            sourceUrl: business.logoUrl,
            fileName: `logo.${extension}`,
            moduleName: 'logos',
            businessId,
          });
          updates.logoUrl = newUrl;
          migrated = true;
        }

        if (isLegacyUrl(business.cover)) {
          console.log(`   Migrating cover for business: ${business.name || businessId}`);
          const extension = extractFileExtension(business.cover);
          const newUrl = await uploadFromUrl({
            sourceUrl: business.cover,
            fileName: `cover.${extension}`,
            moduleName: 'covers',
            businessId,
          });
          updates.cover = newUrl;
          migrated = true;
        }

        if (migrated) {
          await updateDocumentREST('businesses', businessId, updates);
          success++;
          stats.successCount++;
        } else {
          stats.skippedCount++;
        }
        processed++;
      } catch (err) {
        console.error(`   ❌ Error migrating business ${businessId}:`, err);
        error++;
        stats.errorCount++;
        processed++;
      }
    }

    addCollectionStats('businesses', processed, success, error);
    console.log(`   ✅ Processed: ${processed}, Success: ${success}, Error: ${error}`);
  } catch (err) {
    console.error('   ❌ Error processing businesses:', err);
  }
}

async function migrateFFProducts() {
  console.log('\n🍔 Migrating ff_products collection...');
  let processed = 0;
  let success = 0;
  let error = 0;

  try {
    const allProducts = await getCollectionREST('ff_products');
    const products = applyLimit(allProducts);
    console.log(`   Found ${allProducts.length} products${limitPerCollection ? ` (processing first ${products.length})` : ''}`);

    for (const product of products) {
      const productId = typeof (product as any).id === 'string' ? (product as any).id : '';
      if (!productId) {
        stats.skippedCount++;
        processed++;
        continue;
      }

      try {
        if (isLegacyUrl(product.imageUrl)) {
          console.log(`   Migrating image for product: ${product.name || productId}`);
          const businessId = typeof (product as any).businessId === 'string' ? (product as any).businessId : 'unknown';
          const extension = extractFileExtension(product.imageUrl);
          const newUrl = await uploadFromUrl({
            sourceUrl: product.imageUrl,
            fileName: `product_${productId}.${extension}`,
            moduleName: 'fastfood',
            businessId,
          });

          await updateDocumentREST('ff_products', productId, { imageUrl: newUrl });
          success++;
          stats.successCount++;
        } else {
          stats.skippedCount++;
        }
        processed++;
      } catch (err) {
        console.error(`   ❌ Error migrating product ${productId}:`, err);
        error++;
        stats.errorCount++;
        processed++;
      }
    }

    addCollectionStats('ff_products', processed, success, error);
    console.log(`   ✅ Processed: ${processed}, Success: ${success}, Error: ${error}`);
  } catch (err) {
    console.error('   ❌ Error processing ff_products:', err);
  }
}

async function migrateECProducts() {
  console.log('\n🛒 Migrating ec_products collection...');
  let processed = 0;
  let success = 0;
  let error = 0;

  try {
    const allProducts = await getCollectionREST('ec_products');
    const products = applyLimit(allProducts);
    console.log(`   Found ${allProducts.length} products${limitPerCollection ? ` (processing first ${products.length})` : ''}`);

    for (const product of products) {
      const productId = typeof (product as any).id === 'string' ? (product as any).id : '';
      if (!productId) {
        stats.skippedCount++;
        processed++;
        continue;
      }

      try {
        if (isLegacyUrl(product.imageUrl)) {
          console.log(`   Migrating image for product: ${product.name || productId}`);
          const businessId = typeof (product as any).businessId === 'string' ? (product as any).businessId : 'unknown';
          const extension = extractFileExtension(product.imageUrl);
          const newUrl = await uploadFromUrl({
            sourceUrl: product.imageUrl,
            fileName: `product_${productId}.${extension}`,
            moduleName: 'ecommerce',
            businessId,
          });

          await updateDocumentREST('ec_products', productId, { imageUrl: newUrl });
          success++;
          stats.successCount++;
        } else {
          stats.skippedCount++;
        }
        processed++;
      } catch (err) {
        console.error(`   ❌ Error migrating product ${productId}:`, err);
        error++;
        stats.errorCount++;
        processed++;
      }
    }

    addCollectionStats('ec_products', processed, success, error);
    console.log(`   ✅ Processed: ${processed}, Success: ${success}, Error: ${error}`);
  } catch (err) {
    console.error('   ❌ Error processing ec_products:', err);
  }
}

async function migrateEmlakProperties() {
  console.log('\n🏠 Migrating em_properties collection...');
  let processed = 0;
  let success = 0;
  let error = 0;

  try {
    const allProperties = await getCollectionREST('em_properties');
    const properties = applyLimit(allProperties);
    console.log(`   Found ${allProperties.length} properties${limitPerCollection ? ` (processing first ${properties.length})` : ''}`);

    for (const property of properties) {
      const propertyId = typeof (property as any).id === 'string' ? (property as any).id : '';
      if (!propertyId) {
        stats.skippedCount++;
        processed++;
        continue;
      }

      try {
        const images = property.images;
        if (Array.isArray(images) && images.length > 0) {
          const migratedImages = [];
          let migrated = false;

          for (let i = 0; i < images.length; i++) {
            const img = images[i];
            if (img && isLegacyUrl(img.url)) {
              console.log(`   Migrating image ${i + 1}/${images.length} for property: ${propertyId}`);
              const businessId = typeof (property as any).businessId === 'string' ? (property as any).businessId : 'unknown';
              const extension = extractFileExtension(img.url);
              const newUrl = await uploadFromUrl({
                sourceUrl: img.url,
                fileName: `property_${propertyId}_${i}.${extension}`,
                moduleName: 'emlak',
                businessId,
              });
              migratedImages.push({ url: newUrl, isMain: img.isMain });
              migrated = true;
            } else {
              migratedImages.push(img);
            }
          }

          if (migrated) {
            await updateDocumentREST('em_properties', propertyId, { images: migratedImages });
            success++;
            stats.successCount++;
          } else {
            stats.skippedCount++;
          }
        } else {
          stats.skippedCount++;
        }
        processed++;
      } catch (err) {
        console.error(`   ❌ Error migrating property ${propertyId}:`, err);
        error++;
        stats.errorCount++;
        processed++;
      }
    }

    addCollectionStats('em_properties', processed, success, error);
    console.log(`   ✅ Processed: ${processed}, Success: ${success}, Error: ${error}`);
  } catch (err) {
    console.error('   ❌ Error processing em_properties:', err);
  }
}

async function migrateEmlakListings() {
  console.log('\n🏘️  Migrating em_listings collection...');
  let processed = 0;
  let success = 0;
  let error = 0;

  try {
    const allListings = await getCollectionREST('em_listings');
    const listings = applyLimit(allListings);
    console.log(`   Found ${allListings.length} listings${limitPerCollection ? ` (processing first ${listings.length})` : ''}`);

    for (const listing of listings) {
      const listingId = typeof (listing as any).id === 'string' ? (listing as any).id : '';
      if (!listingId) {
        stats.skippedCount++;
        processed++;
        continue;
      }

      try {
        const images = (listing as any).images;
        if (Array.isArray(images) && images.length > 0) {
          const businessId = typeof (listing as any).businessId === 'string' ? (listing as any).businessId : 'unknown';
          const migratedImages = [];
          let migrated = false;

          for (let i = 0; i < images.length; i++) {
            const img = images[i];
            const url = img?.url;
            if (isLegacyUrl(url)) {
              console.log(`   Migrating image ${i + 1}/${images.length} for listing: ${listingId}`);
              const extension = extractFileExtension(url);
              const newUrl = await uploadFromUrl({
                sourceUrl: url,
                fileName: `listing_${listingId}_${i}.${extension}`,
                moduleName: 'emlak',
                businessId,
              });
              migratedImages.push({ ...img, url: newUrl });
              migrated = true;
            } else {
              migratedImages.push(img);
            }
          }

          if (migrated) {
            await updateDocumentREST('em_listings', listingId, { images: migratedImages });
            success++;
            stats.successCount++;
          } else {
            stats.skippedCount++;
          }
        } else {
          stats.skippedCount++;
        }
        processed++;
      } catch (err) {
        console.error(`   ❌ Error migrating listing ${listingId}:`, err);
        error++;
        stats.errorCount++;
        processed++;
      }
    }

    addCollectionStats('em_listings', processed, success, error);
    console.log(`   ✅ Processed: ${processed}, Success: ${success}, Error: ${error}`);
  } catch (err) {
    console.error('   ❌ Error processing em_listings:', err);
  }
}

async function migrateEmlakConsultants() {
  console.log('\n🧑‍💼 Migrating em_consultants collection...');
  let processed = 0;
  let success = 0;
  let error = 0;

  try {
    const allConsultants = await getCollectionREST('em_consultants');
    const consultants = applyLimit(allConsultants);
    console.log(
      `   Found ${allConsultants.length} consultants${limitPerCollection ? ` (processing first ${consultants.length})` : ''}`
    );

    for (const consultant of consultants) {
      const consultantId = typeof (consultant as any).id === 'string' ? (consultant as any).id : '';
      if (!consultantId) {
        stats.skippedCount++;
        processed++;
        continue;
      }

      try {
        const photoUrl = (consultant as any).photoUrl;
        if (isLegacyUrl(photoUrl)) {
          const businessId = typeof (consultant as any).businessId === 'string' ? (consultant as any).businessId : 'unknown';
          console.log(`   Migrating photo for consultant: ${consultantId}`);
          const extension = extractFileExtension(photoUrl);
          const newUrl = await uploadFromUrl({
            sourceUrl: photoUrl,
            fileName: `consultant_${consultantId}.${extension}`,
            moduleName: 'emlak',
            businessId,
          });
          await updateDocumentREST('em_consultants', consultantId, { photoUrl: newUrl });
          success++;
          stats.successCount++;
        } else {
          stats.skippedCount++;
        }
        processed++;
      } catch (err) {
        console.error(`   ❌ Error migrating consultant ${consultantId}:`, err);
        error++;
        stats.errorCount++;
        processed++;
      }
    }

    addCollectionStats('em_consultants', processed, success, error);
    console.log(`   ✅ Processed: ${processed}, Success: ${success}, Error: ${error}`);
  } catch (err) {
    console.error('   ❌ Error processing em_consultants:', err);
  }
}

async function migrateFFExtras() {
  console.log('\n🍟 Migrating ff_extras collection...');
  let processed = 0;
  let success = 0;
  let error = 0;

  try {
    const allExtras = await getCollectionREST('ff_extras');
    const extras = applyLimit(allExtras);
    console.log(`   Found ${allExtras.length} extras${limitPerCollection ? ` (processing first ${extras.length})` : ''}`);

    for (const extra of extras) {
      const extraId = typeof (extra as any).id === 'string' ? (extra as any).id : '';
      if (!extraId) {
        stats.skippedCount++;
        processed++;
        continue;
      }

      try {
        if (isLegacyUrl(extra.imageUrl)) {
          console.log(`   Migrating image for extra: ${extra.name || extraId}`);
          const businessId = typeof (extra as any).businessId === 'string' ? (extra as any).businessId : 'unknown';
          const extension = extractFileExtension(extra.imageUrl);
          const newUrl = await uploadFromUrl({
            sourceUrl: extra.imageUrl,
            fileName: `extra_${extraId}.${extension}`,
            moduleName: 'fastfood',
            businessId,
          });

          await updateDocumentREST('ff_extras', extraId, { imageUrl: newUrl });
          success++;
          stats.successCount++;
        } else {
          stats.skippedCount++;
        }
        processed++;
      } catch (err) {
        console.error(`   ❌ Error migrating extra ${extraId}:`, err);
        error++;
        stats.errorCount++;
        processed++;
      }
    }

    addCollectionStats('ff_extras', processed, success, error);
    console.log(`   ✅ Processed: ${processed}, Success: ${success}, Error: ${error}`);
  } catch (err) {
    console.error('   ❌ Error processing ff_extras:', err);
  }
}

async function migrateECCategories() {
  console.log('\n📁 Migrating ec_categories collection...');
  let processed = 0;
  let success = 0;
  let error = 0;

  try {
    const allCategories = await getCollectionREST('ec_categories');
    const categories = applyLimit(allCategories);
    console.log(`   Found ${allCategories.length} categories${limitPerCollection ? ` (processing first ${categories.length})` : ''}`);

    for (const category of categories) {
      const categoryId = typeof (category as any).id === 'string' ? (category as any).id : '';
      if (!categoryId) {
        stats.skippedCount++;
        processed++;
        continue;
      }

      try {
        if (isLegacyUrl(category.image)) {
          console.log(`   Migrating image for category: ${category.name || categoryId}`);
          const businessId = typeof (category as any).businessId === 'string' ? (category as any).businessId : 'unknown';
          const extension = extractFileExtension(category.image);
          const newUrl = await uploadFromUrl({
            sourceUrl: category.image,
            fileName: `category_${categoryId}.${extension}`,
            moduleName: 'ecommerce',
            businessId,
          });

          await updateDocumentREST('ec_categories', categoryId, { image: newUrl });
          success++;
          stats.successCount++;
        } else {
          stats.skippedCount++;
        }
        processed++;
      } catch (err) {
        console.error(`   ❌ Error migrating category ${categoryId}:`, err);
        error++;
        stats.errorCount++;
        processed++;
      }
    }

    addCollectionStats('ec_categories', processed, success, error);
    console.log(`   ✅ Processed: ${processed}, Success: ${success}, Error: ${error}`);
  } catch (err) {
    console.error('   ❌ Error processing ec_categories:', err);
  }
}

function printSummary() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 MIGRATION SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total Processed: ${stats.totalProcessed}`);
  console.log(`Success: ${stats.successCount}`);
  console.log(`Errors: ${stats.errorCount}`);
  console.log(`Skipped (already on R2): ${stats.skippedCount}`);
  console.log('\nCollection Details:');
  console.log('-'.repeat(80));
  stats.collections.forEach(col => {
    console.log(`${col.name}:`);
    console.log(`  Processed: ${col.processed}`);
    console.log(`  Success: ${col.success}`);
    console.log(`  Error: ${col.error}`);
  });
  console.log('='.repeat(80));
}

async function main() {
  console.log('🚀 Starting legacy storage to R2 Migration');
  console.log('='.repeat(80));

  try {
    if (onlyCollections) {
      console.log(`Only: ${Array.from(onlyCollections).join(', ')}`);
    }
    if (limitPerCollection) {
      console.log(`Limit per collection: ${limitPerCollection}`);
    }

    if (shouldRun('businesses')) await migrateBusinesses();
    if (shouldRun('ff_products')) await migrateFFProducts();
    if (shouldRun('ec_products')) await migrateECProducts();
    if (shouldRun('em_properties')) await migrateEmlakProperties();
    if (shouldRun('em_listings')) await migrateEmlakListings();
    if (shouldRun('em_consultants')) await migrateEmlakConsultants();
    if (shouldRun('ff_extras')) await migrateFFExtras();
    if (shouldRun('ec_categories')) await migrateECCategories();

    stats.totalProcessed = stats.collections.reduce((sum, col) => sum + col.processed, 0);
    printSummary();

    if (stats.errorCount === 0) {
      console.log('\n✅ Migration completed successfully!');
      console.log('Next steps:');
      console.log('1. Test your application to ensure all images are loading correctly');
      console.log('2. Verify images in R2 dashboard');
      console.log('3. Optionally: Remove legacy storage references from code');
      console.log('4. Optionally: Delete legacy storage bucket (after testing)');
    } else {
      console.log('\n⚠️  Migration completed with errors. Please review the logs above.');
    }
  } catch (err) {
    console.error('\n❌ Fatal error during migration:', err);
    process.exit(1);
  }
}

main();
