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

async function migrateEverything() {
    console.log('\n=== FIREBASE → SUPABASE TAM MİGRASYON ===\n');

    // Get all collections dynamically
    const collections = await firestore.listCollections();

    let totalMigrated = 0;
    const results = [];

    for (const col of collections) {
        const colName = col.id;

        // Skip large log collections
        if (colName === 'qr_scans' || colName === 'system_logs' || colName === 'audit_logs' || colName === 'admin_audit_logs') {
            console.log(`⏭️  ${colName}: Atlanıyor (log koleksiyonu)`);
            continue;
        }

        const snapshot = await col.get();
        if (snapshot.empty) continue;

        const docs = [];
        snapshot.forEach(doc => {
            docs.push({ id: doc.id, ...doc.data() });
        });

        console.log(`📁 ${colName}: ${docs.length} belge`);

        // Delete existing
        await supabase.from('app_documents').delete().eq('collection', colName);

        // Insert new - batch insert for speed
        const rows = docs.map(doc => ({
            id: doc.id,
            collection: colName,
            data: doc,
            created_at: doc.createdAt || new Date().toISOString(),
            updated_at: doc.updatedAt || doc.createdAt || new Date().toISOString(),
        }));

        // Batch insert 100 at a time
        let inserted = 0;
        for (let i = 0; i < rows.length; i += 100) {
            const batch = rows.slice(i, i + 100);
            const { error } = await supabase.from('app_documents').insert(batch);
            if (!error) {
                inserted += batch.length;
            } else {
                // Try one by one if batch fails
                for (const row of batch) {
                    const { error: singleError } = await supabase.from('app_documents').insert(row);
                    if (!singleError) inserted++;
                }
            }
        }

        results.push({ name: colName, count: inserted });
        totalMigrated += inserted;
        console.log(`   ✅ ${inserted} yazıldı`);
    }

    console.log('\n=== MİGRASYON SONUCU ===\n');
    results.sort((a, b) => b.count - a.count);
    for (const r of results) {
        console.log(`${r.name}: ${r.count}`);
    }
    console.log(`\nTOPLAM: ${totalMigrated} belge migre edildi`);
}

migrateEverything().catch(console.error);
