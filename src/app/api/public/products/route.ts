import { NextRequest, NextResponse } from 'next/server';
import { getDocumentREST } from '@/lib/documentStore';
import { getSupabaseClient } from '@/lib/supabase';
import type { Product, Category } from '@/types/ecommerce';

const PRODUCTS_COLLECTION = 'ecommerce_products';
const CATEGORIES_COLLECTION = 'ecommerce_categories';
const DOCUMENTS_TABLE = 'app_documents';

// GET: Public products for storefront
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        let businessId = searchParams.get('businessId');
        const businessSlug = searchParams.get('slug');
        const categoryId = searchParams.get('categoryId');
        const productSlug = searchParams.get('productSlug');

        const supabase = getSupabaseClient();

        // Resolve businessId from slug if not provided directly
        if (!businessId && businessSlug) {
            const { data: businessData, error: businessError } = await supabase
                .from('businesses')
                .select('id')
                .eq('slug', businessSlug)
                .maybeSingle();

            if (businessError) throw businessError;
            if (businessData) {
                businessId = businessData.id;
            }
        }

        if (!businessId) {
            return NextResponse.json({ error: 'Business ID or slug required' }, { status: 400 });
        }

        // Get single product by slug
        if (productSlug) {
            const { data, error } = await supabase
                .from(DOCUMENTS_TABLE)
                .select('id,data')
                .eq('collection', PRODUCTS_COLLECTION)
                .eq('data->>businessId', businessId)
                .eq('data->>slug', productSlug)
                .eq('data->>status', 'active')
                .range(0, 0);

            if (error) throw error;
            const row = data?.[0] as { id: string; data: Record<string, unknown> } | undefined;
            const product = row ? ({ id: row.id, ...(row.data as Record<string, unknown>) } as unknown as Product) : undefined;

            if (!product) {
                return NextResponse.json({ error: 'Product not found' }, { status: 404 });
            }

            // Get category name
            let categoryName = '';
            if (product.categoryId) {
                try {
                    const category = await getDocumentREST(CATEGORIES_COLLECTION, product.categoryId);
                    categoryName = (category?.name as string) || '';
                } catch { }
            }

            return NextResponse.json({
                ...product,
                categoryName,
            });
        }

        // Get categories
        const { data: categoryRows, error: categoriesError } = await supabase
            .from(DOCUMENTS_TABLE)
            .select('id,data')
            .eq('collection', CATEGORIES_COLLECTION)
            .eq('data->>businessId', businessId)
            .eq('data->>status', 'active')
            .range(0, 999);
        if (categoriesError) throw categoriesError;

        const categories = (categoryRows || [])
            .map((r: any) => ({ id: r.id, ...(r.data as Record<string, unknown>) } as unknown as Category))
            .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

        // Get products
        let productsQuery = supabase
            .from(DOCUMENTS_TABLE)
            .select('id,data')
            .eq('collection', PRODUCTS_COLLECTION)
            .eq('data->>businessId', businessId)
            .eq('data->>status', 'active');

        // Filter by category if provided
        if (categoryId) {
            productsQuery = productsQuery.eq('data->>categoryId', categoryId);
        }

        const { data: productRows, error: productsError } = await productsQuery.range(0, 1999);
        if (productsError) throw productsError;

        const products = (productRows || [])
            .map((r: any) => ({ id: r.id, ...(r.data as Record<string, unknown>) } as unknown as Product))
            .sort((a, b) => {
                if (a.sortOrder !== b.sortOrder) {
                    return a.sortOrder - b.sortOrder;
                }
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            });

        // Add category name to each product
        const productsWithCategory = products.map(p => ({
            ...p,
            categoryName: categories.find(c => c.id === p.categoryId)?.name || '',
        }));

        return NextResponse.json({
            success: true,
            categories,
            products: productsWithCategory,
        });
    } catch (error) {
        console.error('[Public Products GET Error]:', error);
        return NextResponse.json(
            { error: 'Ürünler alınırken hata oluştu' },
            { status: 500 }
        );
    }
}
