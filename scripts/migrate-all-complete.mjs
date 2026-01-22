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

// All possible collection names to check
const ALL_COLLECTIONS = [
    // Emlak
    'em_listings',
    'em_consultants',
    'emlak_listings',
    'emlak_consultants',
    // Restaurant
    'restaurant_categories',
    'restaurant_products',
    'restaurant_tables',
    'restaurant_orders',
    'rest_categories',
    'rest_products',
    // Salon/Beauty
    'salon_services',
    'salon_staff',
    'beauty_services',
    'beauty_staff',
    'beauty_appointments',
    // Hotel
    'hotel_rooms',
    'hotel_orders',
    'room_service_orders',
    'room_requests',
    // Generic
    'businesses',
    'admins',
    'users',
    'orders',
    'products',
    'categories',
    'system_logs',
    'subscription_plans',
];

async function checkAndMigrate() {
    console.log('\\n=== FIREBASE → SUPABASE DETAYLI MİGRASYON ===\\n');

    let totalMigrated = 0;

    for (const colName of ALL_COLLECTIONS) {
        try {
            const snapshot = await firestore.collection(colName).get();
            if (snapshot.empty) continue;

            const docs = [];
            snapshot.forEach(doc => {
                docs.push({ id: doc.id, ...doc.data() });
            });

            console.log(`\\n📁 ${colName}: ${docs.length} belge bulundu`);

            // Show sample
            if (docs.length > 0) {
                const sample = docs[0];
                console.log(`   Örnek: ${sample.name || sample.title || sample.id}`);
            }

            // Migrate to app_documents
            console.log(`   → Supabase'e aktarılıyor...`);

            // Delete existing
            await supabase.from('app_documents').delete().eq('collection', colName);

            // Insert new
            let inserted = 0;
            for (const doc of docs) {
                const row = {
                    id: doc.id,
                    collection: colName,
                    data: doc,
                    created_at: doc.createdAt || new Date().toISOString(),
                    updated_at: doc.updatedAt || doc.createdAt || new Date().toISOString(),
                };

                const { error } = await supabase.from('app_documents').insert(row);
                if (!error) inserted++;
            }

            console.log(`   ✅ ${inserted} belge yazıldı`);
            totalMigrated += inserted;

        } catch (e) {
            // Collection doesn't exist or error
        }
    }

    console.log(`\\n=== TOPLAM: ${totalMigrated} belge migre edildi ===\\n`);
}

checkAndMigrate().catch(console.error);
