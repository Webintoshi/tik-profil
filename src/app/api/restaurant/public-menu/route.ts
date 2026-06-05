// Restaurant Public Menu API - No authentication required
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

// Force dynamic to prevent caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET - Get public menu (categories + products) for a restaurant
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const businessSlug = searchParams.get('businessSlug');
        const tableId = searchParams.get('tableId');

        if (!businessSlug) {
            return NextResponse.json({ success: false, error: 'businessSlug required' }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();

        const { data: business, error: businessError } = await supabase
            .from('businesses')
            .select('id, name, logo, phone, whatsapp')
            .ilike('slug', businessSlug)
            .maybeSingle();

        if (businessError) {
            console.error('[Restaurant Public Menu] Supabase error:', businessError);
            return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
        }

        if (!business) {
            return NextResponse.json({ success: false, error: 'Business not found' }, { status: 404 });
        }

        const businessId = business.id as string;

        const [
            { data: allCategories, error: categoriesError },
            { data: allProducts, error: productsError },
            { data: settings, error: settingsError },
            { data: tableData, error: tableError },
        ] = await Promise.all([
            supabase
                .from('fb_categories')
                .select('*')
                .eq('business_id', businessId)
                .order('sort_order', { ascending: true }),
            supabase
                .from('fb_products')
                .select('*')
                .eq('business_id', businessId)
                .order('sort_order', { ascending: true }),
            supabase
                .from('fb_settings')
                .select('*')
                .eq('business_id', businessId)
                .maybeSingle(),
            tableId
                ? supabase
                    .from('fb_tables')
                    .select('name')
                    .eq('id', tableId)
                    .maybeSingle()
                : Promise.resolve({ data: null, error: null }),
        ]);

        if (categoriesError || productsError || settingsError || tableError) {
            console.error('[Restaurant Public Menu] Supabase error:', categoriesError || productsError || settingsError || tableError);
            return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
        }

        const categories = (allCategories || []).map(cat => ({
            id: cat.id,
            name: cat.name,
            name_en: cat.name_en || cat.name,
            order: cat.sort_order || 0,
            icon: cat.icon || '🍽️',
            image: cat.image || '',
        }));

        const products = (allProducts || [])
            .filter(p => p.in_stock !== false)
            .map(p => ({
                id: p.id,
                name: p.name,
                name_en: p.name_en || p.name,
                description: p.description || '',
                description_en: p.description_en || p.description || '',
                price: Number(p.price) || 0,
                categoryId: p.category_id,
                image: p.image || '',
                inStock: p.in_stock !== false,
                order: p.sort_order || 0,
            }));

        return NextResponse.json({
            success: true,
            data: {
                businessId,
                businessName: business.name,
                businessLogo: business.logo || '',
                businessPhone: business.phone || '',
                businessWhatsapp: business.whatsapp || business.phone || '',
                tableName: tableData?.name || '',
                categories,
                products,
                settings: {
                    styleId: settings?.style_id || 'modern',
                    accentColorId: settings?.accent_color_id || 'emerald',
                    showAvatar: settings?.show_avatar !== false,
                    cartEnabled: settings?.cart_enabled !== false,
                    whatsappOrderEnabled: settings?.whatsapp_order_enabled !== false,
                    waiterCallEnabled: (settings?.waiter_call_enabled ?? settings?.call_waiter_enabled) !== false,
                    wifiPassword: settings?.wifi_password || '',
                }
            }
        }, {
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate',
            }
        });

    } catch (error) {
        console.error('[Restaurant Public Menu] Error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}
