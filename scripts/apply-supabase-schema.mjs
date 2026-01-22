import { config as loadEnv } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { readFile } from 'node:fs/promises';
import { Client } from 'pg';
import { fileURLToPath } from 'node:url';
import { resolve4 } from 'node:dns/promises';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..');

const envResult = loadEnv({ path: resolve(repoRoot, '.env.local'), override: true });
if (envResult.error) {
    loadEnv();
}

const supabaseUrl = process.env.SUPABASE_URL?.trim();
const dbPassword = process.env.SUPABASE_DB_PASSWORD?.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const poolerHost = process.env.SUPABASE_POOLER_HOST?.trim();
const poolerPort = Number(process.env.SUPABASE_POOLER_PORT || 6543);
const poolerUserEnv = process.env.SUPABASE_POOLER_USER?.trim();
const poolerDatabase = process.env.SUPABASE_POOLER_DB?.trim() || 'postgres';

if (!supabaseUrl) {
    console.error('Missing SUPABASE_URL');
    process.exit(1);
}

const url = new URL(supabaseUrl);
const projectRef = url.hostname.split('.')[0];
const dbHost = `db.${projectRef}.supabase.co`;

let resolvedHost = dbHost;
try {
    const ipv4 = await resolve4(dbHost);
    if (ipv4?.length) {
        resolvedHost = ipv4[0];
    }
} catch (error) {
    console.warn('IPv4 lookup failed, falling back to hostname:', error?.message || error);
}

const schemaPath = resolve(repoRoot, 'supabase', 'fastfood_schema.sql');
const sql = await readFile(schemaPath, 'utf8');

async function applyViaDbConnection({ host, port, user, password, database }) {
    const client = new Client({
        host,
        port,
        user,
        password,
        database,
        ssl: { rejectUnauthorized: false },
    });

    await client.connect();
    try {
        await client.query('begin');
        await client.query(sql);
        await client.query('commit');
    } catch (error) {
        try {
            await client.query('rollback');
        } catch (rollbackError) {
            console.error('Rollback failed:', rollbackError);
        }
        throw error;
    } finally {
        await client.end();
    }
}

async function applyViaDb() {
    if (!dbPassword) {
        throw new Error('Missing SUPABASE_DB_PASSWORD');
    }

    await applyViaDbConnection({
        host: resolvedHost,
        port: 5432,
        user: 'postgres',
        password: dbPassword,
        database: 'postgres',
    });
}

async function applyViaPooler() {
    if (!dbPassword) {
        throw new Error('Missing SUPABASE_DB_PASSWORD');
    }

    const poolerHosts = poolerHost
        ? [poolerHost]
        : [
            'aws-0-eu-central-1.pooler.supabase.com',
            'aws-0-eu-west-1.pooler.supabase.com',
            'aws-0-eu-west-2.pooler.supabase.com',
            'aws-0-eu-west-3.pooler.supabase.com',
            'aws-0-eu-north-1.pooler.supabase.com',
            'aws-0-eu-south-1.pooler.supabase.com',
            'aws-0-eu-south-2.pooler.supabase.com',
        ];

    const poolerUser = poolerUserEnv || `postgres.${projectRef}`;

    let lastError = null;

    for (const host of poolerHosts) {
        try {
            console.log(`Trying pooler ${host}:${poolerPort} as ${poolerUser}`);
            await applyViaDbConnection({
                host,
                port: poolerPort || 6543,
                user: poolerUser,
                password: dbPassword,
                database: poolerDatabase,
            });
            return;
        } catch (error) {
            lastError = error;
        }
    }

    throw lastError || new Error('Pooler connection failed for all hosts');
}

async function applyViaPgMeta() {
    if (!serviceRoleKey) {
        throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
    }

    const baseUrl = supabaseUrl.replace(/\/$/, '');
    const endpoints = [
        `${baseUrl}/pg/meta/query`,
        `${baseUrl}/pg-meta/query`,
    ];

    let lastError = null;

    for (const endpoint of endpoints) {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                apikey: serviceRoleKey,
                Authorization: `Bearer ${serviceRoleKey}`,
            },
            body: JSON.stringify({ query: sql }),
        });

        if (response.ok) {
            return;
        }

        const errorText = await response.text();
        lastError = new Error(`pg-meta query failed at ${endpoint}: ${response.status} - ${errorText}`);
    }

    throw lastError || new Error('pg-meta query failed for all endpoints');
}

try {
    if (poolerHost) {
        await applyViaPooler();
        console.log('Supabase schema applied successfully (pooler).');
    } else {
        await applyViaDb();
        console.log('Supabase schema applied successfully (direct DB).');
    }
} catch (error) {
    if (!poolerHost) {
        console.warn('Direct DB apply failed, trying pooler:', error?.message || error);
        try {
            await applyViaPooler();
            console.log('Supabase schema applied successfully (pooler).');
            process.exit(0);
        } catch (poolerError) {
            console.warn('Pooler apply failed, trying pg-meta:', poolerError?.message || poolerError);
        }
    } else {
        console.warn('Pooler apply failed, trying pg-meta:', error?.message || error);
    }

    try {
        await applyViaPgMeta();
        console.log('Supabase schema applied successfully (pg-meta).');
    } catch (fallbackError) {
        console.error('Schema apply failed:', fallbackError);
        process.exit(1);
    }
}
