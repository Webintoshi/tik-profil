import { config as loadEnv } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import admin from 'firebase-admin';

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

const ALAZ_BUSINESS_ID = '23ZU6GH1B3XZrLxA8V6p';

async function checkAlazInFirebase() {
    console.log('\n=== FIREBASE ALAZ RESTORAN KONTROLÜ ===\n');
    console.log(`BusinessId: ${ALAZ_BUSINESS_ID}\n`);

    // Check all product-related collections
    const collections = [
        'fb_products', 'fb_categories', 'fb_tables', 'fb_settings',
        'ff_products', 'ff_categories', 'ff_settings',
        'restaurant_products', 'restaurant_categories', 'restaurant_tables',
        'rest_products', 'rest_categories'
    ];

    for (const colName of collections) {
        try {
            const snapshot = await firestore.collection(colName)
                .where('businessId', '==', ALAZ_BUSINESS_ID)
                .get();

            if (!snapshot.empty) {
                console.log(`✅ ${colName}: ${snapshot.size} belge bulundu`);
                snapshot.forEach(doc => {
                    const data = doc.data();
                    console.log(`   - ${data.name || data.title || doc.id}`);
                });
            }
        } catch (e) { }
    }

    // Also check with business_id field
    for (const colName of collections) {
        try {
            const snapshot = await firestore.collection(colName)
                .where('business_id', '==', ALAZ_BUSINESS_ID)
                .get();

            if (!snapshot.empty) {
                console.log(`✅ ${colName} (business_id): ${snapshot.size} belge bulundu`);
            }
        } catch (e) { }
    }

    console.log('\n=== Kontrol Tamamlandı ===');
}

checkAlazInFirebase().catch(console.error);
