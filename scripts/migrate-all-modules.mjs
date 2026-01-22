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

const FF_COLLECTIONS = [
    'ff_categories',
    'ff_products',
    'ff_extra_groups',
    'ff_extras',
    'ff_campaigns',
    'ff_coupons',
    'ff_settings',
    'ff_orders',
];

const EMLAK_COLLECTIONS = [
    'emlak_listings',
    'emlak_consultants',
];

const BEAUTY_COLLECTIONS = [
    'beauty_services',
    'beauty_staff',
    'beauty_appointments',
];

const RESTAURANT_COLLECTIONS = [
    'restaurant_categories',
    'restaurant_products',
    'restaurant_tables',
    'restaurant_orders',
];

async function migrateCollection(collectionName) {
    console.log(`📥 ${collectionName} çekiliyor...`);
    const snapshot = await firestore.collection(collectionName).get();
    const docs = [];
    snapshot.forEach(doc => {
        docs.push({ id: doc.id, ...doc.data() });
    });
    console.log(`   Firebase: ${docs.length} belge`);

    if (docs.length === 0) return 0;

    // Delete existing
    await supabase.from('app_documents').delete().eq('collection', collectionName);

    // Insert new
    let inserted = 0;
    for (const doc of docs) {
        const row = {
            id: doc.id,
            collection: collectionName,
            data: doc,
            created_at: doc.createdAt || new Date().toISOString(),
            updated_at: doc.updatedAt || doc.createdAt || new Date().toISOString(),
        };

        const { error } = await supabase.from('app_documents').insert(row);
        if (!error) inserted++;
    }
    console.log(`   Supabase: ${inserted} belge yazıldı`);
    return inserted;
}

async function migrateAllModules() {
    console.log('\\n🚀 TÜM MODÜL VERİLERİ MİGRASYONU\\n');

    let totalMigrated = 0;

    // FastFood
    console.log('\\n=== FASTFOOD ===');
    for (const col of FF_COLLECTIONS) {
        totalMigrated += await migrateCollection(col);
    }

    // Emlak
    console.log('\\n=== EMLAK ===');
    for (const col of EMLAK_COLLECTIONS) {
        totalMigrated += await migrateCollection(col);
    }

    // Beauty
    console.log('\\n=== BEAUTY ===');
    for (const col of BEAUTY_COLLECTIONS) {
        totalMigrated += await migrateCollection(col);
    }

    // Restaurant
    console.log('\\n=== RESTAURANT ===');
    for (const col of RESTAURANT_COLLECTIONS) {
        totalMigrated += await migrateCollection(col);
    }

    console.log(`\\n✅ Toplam ${totalMigrated} belge migre edildi!`);
}

migrateAllModules().catch(console.error);
