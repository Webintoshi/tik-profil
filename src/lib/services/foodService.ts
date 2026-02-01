/**
 * Food & Beverage Service - MASTER-F&B
 * Handles restaurant tables, menu categories, and products
 * Using Supabase data layer
 */

import { getSupabaseClient } from '../supabase';

// ============================================
// TYPES
// ============================================

export interface FBTable {
    id: string;
    business_id: string;
    name: string;
    scan_count: number;
    created_at: Date;
}

export interface FBCategory {
    id: string;
    business_id: string;
    name: string;
    order: number;
    created_at: Date;
}

export interface FBProduct {
    id: string;
    category_id: string;
    business_id: string;
    name: string;
    description?: string;
    price: number;
    image?: string;
    in_stock: boolean;
    order: number;
    created_at: Date;
}

export interface FBSettings {
    cart_enabled: boolean;
    whatsapp_order_enabled: boolean;
    call_waiter_enabled: boolean;
}

export interface FBMenuSettings {
    business_id: string;
    style_id: string;
    accent_color_id: string;
    show_avatar: boolean;
    waiter_call_enabled: boolean;
    cart_enabled: boolean;
    whatsapp_order_enabled: boolean;
    wifi_password?: string;
}

export interface FBBusiness {
    id: string;
    slug: string;
    name: string;
    phone?: string;
    whatsapp?: string;
    logo?: string;
    cover?: string;
    industry?: string;
}

// ============================================
// COLLECTION NAMES
// ============================================
const TABLES_COLLECTION = "fb_tables";
const CATEGORIES_COLLECTION = "fb_categories";
const PRODUCTS_COLLECTION = "fb_products";
const SETTINGS_COLLECTION = "fb_settings";
const BUSINESSES_COLLECTION = "businesses";

// ============================================
// HELPER: Convert REST doc to typed object
// ============================================
function docToTable(doc: Record<string, unknown>): FBTable {
    return {
        id: (doc.id as string) || "",
        business_id: (doc.business_id as string) || "",
        name: (doc.name as string) || "",
        scan_count: (doc.scan_count as number) || 0,
        created_at: doc.created_at ? new Date(doc.created_at as string) : new Date(),
    };
}

function docToCategory(doc: Record<string, unknown>): FBCategory {
    return {
        id: (doc.id as string) || "",
        business_id: (doc.business_id as string) || "",
        name: (doc.name as string) || "",
        order: (doc.order as number) || 0,
        created_at: doc.created_at ? new Date(doc.created_at as string) : new Date(),
    };
}

function docToProduct(doc: Record<string, unknown>): FBProduct {
    return {
        id: (doc.id as string) || "",
        category_id: (doc.category_id as string) || "",
        business_id: (doc.business_id as string) || "",
        name: (doc.name as string) || "",
        description: doc.description as string | undefined,
        price: (doc.price as number) || 0,
        image: doc.image as string | undefined,
        in_stock: (doc.in_stock as boolean) ?? true,
        order: (doc.order as number) || 0,
        created_at: doc.created_at ? new Date(doc.created_at as string) : new Date(),
    };
}

// ============================================
// TABLES (REST API)
// ============================================

export async function getTables(businessId: string): Promise<FBTable[]> {
    const supabase = getSupabaseClient();

    try {
        const { data, error } = await supabase
            .from(TABLES_COLLECTION)
            .select('*')
            .eq('business_id', businessId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return (data || []).map(row =>
            docToTable({
                ...row,
                created_at: row.created_at,
            })
        );
    } catch (error) {
        console.error("Supabase error:", error);
        return [];
    }
}

export function subscribeToTables(businessId: string, callback: (tables: FBTable[]) => void): () => void {
    let isActive = true;

    const fetchData = async () => {
        try {
            const tables = await getTables(businessId);
            if (isActive) callback(tables);
        } catch (error) {
            console.error("Polling error:", error);
            if (isActive) callback([]);
        }
    };

    fetchData();
    const intervalId = setInterval(() => { if (isActive) fetchData(); }, 5000);

    return () => { isActive = false; clearInterval(intervalId); };
}

export async function createTable(businessId: string, name: string): Promise<string> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from(TABLES_COLLECTION)
        .insert({
            business_id: businessId,
            name,
            scan_count: 0,
        })
        .select('id')
        .single();

    if (error) throw error;
    return data.id as string;
}

export async function updateTable(tableId: string, name: string): Promise<void> {
    const supabase = getSupabaseClient();
    const { error } = await supabase
        .from(TABLES_COLLECTION)
        .update({ name, updated_at: new Date().toISOString() })
        .eq('id', tableId);

    if (error) throw error;
}

export async function deleteTable(tableId: string): Promise<void> {
    const supabase = getSupabaseClient();
    const { error } = await supabase
        .from(TABLES_COLLECTION)
        .delete()
        .eq('id', tableId);

    if (error) throw error;
}

export async function incrementTableScan(tableId: string): Promise<void> {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
        .from(TABLES_COLLECTION)
        .select('scan_count')
        .eq('id', tableId)
        .maybeSingle();

    if (error) throw error;
    if (!data) return;

    const currentCount = (data.scan_count as number) || 0;
    const { error: updateError } = await supabase
        .from(TABLES_COLLECTION)
        .update({ scan_count: currentCount + 1, updated_at: new Date().toISOString() })
        .eq('id', tableId);

    if (updateError) throw updateError;
}

export async function getTableById(tableId: string): Promise<FBTable | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from(TABLES_COLLECTION)
        .select('*')
        .eq('id', tableId)
        .maybeSingle();

    if (error) throw error;
    if (!data) return null;
    return docToTable({
        ...data,
        created_at: data.created_at,
    });
}

// ============================================
// CATEGORIES (REST API)
// ============================================

export async function getCategories(businessId: string): Promise<FBCategory[]> {
    const supabase = getSupabaseClient();

    try {
        const { data, error } = await supabase
            .from(CATEGORIES_COLLECTION)
            .select('*')
            .eq('business_id', businessId)
            .order('created_at', { ascending: true });

        if (error) throw error;

        return (data || []).map(row =>
            docToCategory({
                ...row,
                order: row.sort_order,
                created_at: row.created_at,
            })
        );
    } catch (error) {
        console.error("Supabase error:", error);
        return [];
    }
}

export function subscribeToCategories(businessId: string, callback: (categories: FBCategory[]) => void): () => void {
    let isActive = true;

    const fetchData = async () => {
        try {
            const categories = await getCategories(businessId);
            if (isActive) callback(categories);
        } catch (error) {
            console.error("Polling error:", error);
            if (isActive) callback([]);
        }
    };

    fetchData();
    const intervalId = setInterval(() => { if (isActive) fetchData(); }, 5000);

    return () => { isActive = false; clearInterval(intervalId); };
}

export async function createCategory(businessId: string, name: string, order: number): Promise<string> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from(CATEGORIES_COLLECTION)
        .insert({
            business_id: businessId,
            name,
            sort_order: order,
        })
        .select('id')
        .single();

    if (error) throw error;
    return data.id as string;
}

export async function updateCategory(categoryId: string, data: Partial<Pick<FBCategory, 'name' | 'order'>>): Promise<void> {
    const supabase = getSupabaseClient();
    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (typeof data.name !== 'undefined') payload.name = data.name;
    if (typeof data.order !== 'undefined') payload.sort_order = data.order;

    const { error } = await supabase
        .from(CATEGORIES_COLLECTION)
        .update(payload)
        .eq('id', categoryId);

    if (error) throw error;
}

export async function deleteCategory(categoryId: string): Promise<void> {
    const supabase = getSupabaseClient();
    const { error } = await supabase
        .from(CATEGORIES_COLLECTION)
        .delete()
        .eq('id', categoryId);

    if (error) throw error;
}

// ============================================
// PRODUCTS (REST API)
// ============================================

export async function getProducts(businessId: string): Promise<FBProduct[]> {
    const supabase = getSupabaseClient();

    try {
        const { data, error } = await supabase
            .from(PRODUCTS_COLLECTION)
            .select('*')
            .eq('business_id', businessId)
            .order('created_at', { ascending: true });

        if (error) throw error;

        return (data || []).map(row =>
            docToProduct({
                ...row,
                order: row.sort_order,
                created_at: row.created_at,
            })
        );
    } catch (error) {
        console.error("Supabase error:", error);
        return [];
    }
}

export async function getProductsByCategory(categoryId: string): Promise<FBProduct[]> {
    const supabase = getSupabaseClient();

    try {
        const { data, error } = await supabase
            .from(PRODUCTS_COLLECTION)
            .select('*')
            .eq('category_id', categoryId)
            .order('created_at', { ascending: true });

        if (error) throw error;

        return (data || []).map(row =>
            docToProduct({
                ...row,
                order: row.sort_order,
                created_at: row.created_at,
            })
        );
    } catch (error) {
        console.error("Supabase error:", error);
        return [];
    }
}

export function subscribeToProducts(businessId: string, callback: (products: FBProduct[]) => void): () => void {
    let isActive = true;

    const fetchData = async () => {
        try {
            const products = await getProducts(businessId);
            if (isActive) callback(products);
        } catch (error) {
            console.error("Polling error:", error);
            if (isActive) callback([]);
        }
    };

    fetchData();
    const intervalId = setInterval(() => { if (isActive) fetchData(); }, 5000);

    return () => { isActive = false; clearInterval(intervalId); };
}

export async function createProduct(data: Omit<FBProduct, 'id' | 'created_at'>): Promise<string> {
    const supabase = getSupabaseClient();
    const payload: Record<string, unknown> = {
        business_id: data.business_id,
        category_id: data.category_id,
        name: data.name,
        description: data.description || null,
        price: data.price || 0,
        image: data.image || null,
        in_stock: data.in_stock ?? true,
        sort_order: data.order || 0,
        name_en: (data as Record<string, unknown>).name_en || null,
        description_en: (data as Record<string, unknown>).description_en || null,
    };

    const { data: result, error } = await supabase
        .from(PRODUCTS_COLLECTION)
        .insert(payload)
        .select('id')
        .single();

    if (error) throw error;
    return result.id as string;
}

export async function updateProduct(productId: string, data: Partial<Omit<FBProduct, 'id' | 'created_at'>>): Promise<void> {
    const supabase = getSupabaseClient();
    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (typeof data.name !== 'undefined') payload.name = data.name;
    if (typeof data.description !== 'undefined') payload.description = data.description;
    if (typeof data.price !== 'undefined') payload.price = data.price;
    if (typeof data.image !== 'undefined') payload.image = data.image;
    if (typeof data.in_stock !== 'undefined') payload.in_stock = data.in_stock;
    if (typeof data.order !== 'undefined') payload.sort_order = data.order;
    if ((data as Record<string, unknown>).name_en !== undefined) payload.name_en = (data as Record<string, unknown>).name_en;
    if ((data as Record<string, unknown>).description_en !== undefined) payload.description_en = (data as Record<string, unknown>).description_en;

    const { error } = await supabase
        .from(PRODUCTS_COLLECTION)
        .update(payload)
        .eq('id', productId);

    if (error) throw error;
}

export async function toggleProductStock(productId: string, inStock: boolean): Promise<void> {
    const supabase = getSupabaseClient();
    const { error } = await supabase
        .from(PRODUCTS_COLLECTION)
        .update({ in_stock: inStock, updated_at: new Date().toISOString() })
        .eq('id', productId);

    if (error) throw error;
}

export async function deleteProduct(productId: string): Promise<void> {
    const supabase = getSupabaseClient();
    const { error } = await supabase
        .from(PRODUCTS_COLLECTION)
        .delete()
        .eq('id', productId);

    if (error) throw error;
}

// ============================================
// HELPERS
// ============================================

export function getTableQRUrl(businessSlug: string, tableId: string): string {
    return `https://tikprofil.com/${businessSlug}?table=${tableId}`;
}

export function formatPrice(price: number, currency?: string): string {
    return new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: currency || 'TRY',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    }).format(price);
}

// ============================================
// MENU SETTINGS (REST API)
// ============================================

export async function getMenuSettings(businessId: string): Promise<FBMenuSettings | null> {
    const supabase = getSupabaseClient();

    try {
        const { data, error } = await supabase
            .from(SETTINGS_COLLECTION)
            .select('*')
            .eq('business_id', businessId)
            .maybeSingle();

        if (error) throw error;
        if (!data) return null;

        const waiterCallEnabled =
            (data.waiter_call_enabled as boolean | null) ??
            (data.call_waiter_enabled as boolean | null) ??
            true;

        return {
            business_id: (data.business_id as string) || businessId,
            style_id: (data.style_id as string) || "modern",
            accent_color_id: (data.accent_color_id as string) || "emerald",
            show_avatar: (data.show_avatar as boolean) ?? true,
            waiter_call_enabled: waiterCallEnabled,
            cart_enabled: (data.cart_enabled as boolean) ?? true,
            whatsapp_order_enabled: (data.whatsapp_order_enabled as boolean) ?? true,
            wifi_password: (data.wifi_password as string) || undefined,
        };
    } catch (error) {
        console.error("Supabase error:", error);
        return null;
    }
}

export async function saveMenuSettings(businessId: string, settings: Omit<FBMenuSettings, 'business_id'>): Promise<void> {
    const supabase = getSupabaseClient();

    try {
        const waiterCallEnabled = settings.waiter_call_enabled ?? true;

        const payload = {
            business_id: businessId,
            style_id: settings.style_id,
            accent_color_id: settings.accent_color_id,
            show_avatar: settings.show_avatar,
            waiter_call_enabled: waiterCallEnabled,
            call_waiter_enabled: waiterCallEnabled,
            cart_enabled: settings.cart_enabled,
            whatsapp_order_enabled: settings.whatsapp_order_enabled,
            wifi_password: settings.wifi_password || null,
            updated_at: new Date().toISOString(),
        };

        const { error } = await supabase
            .from(SETTINGS_COLLECTION)
            .upsert(payload, { onConflict: 'business_id' });

        if (error) throw error;
    } catch (error) {
        console.error("Supabase error:", error);
        throw error;
    }
}

// ============================================
// BUSINESS LOOKUP (REST API)
// ============================================

export async function getBusinessBySlug(slug: string): Promise<FBBusiness | null> {
    const supabase = getSupabaseClient();

    try {
        const { data, error } = await supabase
            .from(BUSINESSES_COLLECTION)
            .select('id, slug, name, phone, whatsapp, logo, cover, industry_id, industry_label')
            .ilike('slug', slug)
            .maybeSingle();

        if (error) throw error;
        if (!data) return null;

        return {
            id: (data.id as string) || "",
            slug: (data.slug as string) || "",
            name: (data.name as string) || "",
            phone: data.phone as string | undefined,
            whatsapp: (data.whatsapp as string) || (data.phone as string) || undefined,
            logo: data.logo as string | undefined,
            cover: data.cover as string | undefined,
            industry: (data.industry_label as string) || (data.industry_id as string) || undefined,
        };
    } catch (error) {
        console.error("Supabase error:", error);
        return null;
    }
}

export async function getBusinessById(businessId: string): Promise<FBBusiness | null> {
    const supabase = getSupabaseClient();

    try {
        const { data, error } = await supabase
            .from(BUSINESSES_COLLECTION)
            .select('id, slug, name, phone, whatsapp, logo, cover, industry_id, industry_label')
            .eq('id', businessId)
            .maybeSingle();

        if (error) throw error;
        if (!data) return null;

        return {
            id: (data.id as string) || "",
            slug: (data.slug as string) || "",
            name: (data.name as string) || "",
            phone: data.phone as string | undefined,
            whatsapp: (data.whatsapp as string) || (data.phone as string) || undefined,
            logo: data.logo as string | undefined,
            cover: data.cover as string | undefined,
            industry: (data.industry_label as string) || (data.industry_id as string) || undefined,
        };
    } catch (error) {
        console.error("Supabase error:", error);
        return null;
    }
}
