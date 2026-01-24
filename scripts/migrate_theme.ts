
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
    console.log('Adding menu_theme column to ff_settings...');

    const { error } = await supabase.rpc('exec_sql', {
        sql_query: `
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ff_settings' AND column_name = 'menu_theme') THEN
          ALTER TABLE ff_settings ADD COLUMN menu_theme text DEFAULT 'modern';
        END IF;
      END
      $$;
    `
    });

    if (error) {
        // If exec_sql RPC is not available (common in some setups), try direct query via special permissions or just logging
        console.error('RPC exec_sql failed (expected if not configured):', error);
        console.log('Attempting alternative via direct SQL if possible, or manual instruction.');
        console.log('Please run this SQL in Supabase SQL Editor:');
        console.log("ALTER TABLE ff_settings ADD COLUMN IF NOT EXISTS menu_theme text DEFAULT 'modern';");
    } else {
        console.log('Migration completed successfully via RPC.');
    }
}

migrate();
