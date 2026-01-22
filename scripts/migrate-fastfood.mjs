import { config as loadEnv } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..');

const envResult = loadEnv({ path: resolve(repoRoot, '.env.local'), override: true });
if (envResult.error) {
    loadEnv();
}

const SUPABASE_URL = process.env.SUPABASE_URL?.trim();
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing Supabase env vars (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)');
    process.exit(1);
}

const DOCUMENTS_TABLE = 'app_documents';
const PAGE_SIZE = 1000;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
});

function normalizeBusinessRow(row) {
    return {
        ...row,
        createdAt: row.created_at || null,
        updatedAt: row.updated_at || row.created_at || null,
    };
}

async function fetchCollection(collection) {
    const allDocuments = [];
    let offset = 0;

    while (true) {
        let data;
        if (collection === 'businesses') {
            const response = await supabase
                .from('businesses')
                .select('*')
                .range(offset, offset + PAGE_SIZE - 1);
            if (response.error) throw response.error;
            data = response.data || [];
            allDocuments.push(...data.map(normalizeBusinessRow));
        } else {
            const response = await supabase
                .from(DOCUMENTS_TABLE)
                .select('id,data')
                .eq('collection', collection)
                .range(offset, offset + PAGE_SIZE - 1);
            if (response.error) throw response.error;
            data = response.data || [];
            allDocuments.push(...data.map(row => ({ id: row.id, ...(row.data || {}) })));
        }

        if (!data || data.length < PAGE_SIZE) break;
        offset += PAGE_SIZE;
    }

    return allDocuments;
}

function chunkArray(items, size = 500) {
    const chunks = [];
    for (let i = 0; i < items.length; i += size) {
        chunks.push(items.slice(i, i + size));
    }
    return chunks;
}

async function upsertBatches(table, rows, conflictKey = 'id') {
    const chunks = chunkArray(rows, 500);
    for (const chunk of chunks) {
        const { error } = await supabase.from(table).upsert(chunk, { onConflict: conflictKey });
        if (error) {
            throw new Error(`Supabase upsert failed for ${table}: ${error.message}`);
        }
    }
}

function mapBusiness(doc) {
    const { id, ...data } = doc;
    return {
        id,
        name: doc.name || null,
        slug: doc.slug || null,
        phone: doc.phone || null,
        whatsapp: doc.whatsapp || doc.phone || null,
        data,
        created_at: doc.createdAt || null,
        updated_at: doc.updatedAt || doc.createdAt || null,
    };
}

function mapCategory(doc) {
    return {
        id: doc.id,
        business_id: doc.businessId || doc.business_id,
        name: doc.name || '',
        icon: doc.icon || '',
        sort_order: doc.sortOrder ?? doc.sort_order ?? 0,
        is_active: doc.isActive !== false,
        created_at: doc.createdAt || doc.created_at || null,
        updated_at: doc.updatedAt || doc.updated_at || doc.createdAt || doc.created_at || null,
    };
}

function mapProduct(doc) {
    return {
        id: doc.id,
        business_id: doc.businessId || doc.business_id,
        category_id: doc.categoryId || doc.category_id,
        name: doc.name || '',
        description: doc.description || '',
        price: Number(doc.price || 0),
        image_url: doc.imageUrl || doc.image_url || '',
        is_active: doc.isActive !== false,
        in_stock: doc.inStock !== false,
        extra_group_ids: Array.isArray(doc.extraGroupIds) ? doc.extraGroupIds : [],
        sort_order: doc.sortOrder ?? doc.sort_order ?? 0,
        sizes: doc.sizes || null,
        prep_time: doc.prepTime ?? doc.prep_time ?? null,
        tax_rate: doc.taxRate ?? doc.tax_rate ?? null,
        allergens: Array.isArray(doc.allergens) ? doc.allergens : [],
        discount_price: doc.discountPrice ?? doc.discount_price ?? null,
        discount_until: doc.discountUntil || doc.discount_until || null,
        tags: Array.isArray(doc.tags) ? doc.tags : [],
        calories: doc.calories ?? null,
        spicy_level: doc.spicyLevel ?? doc.spicy_level ?? null,
        created_at: doc.createdAt || doc.created_at || null,
        updated_at: doc.updatedAt || doc.updated_at || doc.createdAt || doc.created_at || null,
    };
}

function mapExtraGroup(doc) {
    return {
        id: doc.id,
        business_id: doc.businessId || doc.business_id,
        name: doc.name || '',
        selection_type: doc.selectionType || doc.selection_type || 'single',
        is_required: doc.isRequired || doc.is_required || false,
        max_selections: doc.maxSelections ?? doc.max_selections ?? 1,
        sort_order: doc.sortOrder ?? doc.sort_order ?? 0,
        is_active: doc.isActive !== false,
        created_at: doc.createdAt || doc.created_at || null,
        updated_at: doc.updatedAt || doc.updated_at || doc.createdAt || doc.created_at || null,
    };
}

function mapExtra(doc) {
    return {
        id: doc.id,
        group_id: doc.groupId || doc.group_id,
        name: doc.name || '',
        price_modifier: Number(doc.priceModifier || doc.price_modifier || 0),
        is_default: doc.isDefault || doc.is_default || false,
        image_url: doc.imageUrl || doc.image_url || '',
        sort_order: doc.sortOrder ?? doc.sort_order ?? 0,
        is_active: doc.isActive !== false,
        created_at: doc.createdAt || doc.created_at || null,
        updated_at: doc.updatedAt || doc.updated_at || doc.createdAt || doc.created_at || null,
    };
}

function mapCampaign(doc) {
    return {
        id: doc.id,
        business_id: doc.businessId || doc.business_id,
        title: doc.title || '',
        description: doc.description || '',
        emoji: doc.emoji || '',
        is_active: doc.isActive !== false,
        valid_until: doc.validUntil || doc.valid_until || null,
        sort_order: doc.sortOrder ?? doc.sort_order ?? 0,
        created_at: doc.createdAt || doc.created_at || null,
        updated_at: doc.updatedAt || doc.updated_at || doc.createdAt || doc.created_at || null,
    };
}

function mapCoupon(doc) {
    return {
        id: doc.id,
        business_id: doc.businessId || doc.business_id,
        code: doc.code || '',
        title: doc.title || '',
        description: doc.description || '',
        emoji: doc.emoji || '',
        discount_type: doc.discountType || doc.discount_type || 'fixed',
        discount_value: Number(doc.discountValue || doc.discount_value || 0),
        max_discount_amount: doc.maxDiscountAmount ?? doc.max_discount_amount ?? null,
        bogo_type: doc.bogoType ?? doc.bogo_type ?? null,
        bogo_buy_quantity: doc.bogoBuyQuantity ?? doc.bogo_buy_quantity ?? null,
        bogo_get_quantity: doc.bogoGetQuantity ?? doc.bogo_get_quantity ?? null,
        bogo_discount_percent: doc.bogoDiscountPercent ?? doc.bogo_discount_percent ?? null,
        min_order_amount: Number(doc.minOrderAmount || doc.min_order_amount || 0),
        max_usage_count: Number(doc.maxUsageCount || doc.max_usage_count || 0),
        usage_per_user: Number(doc.usagePerUser || doc.usage_per_user || 0),
        current_usage_count: Number(doc.currentUsageCount || doc.current_usage_count || 0),
        valid_from: doc.validFrom || doc.valid_from || null,
        valid_until: doc.validUntil || doc.valid_until || null,
        is_active: doc.isActive !== false,
        applicable_to: doc.applicableTo || doc.applicable_to || 'all',
        applicable_category_ids: Array.isArray(doc.applicableCategoryIds) ? doc.applicableCategoryIds : [],
        applicable_product_ids: Array.isArray(doc.applicableProductIds) ? doc.applicableProductIds : [],
        is_public: doc.isPublic !== false,
        is_first_order_only: doc.isFirstOrderOnly === true,
        created_at: doc.createdAt || doc.created_at || null,
        updated_at: doc.updatedAt || doc.updated_at || doc.createdAt || doc.created_at || null,
    };
}

function mapCouponUsage(doc) {
    return {
        id: doc.id,
        business_id: doc.businessId || doc.business_id,
        coupon_id: doc.couponId || doc.coupon_id,
        code: doc.code || null,
        customer_phone: doc.customerPhone || doc.customer_phone || null,
        order_id: doc.orderId || doc.order_id || null,
        discount_amount: Number(doc.discountAmount || doc.discountApplied || doc.discount_amount || 0),
        used_at: doc.usedAt || doc.used_at || doc.createdAt || doc.created_at || null,
        created_at: doc.createdAt || doc.created_at || null,
        updated_at: doc.updatedAt || doc.updated_at || doc.createdAt || doc.created_at || null,
    };
}

function mapSettings(doc) {
    return {
        business_id: doc.businessId || doc.business_id || doc.id,
        delivery_enabled: doc.deliveryEnabled !== false,
        pickup_enabled: doc.pickupEnabled !== false,
        min_order_amount: Number(doc.minOrderAmount || doc.min_order_amount || 0),
        delivery_fee: Number(doc.deliveryFee || doc.delivery_fee || 0),
        free_delivery_above: Number(doc.freeDeliveryAbove || doc.free_delivery_above || 0),
        estimated_delivery_time: doc.estimatedDeliveryTime || doc.estimated_delivery_time || '30-45 dk',
        cash_payment: doc.cashPayment !== false,
        card_on_delivery: doc.cardOnDelivery !== false,
        online_payment: doc.onlinePayment === true,
        working_hours: doc.workingHours || doc.working_hours || null,
        use_business_hours: doc.useBusinessHours !== false,
        whatsapp_number: doc.whatsappNumber || doc.whatsapp_number || '',
        notifications: doc.notifications || null,
        is_active: doc.isActive !== false,
        created_at: doc.createdAt || doc.created_at || null,
        updated_at: doc.updatedAt || doc.updated_at || doc.createdAt || doc.created_at || null,
    };
}

function mapOrder(doc) {
    const customer = doc.customer || null;
    const delivery = doc.delivery || null;
    const payment = doc.payment || null;
    const pricing = doc.pricing || null;
    const coupon = doc.coupon || null;

    return {
        id: doc.id,
        business_id: doc.businessId || doc.business_id,
        order_number: doc.orderNumber || doc.order_number || null,
        customer_name: doc.customerName || customer?.name || null,
        customer_phone: doc.customerPhone || customer?.phone || null,
        customer_address: doc.customerAddress || delivery?.address || null,
        delivery_type: doc.deliveryType || delivery?.type || null,
        payment_method: doc.paymentMethod || payment?.method || null,
        items: doc.items || null,
        subtotal: Number(doc.subtotal ?? pricing?.subtotal ?? 0),
        delivery_fee: Number(doc.deliveryFee ?? pricing?.deliveryFee ?? 0),
        total: Number(doc.total ?? pricing?.total ?? 0),
        customer_note: doc.customerNote || doc.orderNote || null,
        coupon_id: doc.couponId || coupon?.id || null,
        coupon_code: doc.couponCode || coupon?.code || null,
        coupon_discount: Number(doc.couponDiscount || pricing?.discountAmount || 0),
        status: doc.status || 'pending',
        status_history: doc.statusHistory || null,
        internal_note: doc.internalNote || null,
        business_name: doc.businessName || null,
        customer: customer,
        delivery: delivery,
        payment: payment,
        coupon: coupon,
        pricing: pricing,
        qr_code: doc.qrCode || null,
        created_at: doc.createdAt || doc.created_at || null,
        updated_at: doc.updatedAt || doc.updated_at || doc.createdAt || doc.created_at || null,
    };
}

async function migrateCollection(collection, mapper, table, conflictKey = 'id') {
    const docs = await fetchCollection(collection);
    if (!docs.length) {
        console.log(`[skip] ${collection} (0 records)`);
        return;
    }

    const rows = docs.map(mapper).filter(row => row.id || row.business_id);
    await upsertBatches(table, rows, conflictKey);
    console.log(`[ok] ${collection} -> ${table} (${rows.length})`);
}

async function run() {
    await migrateCollection('businesses', mapBusiness, 'businesses');
    await migrateCollection('ff_categories', mapCategory, 'ff_categories');
    await migrateCollection('ff_products', mapProduct, 'ff_products');
    await migrateCollection('ff_extra_groups', mapExtraGroup, 'ff_extra_groups');
    await migrateCollection('ff_extras', mapExtra, 'ff_extras');
    await migrateCollection('ff_campaigns', mapCampaign, 'ff_campaigns');
    await migrateCollection('ff_coupons', mapCoupon, 'ff_coupons');
    await migrateCollection('ff_coupon_usages', mapCouponUsage, 'ff_coupon_usages');
    await migrateCollection('ff_settings', mapSettings, 'ff_settings', 'business_id');
    await migrateCollection('ff_orders', mapOrder, 'ff_orders');
}

run().catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
});
