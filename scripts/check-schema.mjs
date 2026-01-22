
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env.local
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
    console.error("Missing env vars");
    process.exit(1);
}

const supabase = createClient(url, key);

async function checkSchema() {
    console.log("Checking 'businesses' table schema...");

    // Try to select other potentially missing columns
    const { data, error } = await supabase
        .from('businesses')
        .select('id, email, phone, whatsapp')
        .limit(1);

    if (error) {
        console.error("❌ Error selecting columns:", error.message);
        console.error("Full Error:", error);
    } else {
        console.log("✅ Successfully selected email/phone/whatsapp columns.");
        console.log("Data sample:", data);
    }
}

checkSchema();
