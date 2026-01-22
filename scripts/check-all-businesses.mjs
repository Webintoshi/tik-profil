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

async function checkAllBusinesses() {
    console.log('\\n=== TÜM İŞLETMELER KONTROLÜ ===\\n');

    // 1. Get all businesses
    const { data: businesses } = await supabase
        .from('businesses')
        .select('id, slug, name, data')
        .order('created_at', { ascending: false });

    console.log(`Toplam ${businesses?.length || 0} işletme bulundu:\\n`);

    // 2. For each business, check their products based on module type
    for (const biz of (businesses || [])) {
        const modules = biz.data?.modules || [];
        const industryModule = biz.data?.industryModule || biz.data?.businessType || 'unknown';

        let productCount = 0;
        let categoryCount = 0;
        let status = '✅';
        let details = '';

        // Check FastFood module
        if (modules.includes('fastfood') || industryModule === 'fastfood') {
            // Check ff_products in app_documents
            const { data: ffProducts } = await supabase
                .from('app_documents')
                .select('id')
                .eq('collection', 'ff_products')
                .filter('data->>businessId', 'eq', biz.id);

            const { data: ffCats } = await supabase
                .from('app_documents')
                .select('id')
                .eq('collection', 'ff_categories')
                .filter('data->>businessId', 'eq', biz.id);

            productCount = ffProducts?.length || 0;
            categoryCount = ffCats?.length || 0;
            details = `FastFood: ${categoryCount} kat, ${productCount} ürün`;
        }

        // Check E-Commerce module
        if (modules.includes('ecommerce') || industryModule === 'ecommerce') {
            const { data: ecProducts } = await supabase
                .from('app_documents')
                .select('id')
                .eq('collection', 'ecommerce_products')
                .filter('data->>businessId', 'eq', biz.id);

            const { data: ecCats } = await supabase
                .from('app_documents')
                .select('id')
                .eq('collection', 'ecommerce_categories')
                .filter('data->>businessId', 'eq', biz.id);

            productCount = ecProducts?.length || 0;
            categoryCount = ecCats?.length || 0;
            details = `E-Commerce: ${categoryCount} kat, ${productCount} ürün`;
        }

        // Check Beauty module
        if (modules.includes('beauty') || industryModule === 'beauty') {
            const { data: services } = await supabase
                .from('app_documents')
                .select('id')
                .eq('collection', 'beauty_services')
                .filter('data->>businessId', 'eq', biz.id);

            productCount = services?.length || 0;
            details = `Beauty: ${productCount} hizmet`;
        }

        // Check Emlak module
        if (modules.includes('emlak') || industryModule === 'emlak') {
            const { data: listings } = await supabase
                .from('app_documents')
                .select('id')
                .eq('collection', 'emlak_listings')
                .filter('data->>businessId', 'eq', biz.id);

            productCount = listings?.length || 0;
            details = `Emlak: ${productCount} ilan`;
        }

        if (productCount === 0 && categoryCount === 0 && modules.length > 0) {
            status = '⚠️';
        }

        if (!modules.length && industryModule === 'unknown') {
            status = '❓';
            details = 'Modül tanımsız';
        }

        console.log(`${status} ${biz.name || biz.slug}`);
        console.log(`   Slug: ${biz.slug}`);
        console.log(`   Modüller: ${modules.join(', ') || industryModule || 'yok'}`);
        console.log(`   ${details || 'Veri yok'}`);
        console.log('');
    }

    // 3. Summary of app_documents
    console.log('\\n=== APP_DOCUMENTS ÖZET ===\\n');
    const { data: allDocs } = await supabase
        .from('app_documents')
        .select('collection');

    const collectionCounts = {};
    (allDocs || []).forEach(row => {
        collectionCounts[row.collection] = (collectionCounts[row.collection] || 0) + 1;
    });

    Object.entries(collectionCounts).sort((a, b) => b[1] - a[1]).forEach(([col, count]) => {
        console.log(`   ${col}: ${count}`);
    });
}

checkAllBusinesses().catch(console.error);
