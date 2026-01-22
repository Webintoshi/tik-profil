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

async function listAllCollectionsWithData() {
    console.log('=== FIREBASE TÜM KOLEKSİYONLAR ===\n');

    const collections = await firestore.listCollections();

    const summary = [];

    for (const col of collections) {
        const countSnap = await col.count().get();
        const count = countSnap.data().count;
        summary.push({ name: col.id, count });
    }

    // Sort by count descending
    summary.sort((a, b) => b.count - a.count);

    for (const item of summary) {
        console.log(`${item.name}: ${item.count}`);
    }

    console.log('\n=== TOPLAM: ' + summary.reduce((acc, i) => acc + i.count, 0) + ' belge ===');
}

listAllCollectionsWithData().catch(console.error);
