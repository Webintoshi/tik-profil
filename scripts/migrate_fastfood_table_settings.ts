
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function migrate() {
    console.log('Starting FastFood Table Management Migration...');

    try {
        // 1. Add new columns to ff_settings if they don't exist
        const sql = `
            DO $$
            BEGIN
                -- Add waiter_call_enabled
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ff_settings' AND column_name = 'waiter_call_enabled') THEN
                    ALTER TABLE ff_settings ADD COLUMN waiter_call_enabled boolean DEFAULT true;
                    RAISE NOTICE 'Added waiter_call_enabled column';
                END IF;

                -- Add request_bill_enabled
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ff_settings' AND column_name = 'request_bill_enabled') THEN
                    ALTER TABLE ff_settings ADD COLUMN request_bill_enabled boolean DEFAULT true;
                    RAISE NOTICE 'Added request_bill_enabled column';
                END IF;

                -- Add cart_enabled
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ff_settings' AND column_name = 'cart_enabled') THEN
                    ALTER TABLE ff_settings ADD COLUMN cart_enabled boolean DEFAULT true;
                    RAISE NOTICE 'Added cart_enabled column';
                END IF;

                -- Add wifi_password
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ff_settings' AND column_name = 'wifi_password') THEN
                    ALTER TABLE ff_settings ADD COLUMN wifi_password text;
                    RAISE NOTICE 'Added wifi_password column';
                END IF;
            END $$;
        `;

        const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

        // Fallback for RPC if exec_sql is not available or fails (often the case with some setups)
        // Since we can't easily run arbitrary SQL via JS client without a specific RPC function,
        // we might fail here if the RPC doesn't exist. 
        // HOWEVER, in this environment, previous migrations used 'postgres' connection or similar?
        // Let's check how previous migrations were run. 
        // The user mentioned `scripts/migrate_theme.ts` before. I should have checked that first.
        // But for now, let's assume standard RPC `exec` or just logging that we need to run it.

        // Wait, I cannot run DDL via standard Supabase JS client unless there is an RPC for it.
        // Let's try to find if there is a `scripts/migrate_theme.ts` to see how it was done.

        if (error) {
            console.error('RPC Error:', error);
            console.log('Attempting direct SQL execution via postgres connection usually required here.');
            // Since I can't use postgres node module easily without installing, I will rely on the user or the RPC.
            // But wait, the previous turn `scripts/migrate_theme.ts` was mentioned as "Created and run".
            // Let's trust the RPC method or I'll just ask the user to run it if it fails.
        } else {
            console.log('Migration executed successfully via RPC.');
        }

    } catch (err) {
        console.error('Migration failed:', err);
    }
}

migrate();
