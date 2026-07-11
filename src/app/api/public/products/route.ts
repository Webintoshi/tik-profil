import { NextRequest, NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase";
import { publicReadOnly, resolvePublicBusinessContext } from "@/server/auth/guards";

function amount(value: unknown): number {
    const parsed = typeof value === "number" ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}
function mapCategory(row: Record<string, any>) {
    return {
        id: String(row.id),
        image: row.image_url || undefined,
        isActive: row.is_active !== false,
        name: String(row.name || ""),
        order: row.sort_order ?? 0,
        sortOrder: row.sort_order ?? 0,
        status: row.is_active === false ? "inactive" : "active",
    };
}

function mapProduct(row: Record<string, any>, categoryName = "") {
    const stock = row.stock_quantity == null ? null : Math.max(0, Math.trunc(amount(row.stock_quantity)));
    return {
        active: row.is_active !== false,
        businessId: String(row.business_id),
        categoryId: row.category_id ? String(row.category_id) : undefined,
        categoryName,
        createdAt: row.created_at,
        description: row.description || undefined,
        id: String(row.id),
        image: row.image_url || undefined,
        images: row.image_url ? [row.image_url] : [],
        isActive: row.is_active !== false,
        isFeatured: row.is_featured === true,
        name: String(row.name || ""),
        price: amount(row.price),
        sortOrder: row.sort_order ?? 0,
        status: row.is_active === false ? "inactive" : "active",
        stock,
        stockQuantity: stock,
        trackStock: row.track_stock === true,
    };
}

export async function GET(request: NextRequest) {
    try {
        publicReadOnly();
        const searchParams = request.nextUrl.searchParams;
        const context = resolvePublicBusinessContext({
            businessId: searchParams.get("businessId"),
            slug: searchParams.get("slug"),
        });
        const categoryId = searchParams.get("categoryId");
        const productSlug = searchParams.get("productSlug");
        const supabase = getSupabaseAdmin();
        let businessId = context.businessId;

        if (!businessId && context.businessSlug) {
            const { data, error } = await supabase
                .from("businesses")
                .select("id")
                .eq("slug", context.businessSlug)
                .maybeSingle();
            if (error) throw error;
            businessId = data?.id ? String(data.id) : null;
        }
        if (!businessId) {
            return NextResponse.json({ error: "Business ID or slug required" }, { status: 400 });
        }

        if (productSlug) {
            const { data: product, error } = await supabase
                .from("ecommerce_products")
                .select("id,business_id,category_id,slug,name,description,price,image_url,is_active,in_stock,is_featured,sort_order,stock_quantity,track_stock,created_at")
                .eq("business_id", businessId)
                .eq("slug", productSlug)
                .eq("is_active", true)
                .maybeSingle();
            if (error) throw error;
            if (!product || product.in_stock === false) {
                return NextResponse.json({ error: "Product not found" }, { status: 404 });
            }
            let categoryName = "";
            if (product.category_id) {
                const { data: category, error: categoryError } = await supabase
                    .from("ecommerce_categories")
                    .select("name")
                    .eq("business_id", businessId)
                    .eq("id", product.category_id)
                    .eq("is_active", true)
                    .maybeSingle();
                if (categoryError) throw categoryError;
                categoryName = category?.name || "";
            }
            return NextResponse.json(mapProduct(product, categoryName));
        }

        const { data: categoryRows, error: categoryError } = await supabase
            .from("ecommerce_categories")
            .select("id,name,image_url,sort_order,is_active")
            .eq("business_id", businessId)
            .eq("is_active", true)
            .order("sort_order", { ascending: true });
        if (categoryError) throw categoryError;
        const categories = (categoryRows || []).map(mapCategory);
        const categoryNames = new Map(categories.map((category) => [category.id, category.name]));

        let productsQuery = supabase
            .from("ecommerce_products")
            .select("id,business_id,category_id,slug,name,description,price,image_url,is_active,in_stock,is_featured,sort_order,stock_quantity,track_stock,created_at")
            .eq("business_id", businessId)
            .eq("is_active", true)
            .eq("in_stock", true)
            .order("sort_order", { ascending: true })
            .order("created_at", { ascending: false });
        if (categoryId) productsQuery = productsQuery.eq("category_id", categoryId);
        const { data: productRows, error: productError } = await productsQuery;
        if (productError) throw productError;

        return NextResponse.json({
            categories,
            products: (productRows || []).map((product) => mapProduct(
                product,
                product.category_id ? categoryNames.get(String(product.category_id)) || "" : "",
            )),
            success: true,
        });
    } catch (error) {
        console.error("[Public Products GET] Unexpected error:", error);
        return NextResponse.json({ error: "Products could not be loaded." }, { status: 500 });
    }
}
