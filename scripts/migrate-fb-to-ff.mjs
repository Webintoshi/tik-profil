import { config as loadEnv } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import admin from 'firebase-admin';
import { createClient } from '@supabase/supabase-js';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..');
loadEnv({ path: resolve(repoRoot, '.env.local'), override: true });

const SERVICE_ACCOUNT_PATH = resolve(repoRoot, 'firebase-service-account.json');
const serviceAccount = JSON.parse(readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const firestore = admin.firestore();

const SUPABASE_URL = process.env.SUPABASE_URL?.trim();
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
});

// Map fb_* to ff_* format
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

async function migrateFbToFf() {
    console.log('\n=== FB → FF MİGRASYONU ===\n');

    // 1. Migrate fb_categories → ff_categories
    console.log('📥 fb_categories çekiliyor...');
    const catsSnap = await firestore.collection('fb_categories').get();
    const categories = [];
    catsSnap.forEach(doc => categories.push({ id: doc.id, ...doc.data() }));
    console.log(`   Firebase: ${categories.length} kategori`);

    if (categories.length > 0) {
        const rows = categories.map(mapCategory);
        const { error } = await supabase.from('ff_categories').upsert(rows, { onConflict: 'id' });
        if (error) {
            console.error('   Hata:', error.message);
        } else {
            console.log(`   ✅ ff_categories: ${rows.length} yazıldı`);
        }
    }

    // 2. Migrate fb_products → ff_products
    console.log('\n📥 fb_products çekiliyor...');
    const prodsSnap = await firestore.collection('fb_products').get();
    const products = [];
    prodsSnap.forEach(doc => products.push({ id: doc.id, ...doc.data() }));
    console.log(`   Firebase: ${products.length} ürün`);

    if (products.length > 0) {
        const rows = products.map(mapProduct);
        const { error } = await supabase.from('ff_products').upsert(rows, { onConflict: 'id' });
        if (error) {
            console.error('   Hata:', error.message);
        } else {
            console.log(`   ✅ ff_products: ${rows.length} yazıldı`);
        }
    }

    // 3. Migrate fb_settings → ff_settings
    console.log('\n📥 fb_settings çekiliyor...');
    const settingsSnap = await firestore.collection('fb_settings').get();
    const settings = [];
    settingsSnap.forEach(doc => settings.push({ id: doc.id, ...doc.data() }));
    console.log(`   Firebase: ${settings.length} ayar`);

    if (settings.length > 0) {
        const rows = settings.map(mapSettings);
        const { error } = await supabase.from('ff_settings').upsert(rows, { onConflict: 'business_id' });
        if (error) {
            console.error('   Hata:', error.message);
        } else {
            console.log(`   ✅ ff_settings: ${rows.length} yazıldı`);
        }
    }

    console.log('\n=== Migrasyon Tamamlandı ===');
}

migrateFbToFf().catch(console.error);
