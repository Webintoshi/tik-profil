import { config as loadEnv } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import admin from 'firebase-admin';
import { createClient } from '@supabase/supabase-js';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..');
loadEnv({ path: resolve(repoRoot, '.env.local'), override: true });

const SERVICE_ACCOUNT_PATH = resolve(repoRoot, 'firebase-service-account.json');
const serviceAccount = JSON.parse(readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const firestore = admin.firestore();

const SUPABASE_URL = process.env.SUPABASE_URL?.trim();
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
});

async function migrateProductsOneByOne() {
    console.log('\n=== FB_PRODUCTS → FF_PRODUCTS (Tek Tek) ===\n');

    const prodsSnap = await firestore.collection('fb_products').get();
    const products = [];
    prodsSnap.forEach(doc => products.push({ id: doc.id, ...doc.data() }));
    console.log(`Firebase: ${products.length} ürün bulundu\n`);

    let success = 0;
    let failed = 0;

    for (const doc of products) {
        const businessId = doc.businessId || doc.business_id;
        const categoryId = doc.categoryId || doc.category_id;

        if (!businessId) {
            console.log(`❌ ${doc.name || doc.id}: business_id eksik`);
            failed++;
            continue;
        }

        const row = {
            id: doc.id,
            business_id: businessId,
            category_id: categoryId || null,
            name: doc.name || 'İsimsiz Ürün',
            description: doc.description || '',
            price: Number(doc.price || 0),
            image_url: doc.imageUrl || doc.image_url || '',
            is_active: doc.isActive !== false,
            in_stock: doc.inStock !== false,
            extra_group_ids: Array.isArray(doc.extraGroupIds) ? doc.extraGroupIds : [],
            sort_order: doc.sortOrder ?? doc.sort_order ?? 0,
            sizes: doc.sizes || null,
            prep_time: doc.prepTime ?? doc.prep_time ?? null,
            tax_rate: doc.taxRate ?? doc.tax_rate ?? null,
            allergens: Array.isArray(doc.allergens) ? doc.allergens : [],
            discount_price: doc.discountPrice ?? doc.discount_price ?? null,
            discount_until: doc.discountUntil || doc.discount_until || null,
            tags: Array.isArray(doc.tags) ? doc.tags : [],
            calories: doc.calories ?? null,
            spicy_level: doc.spicyLevel ?? doc.spicy_level ?? null,
            created_at: doc.createdAt || doc.created_at || new Date().toISOString(),
            updated_at: doc.updatedAt || doc.updated_at || doc.createdAt || doc.created_at || new Date().toISOString(),
        };

        const { error } = await supabase.from('ff_products').upsert(row, { onConflict: 'id' });
        if (error) {
            console.log(`❌ ${doc.name || doc.id}: ${error.message}`);
            failed++;
        } else {
            console.log(`✅ ${doc.name || doc.id}`);
            success++;
        }
    }

    console.log(`\n=== Sonuç: ${success} başarılı, ${failed} başarısız ===`);
}

migrateProductsOneByOne().catch(console.error);
