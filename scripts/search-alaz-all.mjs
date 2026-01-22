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

async function searchAllForAlaz() {
    console.log('\n=== FIREBASE - ALAZ İÇİN TÜM VERİLER ===\n');
    console.log(`Aranan BusinessId: ${ALAZ_BUSINESS_ID}\n`);

    // Get ALL collections
    const collections = await firestore.listCollections();

    for (const col of collections) {
        // Search with businessId
        try {
            const snap1 = await col.where('businessId', '==', ALAZ_BUSINESS_ID).get();
            if (!snap1.empty) {
                console.log(`\n✅ ${col.id} (businessId): ${snap1.size} belge`);
                snap1.forEach(doc => {
                    const data = doc.data();
                    console.log(`   - ${data.name || data.title || data.tableName || doc.id}`);
                });
            }
        } catch (e) { }

        // Search with business_id
        try {
            const snap2 = await col.where('business_id', '==', ALAZ_BUSINESS_ID).get();
            if (!snap2.empty) {
                console.log(`\n✅ ${col.id} (business_id): ${snap2.size} belge`);
                snap2.forEach(doc => {
                    const data = doc.data();
                    console.log(`   - ${data.name || data.title || data.tableName || doc.id}`);
                });
            }
        } catch (e) { }
    }

    console.log('\n=== Arama Tamamlandı ===');
}

searchAllForAlaz().catch(console.error);
