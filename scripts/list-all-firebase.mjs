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

async function listAllCollections() {
    console.log('\\n=== FIREBASE TÜM KOLEKSİYONLAR ===\\n');

    const collections = await firestore.listCollections();

    for (const col of collections) {
        const countSnap = await col.count().get();
        const count = countSnap.data().count;
        console.log(`📁 ${col.id}: ${count} belge`);

        // Show sample if not empty
        if (count > 0) {
            const sample = await col.limit(2).get();
            sample.forEach(doc => {
                const data = doc.data();
                const businessId = data.businessId || data.business_id || 'N/A';
                const name = data.name || data.title || doc.id;
                console.log(`   - ${name} (businessId: ${businessId})`);
            });
        }
    }
}

listAllCollections().catch(console.error);
