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

async function checkAllBusinessesFull() {
    console.log('\n========================================');
    console.log('   TÜM İŞLETMELER TAM RAPORU');
    console.log('========================================\n');

    // Get all businesses
    const { data: businesses } = await supabase
        .from('businesses')
        .select('id, slug, name, data')
        .order('name');

    const results = [];

    for (const biz of (businesses || [])) {
        const modules = biz.data?.modules || [];
        const businessId = biz.id;

        let status = '✅';
        let details = [];

        // Check E-Commerce (app_documents)
        const { data: ecProducts } = await supabase
            .from('app_documents')
            .select('id')
            .eq('collection', 'ecommerce_products')
            .eq('data->>businessId', businessId);

        const { data: ecCats } = await supabase
            .from('app_documents')
            .select('id')
            .eq('collection', 'ecommerce_categories')
            .eq('data->>businessId', businessId);

        if (ecProducts?.length || ecCats?.length) {
            details.push(`E-Commerce: ${ecCats?.length || 0} kat, ${ecProducts?.length || 0} ürün`);
        }

        // Check FastFood (ff_* tables)
        const { data: ffProducts } = await supabase
            .from('ff_products')
            .select('id')
            .eq('business_id', businessId);

        const { data: ffCats } = await supabase
            .from('ff_categories')
            .select('id')
            .eq('business_id', businessId);

        if (ffProducts?.length || ffCats?.length) {
            details.push(`FastFood: ${ffCats?.length || 0} kat, ${ffProducts?.length || 0} ürün`);
        }

        // Check Emlak (app_documents)
        const { data: emListings } = await supabase
            .from('app_documents')
            .select('id')
            .eq('collection', 'em_listings')
            .eq('data->>businessId', businessId);

        const { data: emConsultants } = await supabase
            .from('app_documents')
            .select('id')
            .eq('collection', 'em_consultants')
            .eq('data->>businessId', businessId);

        if (emListings?.length || emConsultants?.length) {
            details.push(`Emlak: ${emListings?.length || 0} ilan, ${emConsultants?.length || 0} danışman`);
        }

        // Check Beauty (app_documents)
        const { data: beautyServices } = await supabase
            .from('app_documents')
            .select('id')
            .eq('collection', 'beauty_services')
            .eq('data->>businessId', businessId);

        if (beautyServices?.length) {
            details.push(`Beauty: ${beautyServices?.length || 0} hizmet`);
        }

        // Determine status
        if (details.length === 0) {
            if (modules.length > 0 || biz.data?.industryModule) {
                status = '⚠️';
                details.push('Modül tanımlı ama veri yok');
            } else {
                status = '❓';
                details.push('Modül ve veri yok (yeni işletme olabilir)');
            }
        }

        results.push({
            name: biz.name,
            slug: biz.slug,
            modules: modules.join(', ') || biz.data?.industryModule || '-',
            status,
            details: details.join(' | ')
        });
    }

    // Print results
    console.log('İşletme'.padEnd(25) + 'Slug'.padEnd(20) + 'Durum');
    console.log('-'.repeat(70));

    for (const r of results) {
        console.log(`${r.status} ${r.name?.substring(0, 22).padEnd(22)} ${r.slug?.substring(0, 18).padEnd(18)}`);
        console.log(`   Modüller: ${r.modules}`);
        console.log(`   ${r.details}`);
        console.log('');
    }

    // Summary
    const working = results.filter(r => r.status === '✅').length;
    const warning = results.filter(r => r.status === '⚠️').length;
    const unknown = results.filter(r => r.status === '❓').length;

    console.log('========================================');
    console.log(`ÖZET: ${working} çalışıyor, ${warning} uyarı, ${unknown} belirsiz`);
    console.log('========================================\n');
}

checkAllBusinessesFull().catch(console.error);
