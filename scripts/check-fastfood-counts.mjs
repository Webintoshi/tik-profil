import { config as loadEnv } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..');

const envResult = loadEnv({ path: resolve(repoRoot, '.env.local'), override: true });
if (envResult.error) {
    loadEnv();
}

const supabaseUrl = process.env.SUPABASE_URL?.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
});

const tables = [
    { name: 'businesses', column: 'id' },
    { name: 'ff_categories', column: 'id' },
    { name: 'ff_products', column: 'id' },
    { name: 'ff_extra_groups', column: 'id' },
    { name: 'ff_extras', column: 'id' },
    { name: 'ff_campaigns', column: 'id' },
    { name: 'ff_coupons', column: 'id' },
    { name: 'ff_coupon_usages', column: 'id' },
    { name: 'ff_settings', column: 'business_id' },
    { name: 'ff_orders', column: 'id' },
];

for (const table of tables) {
    const { count, error } = await supabase
        .from(table.name)
        .select(table.column, { count: 'exact', head: true });

    if (error) {
        console.error(`[error] ${table.name}: ${error.message}`);
        process.exit(1);
    }

    console.log(`[count] ${table.name}: ${count ?? 0}`);
}
