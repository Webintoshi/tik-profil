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

async function check() {
    console.log('\\n=== Veritabanı Durumu ===\\n');

    // 1. app_documents collections
    const { data: collections } = await supabase
        .from('app_documents')
        .select('collection')
        .limit(1000);

    const collectionCounts = {};
    (collections || []).forEach(row => {
        collectionCounts[row.collection] = (collectionCounts[row.collection] || 0) + 1;
    });
    console.log('app_documents koleksiyonları:', collectionCounts);

    // 2. businesses table
    const { data: businesses } = await supabase
        .from('businesses')
        .select('id, slug, data')
        .eq('slug', 'derycraft')
        .maybeSingle();

    if (businesses) {
        console.log('\\nDerycraft işletme bilgileri:');
        console.log('  ID:', businesses.id);
        console.log('  Slug:', businesses.slug);
        console.log('  Module:', businesses.data?.industryModule || businesses.data?.businessType || 'bilinmiyor');
    } else {
        console.log('\\nDerycraft bulunamadı!');
    }

    // 3. Check ecommerce_products in app_documents
    const { data: ecomProducts } = await supabase
        .from('app_documents')
        .select('id, data')
        .eq('collection', 'ecommerce_products')
        .limit(5);
    console.log('\\necommerce_products sayısı:', ecomProducts?.length || 0);

    // 4. Check ecommerce_categories in app_documents
    const { data: ecomCats } = await supabase
        .from('app_documents')
        .select('id, data')
        .eq('collection', 'ecommerce_categories')
        .limit(5);
    console.log('ecommerce_categories sayısı:', ecomCats?.length || 0);

    // 5. Direct products for derycraft
    if (businesses) {
        const { data: directProducts } = await supabase
            .from('app_documents')
            .select('id, data')
            .eq('collection', 'ecommerce_products')
            .filter('data->>businessId', 'eq', businesses.id)
            .limit(10);
        console.log(`\\nDerycraft ürünleri (ecommerce_products):`, directProducts?.length || 0);
    }
}

check().catch(console.error);
