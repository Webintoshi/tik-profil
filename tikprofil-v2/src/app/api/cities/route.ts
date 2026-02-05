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

// Normalize city data - ensure all arrays are arrays, strings are strings
function normalizeCityData(city: any): any {
    if (!city || typeof city !== 'object') return city;

    return {
        ...city,
        // Ensure arrays are never null
        tags: Array.isArray(city.tags) ? city.tags : [],
        gallery: Array.isArray(city.gallery) ? city.gallery : [],
        places: Array.isArray(city.places) ? city.places : [],
        // Ensure strings are never null
        coverImage: city.coverImage || '',
        coverImageAlt: city.coverImageAlt || '',
        tagline: city.tagline || '',
        shortDescription: city.shortDescription || '',
        content: city.content ?? '',
        seoTitle: city.seoTitle || '',
        seoDescription: city.seoDescription || '',
        canonicalUrl: city.canonicalUrl || '',
        slug: city.slug || '',
    };
}

// Input validation
function validateCityData(data: any): { valid: boolean; error?: string } {
    if (!data.id || typeof data.id !== 'string') {
        return { valid: false, error: 'Invalid city id' };
    }
    if (!data.name || typeof data.name !== 'string') {
        return { valid: false, error: 'Invalid city name' };
    }
    return { valid: true };
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
            return NextResponse.json(normalizeCityData(toCamelCase(data)));
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
            return NextResponse.json(normalizeCityData(toCamelCase(data)));
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

        return NextResponse.json((data || []).map(toCamelCase).map(normalizeCityData));
    } catch (error) {
        console.error('City API Error:', error);
        return NextResponse.json({ error: 'Failed to load city data' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();

        console.log('[Cities API POST] Received data:', {
            id: body.id,
            name: body.name,
            coverImage: body.coverImage?.substring(0, 50) + '...',
            hasData: !!body
        });

        // Validation
        const validation = validateCityData(body);
        if (!validation.valid) {
            console.error('[Cities API POST] Validation failed:', validation.error);
            return NextResponse.json({ error: validation.error }, { status: 400 });
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
            console.error('[Cities API POST] Supabase upsert error:', error);
            console.error('[Cities API POST] dbData:', dbData);
            return NextResponse.json({ error: 'Failed to save city data', details: error.message }, { status: 500 });
        }

        console.log('[Cities API POST] Success! Saved city:', data.id, 'coverImage:', data.cover_image?.substring(0, 50) + '...');

        return NextResponse.json({ success: true, data: normalizeCityData(toCamelCase(data)) });
    } catch (error) {
        console.error('City API POST Error:', error);
        return NextResponse.json({ error: 'Failed to save city data' }, { status: 500 });
    }
}
