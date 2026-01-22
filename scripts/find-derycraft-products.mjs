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

async function findProducts() {
    console.log('\\n=== Derycraft İşletmesi Ürün Araması ===\\n');

    // Get all collections
    const collections = await firestore.listCollections();
    console.log('Tüm koleksiyonlar:');
    for (const col of collections) {
        const countSnap = await col.count().get();
        console.log(`  ${col.id}: ${countSnap.data().count} belge`);
    }

    // Search for products with derycraft businessId
    const deryBusinessIds = ['gmf6u7OEJ5UDSse7Yr9G'];

    // Try common product collection names
    const productCollections = ['products', 'ecommerce_products', 'ec_products', 'store_products'];

    for (const colName of productCollections) {
        try {
            const col = firestore.collection(colName);
            const snap = await col.where('businessId', '==', deryBusinessIds[0]).limit(5).get();
            if (!snap.empty) {
                console.log(`\\n✅ ${colName} koleksiyonunda Derycraft ürünleri bulundu: ${snap.size}`);
                snap.forEach(doc => {
                    const data = doc.data();
                    console.log(`  - ${data.name || data.title || doc.id}`);
                });
            }
        } catch (e) {
            // Collection doesn't exist
        }
    }

    // Check businesses collection for derycraft
    const businessSnap = await firestore.collection('businesses').doc(deryBusinessIds[0]).get();
    if (businessSnap.exists) {
        const data = businessSnap.data();
        console.log('\\nDerycraft Firebase verisi:');
        console.log('  industryModule:', data.industryModule);
        console.log('  businessType:', data.businessType);
        console.log('  modules:', data.modules);
    }
}

findProducts().catch(console.error);
