
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) { console.error("Missing env vars"); process.exit(1); }

const supabase = createClient(url, key);

async function checkColumn(colName) {
    const { error } = await supabase
        .from('businesses')
        .select(`id, ${colName}`)
        .limit(1);

    if (error) {
        console.error(`❌ Missing column: ${colName}`);
        return false;
    }
    console.log(`✅ Found column: ${colName}`);
    return true;
}

async function run() {
    console.log("🔍 Checking 'businesses' table columns...");

    // Check critical columns one by one
    const columnsToCheck = ['about', 'email', 'phone', 'whatsapp', 'slogan', 'logo', 'cover'];

    let allGood = true;
    for (const col of columnsToCheck) {
        const exists = await checkColumn(col);
        if (!exists) allGood = false;
    }

    if (allGood) {
        console.log("\n🎉 ALL COLUMNS EXIST! (Try running the simulation now)");
    } else {
        console.log("\n⚠️ SOME COLUMNS ARE MISSING. Please run the SQL again.");
    }
}

run();
