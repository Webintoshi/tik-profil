import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xbtwqzgmhzxdwkfvjgxt.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testBebebBurger() {
    console.log('=== Bebek Burger Test ===');

    // 1. Get business
    const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('*')
        .ilike('slug', 'bebek-burger-akyazi')
        .maybeSingle();

    console.log('Business:', business?.name, 'ID:', business?.id, 'Module:', business?.active_module);

    if (businessError) console.error('Business error:', businessError);

    // 2. Get categories
    const { data: categories, error: catError } = await supabase
        .from('ff_categories')
        .select('*')
        .eq('business_id', business?.id);

    console.log('Categories:', categories?.length || 0);
    console.log('Category names:', categories?.map(c => c.name));

    if (catError) console.error('Categories error:', catError);

    // 3. Get products
    const { data: products, error: prodError } = await supabase
        .from('ff_products')
        .select('*')
        .eq('business_id', business?.id);

    console.log('Products:', products?.length || 0);
    console.log('Product names:', products?.map(p => p.name));

    if (prodError) console.error('Products error:', prodError);

    // 4. Get settings
    const { data: settings, error: setError } = await supabase
        .from('ff_settings')
        .select('*')
        .eq('business_id', business?.id)
        .maybeSingle();

    console.log('Settings:', settings);
    if (setError) console.error('Settings error:', setError);
}

testBebebBurger();
