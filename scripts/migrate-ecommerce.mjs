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

async function migrateEcommerce() {
    console.log('\\n🚀 E-Commerce Koleksiyonları Migrasyonu Başlıyor...\\n');

    // 1. Migrate ecommerce_products
    console.log('📥 ecommerce_products çekiliyor...');
    const productsSnap = await firestore.collection('ecommerce_products').get();
    const products = [];
    productsSnap.forEach(doc => {
        products.push({ id: doc.id, ...doc.data() });
    });
    console.log(`   Bulundu: ${products.length} ürün`);

    if (products.length > 0) {
        const rows = products.map(doc => ({
            id: doc.id,
            collection: 'ecommerce_products',
            data: doc,
            created_at: doc.createdAt || new Date().toISOString(),
            updated_at: doc.updatedAt || doc.createdAt || new Date().toISOString(),
        }));

        const { error } = await supabase.from('app_documents').upsert(rows, { onConflict: 'id' });
        if (error) {
            console.error('❌ Hata (ecommerce_products):', error.message);
        } else {
            console.log(`✅ ecommerce_products: ${rows.length} ürün yazıldı`);
        }
    }

    // 2. Migrate ecommerce_categories
    console.log('\\n📥 ecommerce_categories çekiliyor...');
    const catsSnap = await firestore.collection('ecommerce_categories').get();
    const categories = [];
    catsSnap.forEach(doc => {
        categories.push({ id: doc.id, ...doc.data() });
    });
    console.log(`   Bulundu: ${categories.length} kategori`);

    if (categories.length > 0) {
        const rows = categories.map(doc => ({
            id: doc.id,
            collection: 'ecommerce_categories',
            data: doc,
            created_at: doc.createdAt || new Date().toISOString(),
            updated_at: doc.updatedAt || doc.createdAt || new Date().toISOString(),
        }));

        const { error } = await supabase.from('app_documents').upsert(rows, { onConflict: 'id' });
        if (error) {
            console.error('❌ Hata (ecommerce_categories):', error.message);
        } else {
            console.log(`✅ ecommerce_categories: ${rows.length} kategori yazıldı`);
        }
    }

    console.log('\\n================================================');
    console.log('✅ E-Commerce Migrasyonu Tamamlandı!');
}

migrateEcommerce().catch(console.error);
