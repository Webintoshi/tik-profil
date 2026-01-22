import { config as loadEnv } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..');
loadEnv({ path: resolve(repoRoot, '.env.local'), override: true });

const SUPABASE_URL = process.env.SUPABASE_URL?.trim();
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
});

async function checkAlazRestoran() {
    console.log('\n=== ALAZ RESTORAN VERİLERİ KONTROLÜ ===\n');

    // 1. Get Alaz business
    const { data: business } = await supabase
        .from('businesses')
        .select('id, slug, name, data')
        .eq('slug', 'alaz')
        .maybeSingle();

    if (!business) {
        console.log('Alaz Restoran bulunamadı!');
        return;
    }

    console.log('İşletme Bilgileri:');
    console.log(`  ID: ${business.id}`);
    console.log(`  Slug: ${business.slug}`);
    console.log(`  Name: ${business.name}`);
    console.log(`  Modules: ${business.data?.modules?.join(', ') || 'N/A'}`);

    const businessId = business.id;

    // 2. Check fb_* collections (FastBurger/Restaurant)
    const fbCollections = ['fb_products', 'fb_categories', 'fb_tables', 'fb_settings'];

    console.log('\n--- FB (Restaurant) Koleksiyonları ---');
    for (const col of fbCollections) {
        const { data } = await supabase
            .from('app_documents')
            .select('id, data')
            .eq('collection', col)
            .eq('data->>businessId', businessId);

        console.log(`${col}: ${data?.length || 0} belge`);

        if (data && data.length > 0) {
            data.slice(0, 3).forEach((d, i) => {
                console.log(`  ${i + 1}. ${d.data?.name || d.data?.title || d.id}`);
            });
        }
    }

    // 3. Check ff_* collections (FastFood)
    console.log('\n--- FF (FastFood) Koleksiyonları ---');
    const ffCollections = ['ff_products', 'ff_categories', 'ff_settings'];

    for (const col of ffCollections) {
        const { data } = await supabase
            .from('app_documents')
            .select('id, data')
            .eq('collection', col)
            .eq('data->>businessId', businessId);

        console.log(`${col}: ${data?.length || 0} belge`);
    }

    // 4. Also check direct ff_* tables
    console.log('\n--- Doğrudan FF Tabloları ---');
    try {
        const { data: ffProducts } = await supabase
            .from('ff_products')
            .select('id, name')
            .eq('business_id', businessId);
        console.log(`ff_products (direct): ${ffProducts?.length || 0}`);
    } catch (e) { }

    try {
        const { data: ffCats } = await supabase
            .from('ff_categories')
            .select('id, name')
            .eq('business_id', businessId);
        console.log(`ff_categories (direct): ${ffCats?.length || 0}`);
    } catch (e) { }
}

checkAlazRestoran().catch(console.error);
