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

async function checkEmlakData() {
    console.log('\n=== EMLAK VERİLERİ KONTROLÜ ===\n');

    // 1. Check em_listings in app_documents
    const { data: listings } = await supabase
        .from('app_documents')
        .select('id, data')
        .eq('collection', 'em_listings');

    console.log(`em_listings sayısı: ${listings?.length || 0}`);

    if (listings && listings.length > 0) {
        console.log('\nİlanlar:');
        listings.forEach((l, i) => {
            console.log(`${i + 1}. ${l.data?.title || l.id}`);
            console.log(`   businessId: ${l.data?.businessId}`);
            console.log(`   status: ${l.data?.status}`);
            console.log(`   isActive: ${l.data?.isActive}`);
        });
    }

    // 2. Check em_consultants
    const { data: consultants } = await supabase
        .from('app_documents')
        .select('id, data')
        .eq('collection', 'em_consultants');

    console.log(`\nem_consultants sayısı: ${consultants?.length || 0}`);

    if (consultants && consultants.length > 0) {
        console.log('\nDanışmanlar:');
        consultants.forEach((c, i) => {
            console.log(`${i + 1}. ${c.data?.name || c.id}`);
            console.log(`   businessId: ${c.data?.businessId}`);
        });
    }

    // 3. Check celebi-emlak business
    const { data: business } = await supabase
        .from('businesses')
        .select('id, slug, name')
        .eq('slug', 'celebi-emlak')
        .maybeSingle();

    console.log('\nCelebi Emlak işletmesi:');
    if (business) {
        console.log(`   ID: ${business.id}`);
        console.log(`   Slug: ${business.slug}`);
        console.log(`   Name: ${business.name}`);
    } else {
        console.log('   BULUNAMADI!');
    }
}

checkEmlakData().catch(console.error);
