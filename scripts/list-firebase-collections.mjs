/**
 * Firebase koleksiyonlarını listele
 */

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

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const firestore = admin.firestore();

async function listCollections() {
    console.log('\\n=== Firebase Koleksiyonları ===\\n');

    const collections = await firestore.listCollections();

    for (const collection of collections) {
        const snapshot = await collection.limit(1).get();
        const count = snapshot.size;

        // Get approximate count
        const fullSnapshot = await collection.count().get();
        const docCount = fullSnapshot.data().count;

        console.log(`📁 ${collection.id}: ${docCount} belge`);

        // Show sample document structure
        if (!snapshot.empty) {
            const sampleDoc = snapshot.docs[0].data();
            const keys = Object.keys(sampleDoc).slice(0, 5);
            console.log(`   Örnek alanlar: ${keys.join(', ')}`);
        }
    }
}

listCollections().catch(console.error);
