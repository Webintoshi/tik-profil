// Debug API for diagnosing database issues
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/apiAuth';
import { AppError } from '@/lib/errors';

export async function GET() {
    try {
        const authResult = await requireAuth();
        if (!authResult.authorized || !authResult.user) {
            return AppError.unauthorized().toResponse();
        }

        const businessId = authResult.user.businessId;

        // Get all products for this business
        const supabase = getSupabaseAdmin();
        const [{ data: products, error: productsError }, { data: categories, error: categoriesError }] = await Promise.all([
            supabase.from('ff_products').select('*').eq('business_id', businessId),
            supabase.from('ff_categories').select('*').eq('business_id', businessId)
        ]);

        if (productsError || categoriesError) {
            throw productsError || categoriesError;
        }

        const businessProducts = products || [];
        const businessCategories = categories || [];

        // Check for orphaned products (products with invalid categoryId)
        const categoryIds = businessCategories.map(c => c.id);
        const orphanedProducts = businessProducts.filter(p => !categoryIds.includes(p.category_id as string));

        // Check for duplicates (same name in same category)
        const duplicates: Record<string, unknown>[] = [];
        const seen = new Map<string, Record<string, unknown>>();
        for (const p of businessProducts) {
            const key = `${p.category_id}-${p.name}`;
            if (seen.has(key)) {
                duplicates.push({ original: seen.get(key), duplicate: p });
            } else {
                seen.set(key, p);
            }
        }

        // Detailed product list
        const productDetails = businessProducts.map(p => ({
            id: p.id,
            name: p.name,
            categoryId: p.category_id,
            categoryName: businessCategories.find(c => c.id === p.category_id)?.name || 'MISSING',
            imageUrl: p.image_url ? (typeof p.image_url === 'string' ? p.image_url.substring(0, 50) + '...' : 'INVALID') : 'NO IMAGE',
            isActive: p.is_active,
            inStock: p.in_stock,
            createdAt: p.created_at,
        }));

        // Category summary
        const categoryDetails = businessCategories.map(c => ({
            id: c.id,
            name: c.name,
            productCount: businessProducts.filter(p => p.category_id === c.id).length,
            isActive: c.is_active,
        }));

        return Response.json({
            success: true,
            businessId,
            summary: {
                totalProducts: businessProducts.length,
                totalCategories: businessCategories.length,
                orphanedProducts: orphanedProducts.length,
                duplicates: duplicates.length,
            },
            categories: categoryDetails,
            products: productDetails,
            orphaned: orphanedProducts.map(p => ({ id: p.id, name: p.name, categoryId: p.category_id })),
            duplicateGroups: duplicates,
        });
    } catch (error) {
        console.error('[FF Debug] Error:', error);
        return AppError.toResponse(error, 'FF Debug');
    }
}
