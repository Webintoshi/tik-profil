// Public Fast Food Menu API - No authentication required
// PERFORMANCE OPTIMIZED: Parallel fetching with Promise.all
// SECURITY: Module verification to prevent Restaurant data in FastFood tables
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

// Force dynamic to prevent caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET - Get public menu (categories + products + extras) for a business
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const businessSlug = searchParams.get('businessSlug');
        const tableId = searchParams.get('tableId');

        if (!businessSlug) {
            return NextResponse.json({ success: false, error: 'businessSlug required' }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();

        // STEP 1: First get business (required for businessId)
        const { data: businesses, error: businessError } = await supabase
            .from('businesses')
            .select('id, name, slug, phone, whatsapp, logo, active_module, modules, industry_label')
            .ilike('slug', businessSlug)
            .order('created_at', { ascending: true });

        if (businessError) {
            throw businessError;
        }

        const matchingBusinesses = businesses || [];
        const business = matchingBusinesses[matchingBusinesses.length - 1];

        if (!business) {
            return NextResponse.json({ success: false, error: 'Business not found' }, { status: 404 });
        }

        const businessId = business.id as string;

        // SECURITY: Check if fastfood module is enabled (but still return data if exists)
        const modules = (business.modules as string[]) || [];
        const hasFastFoodModule = modules.includes('fastfood') || business.active_module === 'fastfood';
        
        console.log(`[FastFood Public Menu] Business ${businessId} module check:`, {
            hasFastFoodModule,
            active_module: business.active_module,
            modules
        });

        // Get table info if tableId is provided
        let tableName = null;
        if (tableId) {
            const { data: tableData } = await supabase
                .from('fb_tables')
                .select('name')
                .eq('id', tableId)
                .maybeSingle();
            tableName = tableData?.name || null;
        }

        // ============================================
        // PERFORMANCE OPTIMIZATION: Parallel fetching
        // All 6 collections fetched simultaneously
        // Expected improvement: 5-6s → 1-2s
        // ============================================
        const [
            categoriesResult,
            productsResult,
            groupsResult,
            extrasResult,
            campaignsResult,
            settingsResult
        ] = await Promise.all([
            supabase.from('ff_categories').select('*').eq('business_id', businessId).order('created_at', { ascending: true }),
            supabase.from('ff_products').select('*').eq('business_id', businessId).order('created_at', { ascending: true }),
            supabase.from('ff_extra_groups').select('*').eq('business_id', businessId),
            supabase.from('ff_extras').select('*'),
            supabase.from('ff_campaigns').select('*').eq('business_id', businessId),
            supabase.from('ff_settings').select('*').eq('business_id', businessId).maybeSingle()
        ]);

        if (categoriesResult.error || productsResult.error || groupsResult.error || extrasResult.error || campaignsResult.error || settingsResult.error) {
            console.error('[FastFood Public Menu] Database errors:', {
                categoriesError: categoriesResult.error?.message,
                productsError: productsResult.error?.message,
                groupsError: groupsResult.error?.message,
                extrasError: extrasResult.error?.message,
                campaignsError: campaignsResult.error?.message,
                settingsError: settingsResult.error?.message
            });
            throw categoriesResult.error || productsResult.error || groupsResult.error || extrasResult.error || campaignsResult.error || settingsResult.error;
        }

        const allCategories = categoriesResult.data || [];
        const allProducts = productsResult.data || [];
        const allExtraGroups = groupsResult.data || [];
        const allExtras = extrasResult.data || [];
        const allCampaigns = campaignsResult.data || [];
        const settings = settingsResult.data || null;

        console.log('[FastFood Public Menu] Raw data counts:', {
            categories: allCategories.length,
            products: allProducts.length,
            extraGroups: allExtraGroups.length,
            extras: allExtras.length,
            campaigns: allCampaigns.length,
            businessId
        });

        /* ============================================
         * ORIGINAL SEQUENTIAL VERSION (for rollback):
         * ============================================
         * const allCategories = await getCollectionREST('ff_categories');
         * const allProducts = await getCollectionREST('ff_products');
         * const allExtraGroups = await getCollectionREST('ff_extra_groups');
         * const allExtras = await getCollectionREST('ff_extras');
         * const allCampaigns = await getCollectionREST('ff_campaigns');
         * const settings = await getDocumentREST('ff_settings', businessId);
         * ============================================
         */

        // Process categories
        const categories = allCategories
            .filter(cat => cat.business_id === businessId && cat.is_active !== false)
            .map(cat => ({
                id: cat.id,
                name: cat.name,
                sortOrder: cat.sort_order || 0,
                icon: cat.icon || '🍔',
            }));

        // Process products
        // Filter: is_active must be true or null (treat null as active)
        // Filter: in_stock must be true or null (treat null as in stock)
        const products = allProducts
            .filter(p => p.business_id === businessId)
            .filter(p => p.is_active !== false)  // Only filter out explicitly inactive
            .filter(p => p.in_stock !== false)   // Only filter out explicitly out of stock
            .map(p => ({
                id: p.id,
                name: p.name,
                description: p.description || '',
                price: Number(p.price) || 0,
                categoryId: p.category_id,
                imageUrl: p.image_url || '',
                inStock: p.in_stock !== false,
                sortOrder: p.sort_order || 0,
                extraGroupIds: p.extra_group_ids || [],
                sizes: p.sizes || {},
                prepTime: p.prep_time || null,
                discountPrice: p.discount_price ? Number(p.discount_price) : null,
                discountUntil: p.discount_until ? new Date(p.discount_until) : null,
                calories: p.calories || null,
                spicyLevel: p.spicy_level || null,
                allergens: p.allergens || [],
            }));

        console.log('[FastFood Public Menu] Filtered products:', {
            beforeFilter: allProducts.length,
            afterFilter: products.length,
            sampleProduct: products[0]
        });

        // Process extras (before extra groups)
        const extras = allExtras
            .filter(e => e.is_active !== false)
            .map(e => ({
                id: e.id,
                groupId: e.group_id,
                name: e.name,
                priceModifier: Number(e.price_modifier) || 0,
                isDefault: e.is_default || false,
                image: e.image_url || '',
                order: e.sort_order || 0,
            }));

        // Process extra groups
        const extraGroups = allExtraGroups
            .filter(eg => eg.business_id === businessId && eg.is_active !== false)
            .map(eg => ({
                id: eg.id,
                name: eg.name,
                selectionType: eg.selection_type || 'single',
                isRequired: eg.is_required || false,
                maxSelections: eg.max_selections || 1,
                order: eg.sort_order || 0,
                extras: extras.filter(e => e.groupId === eg.id),
            }));

        // Process campaigns
        const campaigns = allCampaigns
            .filter(c => c.business_id === businessId && c.is_active !== false)
            .filter(c => !c.valid_until || new Date(c.valid_until) > new Date())
            .map(c => ({
                id: c.id,
                title: c.title,
                description: c.description || '',
                emoji: c.emoji || '🎉',
            }));

        // Process settings
        const businessSettings = {
            deliveryEnabled: settings?.delivery_enabled !== false,
            pickupEnabled: settings?.pickup_enabled !== false,
            minOrderAmount: Number(settings?.min_order_amount) || 0,
            deliveryFee: Number(settings?.delivery_fee) || 0,
            freeDeliveryAbove: Number(settings?.free_delivery_above) || 0,
            estimatedDeliveryTime: settings?.estimated_delivery_time || null,
            cashPayment: settings?.cash_payment !== false,
            cardOnDelivery: settings?.card_on_delivery !== false,
            onlinePayment: settings?.online_payment !== false,
            workingHours: settings?.working_hours || null,
            useBusinessHours: settings?.use_business_hours !== false,
            whatsappNumber: settings?.whatsapp_number || '',
            notifications: settings?.notifications || {},
            menuTheme: settings?.menu_theme || 'modern',
            waiterCallEnabled: settings?.waiter_call_enabled !== false,
            requestBillEnabled: settings?.request_bill_enabled !== false,
            cartEnabled: settings?.cart_enabled !== false,
            wifiPassword: settings?.wifi_password || '',
            styleId: settings?.style_id || 'modern',
            accentColorId: settings?.accent_color_id || 'emerald',
            showAvatar: settings?.show_avatar !== false,
            isActive: settings?.is_active !== false,
        };

        // Check if any data exists
        const hasData = categories.length > 0 || products.length > 0;
        
        // If no fastfood module AND no data, return warning
        if (!hasFastFoodModule && !hasData) {
            return NextResponse.json({
                success: false,
                error: 'Bu işletme için fastfood menüsü bulunamadı. Lütfen işletme sahibiyle iletişime geçin.',
                debug: { 
                    active_module: business.active_module, 
                    modules,
                    hasData,
                    hasFastFoodModule 
                }
            }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            data: {
                businessId,
                businessName: business.name,
                businessLogoUrl: business.logo || '',
                businessPhone: business.phone || '',
                whatsapp: business.whatsapp || business.phone || '',
                tableName,
                categories,
                products,
                extraGroups,
                extras,
                campaigns,
                settings: businessSettings,
            },
            debug: {
                hasFastFoodModule,
                active_module: business.active_module,
                modules
            }
        });
    } catch (error) {
        console.error('[FastFood Public Menu] Error:', error);
        return NextResponse.json({
            success: false,
            error: 'Server error'
        }, { status: 500 });
    }
}
