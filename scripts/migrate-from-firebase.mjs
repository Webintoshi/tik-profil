/**
 * Firebase → Supabase Migration Script
 * 
 * Bu script Firebase Firestore'dan tüm koleksiyonları okuyup
 * Supabase'e aktarır.
 * 
 * KULLANIM:
 * 1. Firebase Console > Project Settings > Service Accounts > Generate new private key
 * 2. İndirilen JSON dosyasını proje klasörüne "firebase-service-account.json" olarak kaydedin
 * 3. npm install firebase-admin (eğer yoksa)
 * 4. node scripts/migrate-from-firebase.mjs
 */

import { config as loadEnv } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'node:url';
import { readFileSync, existsSync } from 'node:fs';

// Firebase Admin SDK
import admin from 'firebase-admin';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..');

// Load env
loadEnv({ path: resolve(repoRoot, '.env.local'), override: true });

// Service account path
const SERVICE_ACCOUNT_PATH = resolve(repoRoot, 'firebase-service-account.json');

// Check if service account exists
if (!existsSync(SERVICE_ACCOUNT_PATH)) {
    console.error('❌ HATA: firebase-service-account.json bulunamadı!');
    console.error('');
    console.error('Lütfen şu adımları izleyin:');
    console.error('1. Firebase Console > ⚙️ Project Settings > Service accounts');
    console.error('2. "Generate new private key" butonuna tıklayın');
    console.error('3. İndirilen JSON dosyasını proje klasörüne "firebase-service-account.json" olarak kaydedin');
    console.error('');
    process.exit(1);
}

// Initialize Firebase
const serviceAccount = JSON.parse(readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const firestore = admin.firestore();

// Supabase setup
const SUPABASE_URL = process.env.SUPABASE_URL?.trim();
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ HATA: Supabase env değişkenleri eksik!');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
});

const DOCUMENTS_TABLE = 'app_documents';

// Collections to migrate
const COLLECTIONS_TO_MIGRATE = [
    'businesses',
    'ff_categories',
    'ff_products',
    'ff_extra_groups',
    'ff_extras',
    'ff_campaigns',
    'ff_coupons',
    'ff_coupon_usages',
    'ff_settings',
    'ff_orders',
    'ecommerce_categories',
    'ecommerce_products',
    'beauty_services',
    'beauty_staff',
    'emlak_listings',
    'emlak_consultants',
    'admins',
    'blog_posts',
];

async function fetchFirestoreCollection(collectionName) {
    console.log(`📥 Firebase'den çekiliyor: ${collectionName}...`);
    const snapshot = await firestore.collection(collectionName).get();
    const docs = [];
    snapshot.forEach(doc => {
        docs.push({ id: doc.id, ...doc.data() });
    });
    console.log(`   → ${docs.length} belge bulundu`);
    return docs;
}

async function insertToSupabase(collectionName, docs) {
    if (docs.length === 0) {
        console.log(`⏭️  ${collectionName}: Boş, atlanıyor`);
        return;
    }

    console.log(`📤 Supabase'e yazılıyor: ${collectionName} (${docs.length} belge)...`);

    // Special handling for businesses table
    if (collectionName === 'businesses') {
        const rows = docs.map(doc => {
            const { id, ...data } = doc;
            return {
                id,
                name: doc.name || null,
                slug: doc.slug || null,
                phone: doc.phone || null,
                whatsapp: doc.whatsapp || doc.phone || null,
                data,
                created_at: doc.createdAt || null,
                updated_at: doc.updatedAt || doc.createdAt || null,
            };
        });

        const { error } = await supabase.from('businesses').upsert(rows, { onConflict: 'id' });
        if (error) {
            console.error(`❌ Hata (businesses): ${error.message}`);
        } else {
            console.log(`✅ ${collectionName}: ${rows.length} belge yazıldı`);
        }
        return;
    }

    // Generic handling for other collections -> app_documents
    const rows = docs.map(doc => ({
        id: doc.id,
        collection: collectionName,
        data: doc,
        created_at: doc.createdAt || new Date().toISOString(),
        updated_at: doc.updatedAt || doc.createdAt || new Date().toISOString(),
    }));

    // Batch insert (500 at a time)
    const batchSize = 500;
    for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        const { error } = await supabase.from(DOCUMENTS_TABLE).upsert(batch, { onConflict: 'id' });
        if (error) {
            console.error(`❌ Hata (${collectionName}): ${error.message}`);
        }
    }

    console.log(`✅ ${collectionName}: ${rows.length} belge yazıldı`);
}

async function migrateAll() {
    console.log('');
    console.log('🚀 Firebase → Supabase Migrasyon Başlıyor...');
    console.log('================================================');
    console.log('');

    let totalDocs = 0;
    let successCollections = 0;

    for (const collection of COLLECTIONS_TO_MIGRATE) {
        try {
            const docs = await fetchFirestoreCollection(collection);
            await insertToSupabase(collection, docs);
            totalDocs += docs.length;
            if (docs.length > 0) successCollections++;
        } catch (error) {
            // Collection might not exist, skip silently
            if (error.code === 5 || error.message?.includes('NOT_FOUND')) {
                console.log(`⏭️  ${collection}: Koleksiyon bulunamadı, atlanıyor`);
            } else {
                console.error(`❌ Hata (${collection}): ${error.message}`);
            }
        }
    }

    console.log('');
    console.log('================================================');
    console.log(`✅ Migrasyon Tamamlandı!`);
    console.log(`   Toplam: ${totalDocs} belge, ${successCollections} koleksiyon`);
    console.log('');
}

migrateAll().catch(error => {
    console.error('❌ Migrasyon başarısız:', error);
    process.exit(1);
});
