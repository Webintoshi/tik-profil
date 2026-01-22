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

async function migrateEcommerceForce() {
    console.log('\\n🚀 E-Commerce Koleksiyonları Zorunlu Migrasyonu...\\n');

    // 1. Get ecommerce_products from Firebase
    console.log('📥 Firebase ecommerce_products çekiliyor...');
    const productsSnap = await firestore.collection('ecommerce_products').get();
    const products = [];
    productsSnap.forEach(doc => {
        products.push({ id: doc.id, ...doc.data() });
    });
    console.log(`   Firebase'de ${products.length} ürün bulundu`);

    // 2. Get ecommerce_categories from Firebase
    console.log('📥 Firebase ecommerce_categories çekiliyor...');
    const catsSnap = await firestore.collection('ecommerce_categories').get();
    const categories = [];
    catsSnap.forEach(doc => {
        categories.push({ id: doc.id, ...doc.data() });
    });
    console.log(`   Firebase'de ${categories.length} kategori bulundu`);

    // 3. Delete existing data first
    console.log('\\n🗑️  Mevcut e-commerce verileri siliniyor...');
    await supabase.from('app_documents').delete().eq('collection', 'ecommerce_products');
    await supabase.from('app_documents').delete().eq('collection', 'ecommerce_categories');

    // 4. Insert products
    if (products.length > 0) {
        console.log('\\n📤 Ürünler ekleniyor...');
        for (const doc of products) {
            const row = {
                id: doc.id,
                collection: 'ecommerce_products',
                data: doc,
                created_at: doc.createdAt || new Date().toISOString(),
                updated_at: doc.updatedAt || doc.createdAt || new Date().toISOString(),
            };

            const { error } = await supabase.from('app_documents').insert(row);
            if (error) {
                console.error(`   ❌ ${doc.name || doc.id}: ${error.message}`);
            } else {
                console.log(`   ✅ ${doc.name || doc.id}`);
            }
        }
    }

    // 5. Insert categories
    if (categories.length > 0) {
        console.log('\\n📤 Kategoriler ekleniyor...');
        for (const doc of categories) {
            const row = {
                id: doc.id,
                collection: 'ecommerce_categories',
                data: doc,
                created_at: doc.createdAt || new Date().toISOString(),
                updated_at: doc.updatedAt || doc.createdAt || new Date().toISOString(),
            };

            const { error } = await supabase.from('app_documents').insert(row);
            if (error) {
                console.error(`   ❌ ${doc.name || doc.id}: ${error.message}`);
            } else {
                console.log(`   ✅ ${doc.name || doc.id}`);
            }
        }
    }

    // 6. Verify
    console.log('\\n🔍 Doğrulama...');
    const { data: finalProducts } = await supabase
        .from('app_documents')
        .select('id')
        .eq('collection', 'ecommerce_products');
    const { data: finalCats } = await supabase
        .from('app_documents')
        .select('id')
        .eq('collection', 'ecommerce_categories');

    console.log(`   Supabase ecommerce_products: ${finalProducts?.length || 0}`);
    console.log(`   Supabase ecommerce_categories: ${finalCats?.length || 0}`);

    console.log('\\n✅ E-Commerce Migrasyonu Tamamlandı!');
}

migrateEcommerceForce().catch(console.error);
