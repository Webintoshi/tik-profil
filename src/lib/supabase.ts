import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let adminClient: SupabaseClient | null = null;
let publicClient: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
    if (adminClient) return adminClient;

    const url = process.env.SUPABASE_URL?.trim();
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

    if (!url || !serviceRoleKey) {
        throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }

    adminClient = createClient(url, serviceRoleKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
    });

    return adminClient;
}

export function getSupabaseClient(): SupabaseClient {
    if (publicClient) return publicClient;

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim();
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || process.env.SUPABASE_ANON_KEY?.trim();

    if (!url || !anonKey) {
        throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY');
    }

    publicClient = createClient(url, anonKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
    });

    return publicClient;
}
