
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
    console.log('Starting FastFood Visual Settings Migration...');

    try {
        const sql = `
            DO $$
            BEGIN
                -- Add style_id
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ff_settings' AND column_name = 'style_id') THEN
                    ALTER TABLE ff_settings ADD COLUMN style_id text DEFAULT 'modern';
                    RAISE NOTICE 'Added style_id column';
                END IF;

                -- Add accent_color_id
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ff_settings' AND column_name = 'accent_color_id') THEN
                    ALTER TABLE ff_settings ADD COLUMN accent_color_id text DEFAULT 'emerald';
                    RAISE NOTICE 'Added accent_color_id column';
                END IF;

                -- Add show_avatar
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ff_settings' AND column_name = 'show_avatar') THEN
                    ALTER TABLE ff_settings ADD COLUMN show_avatar boolean DEFAULT true;
                    RAISE NOTICE 'Added show_avatar column';
                END IF;
            END $$;
        `;

        const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

        if (error) {
            console.error('RPC Error:', error);
        } else {
            console.log('Migration executed successfully via RPC.');
        }

    } catch (err) {
        console.error('Migration failed:', err);
    }
}

migrate();
