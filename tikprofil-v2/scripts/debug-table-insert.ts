
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

// Admin client to bypass RLS initially to check if table exists
const adminClient = createClient(supabaseUrl, supabaseServiceKey);

async function testTableCreation() {
    console.log('Testing table creation...');

    // 1. Get a test business
    const { data: business } = await adminClient
        .from('businesses')
        .select('id')
        .limit(1)
        .single();

    if (!business) {
        console.error('No business found to test with');
        return;
    }

    console.log(`Using business ID: ${business.id}`);

    // 2. Try to insert a table using ANALYTICS/ANON key (simulating client)
    // Note: Creating a client with anon key usually requires a valid user session for RLS to pass.
    // If we just use admin client, it will always succeed if schema is correct.
    // We want to see if the TABLE STRUCTURE is correct first.

    try {
        const { data, error } = await adminClient
            .from('fb_tables')
            .insert({
                business_id: business.id,
                name: 'Test Masa Script',
                scan_count: 0
            })
            .select()
            .single();

        if (error) {
            console.error('Insert Error:', error);
        } else {
            console.log('Insert Success:', data);

            // Clean up
            await adminClient.from('fb_tables').delete().eq('id', data.id);
            console.log('Cleaned up test table');
        }

    } catch (e) {
        console.error('Exception:', e);
    }
}

testTableCreation();
