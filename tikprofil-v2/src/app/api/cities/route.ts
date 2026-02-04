import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

// Snake case to camel case converter for DB response
function toCamelCase(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(toCamelCase);

    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
        const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
        result[camelKey] = toCamelCase(value);
    }
    return result;
}

// Camel case to snake case converter for DB update
function toSnakeCase(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(toSnakeCase);

    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
        const snakeKey = key.replace(/[A-Z]/g, c => `_${c.toLowerCase()}`);
        result[snakeKey] = toSnakeCase(value);
    }
    return result;
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const name = searchParams.get('name');
        const id = searchParams.get('id');

        const supabase = getSupabaseAdmin();

        if (id) {
            const { data, error } = await supabase
                .from('cities')
                .select('*')
                .eq('id', id)
                .single();

            if (error) {
                console.error('City API Error (by id):', error);
                return NextResponse.json(null);
            }
            return NextResponse.json(toCamelCase(data));
        }

        if (name) {
            const { data, error } = await supabase
                .from('cities')
                .select('*')
                .ilike('name', name)
                .single();

            if (error) {
                console.error('City API Error (by name):', error);
                return NextResponse.json(null);
            }
            return NextResponse.json(toCamelCase(data));
        }

        // Tüm şehirleri dön
        const { data, error } = await supabase
            .from('cities')
            .select('*')
            .order('name');

        if (error) {
            console.error('City API Error (all):', error);
            return NextResponse.json({ error: 'Failed to load city data' }, { status: 500 });
        }

        return NextResponse.json((data || []).map(toCamelCase));
    } catch (error) {
        console.error('City API Error:', error);
        return NextResponse.json({ error: 'Failed to load city data' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();

        if (!body.id) {
            return NextResponse.json({ error: 'Missing city id' }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();

        // Convert camelCase to snake_case for DB
        const dbData = toSnakeCase({
            ...body,
            updated_at: new Date().toISOString(),
        });

        const { data, error } = await supabase
            .from('cities')
            .upsert(dbData, {
                onConflict: 'id',
                ignoreDuplicates: false,
            })
            .select()
            .single();

        if (error) {
            console.error('City API POST Error:', error);
            return NextResponse.json({ error: 'Failed to save city data', details: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, data: toCamelCase(data) });
    } catch (error) {
        console.error('City API POST Error:', error);
        return NextResponse.json({ error: 'Failed to save city data' }, { status: 500 });
    }
}
