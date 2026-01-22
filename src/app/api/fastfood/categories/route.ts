// Fast Food Categories API
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/apiAuth';
import { AppError } from '@/lib/errors';

const TABLE = 'ff_categories';

interface CategoryRow {
    id: string;
    business_id: string;
    name: string;
    icon: string | null;
    sort_order: number | null;
    is_active: boolean | null;
}

function mapCategory(row: CategoryRow) {
    return {
        id: row.id,
        businessId: row.business_id,
        name: row.name,
        icon: row.icon || '🍔',
        sortOrder: row.sort_order ?? 0,
        isActive: row.is_active !== false,
    };
}

// GET - List categories
export async function GET() {
    try {
        const authResult = await requireAuth();
        if (!authResult.authorized || !authResult.user) {
            return AppError.unauthorized().toResponse();
        }

        const businessId = authResult.user.businessId;

        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase
            .from(TABLE)
            .select('*')
            .eq('business_id', businessId)
            .order('sort_order', { ascending: true });

        if (error) {
            throw error;
        }

        const categories = (data || []).map(mapCategory);

        return Response.json({ success: true, categories });
    } catch (error) {
        return AppError.toResponse(error, 'FF Categories GET');
    }
}

// POST - Create category
export async function POST(request: Request) {
    try {
        const authResult = await requireAuth();
        if (!authResult.authorized || !authResult.user) {
            return AppError.unauthorized().toResponse();
        }

        const businessId = authResult.user.businessId;
        const body = await request.json();
        const { name, icon, sortOrder, isActive } = body;

        if (!name) {
            return AppError.badRequest('Name required').toResponse();
        }

        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase
            .from(TABLE)
            .insert({
                business_id: businessId,
                name,
                icon: icon || '🍔',
                sort_order: sortOrder || 0,
                is_active: isActive !== false,
            })
            .select('id')
            .single();

        if (error) {
            throw error;
        }

        const categoryId = data?.id;

        return Response.json({ success: true, categoryId });
    } catch (error) {
        return AppError.toResponse(error, 'FF Categories POST');
    }
}

// PUT - Update category
export async function PUT(request: Request) {
    try {
        const authResult = await requireAuth();
        if (!authResult.authorized || !authResult.user) {
            return AppError.unauthorized().toResponse();
        }

        const businessId = authResult.user.businessId;
        const body = await request.json();
        const { id, name, icon, sortOrder, isActive } = body;

        if (!id) {
            return AppError.badRequest('ID required').toResponse();
        }

        // Verify ownership
        const supabase = getSupabaseAdmin();
        const { data: existingCategory, error: existingError } = await supabase
            .from(TABLE)
            .select('id, business_id')
            .eq('id', id)
            .eq('business_id', businessId)
            .maybeSingle();

        if (existingError) {
            throw existingError;
        }

        if (!existingCategory) {
            return AppError.notFound('Kategori').toResponse();
        }

        // CRITICAL FIX: Only include fields that are actually provided
        // This prevents undefined values from overwriting existing data with null
        const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (name !== undefined) updateData.name = name;
        if (icon !== undefined) updateData.icon = icon;
        if (sortOrder !== undefined) updateData.sort_order = sortOrder;
        if (isActive !== undefined) updateData.is_active = isActive;

        const { error: updateError } = await supabase
            .from(TABLE)
            .update(updateData)
            .eq('id', id)
            .eq('business_id', businessId);

        if (updateError) {
            throw updateError;
        }
        return Response.json({ success: true, categoryId: id });
    } catch (error) {
        console.error('[FF Categories PUT] Error:', error);
        return AppError.toResponse(error, 'FF Categories PUT');
    }
}

// DELETE - Delete category (with product protection)
export async function DELETE(request: Request) {
    try {
        const authResult = await requireAuth();
        if (!authResult.authorized || !authResult.user) {
            return AppError.unauthorized().toResponse();
        }

        const businessId = authResult.user.businessId;
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const force = searchParams.get('force') === 'true';
        if (!id) {
            return AppError.badRequest('ID required').toResponse();
        }

        // Verify ownership
        const supabase = getSupabaseAdmin();
        const { data: existingCategory, error: existingError } = await supabase
            .from(TABLE)
            .select('id')
            .eq('id', id)
            .eq('business_id', businessId)
            .maybeSingle();

        if (existingError) {
            throw existingError;
        }

        if (!existingCategory) {
            return AppError.notFound('Kategori').toResponse();
        }

        // Check if there are products in this category
        const { data: productsInCategory, error: productsError } = await supabase
            .from('ff_products')
            .select('id')
            .eq('category_id', id);

        if (productsError) {
            throw productsError;
        }

        if ((productsInCategory?.length || 0) > 0 && !force) {
            // Don't delete - warn about products
            return Response.json({
                success: false,
                error: `Bu kategoride ${productsInCategory.length} ürün var. Önce ürünleri başka kategoriye taşıyın veya silin.`,
                productsCount: productsInCategory.length,
                productIds: productsInCategory.map(p => p.id)
            }, { status: 400 });
        }

        // Log before delete
        const { error: deleteError } = await supabase
            .from(TABLE)
            .delete()
            .eq('id', id)
            .eq('business_id', businessId);

        if (deleteError) {
            throw deleteError;
        }
        return Response.json({ success: true, deletedCategoryId: id });
    } catch (error) {
        console.error('[FF Categories DELETE] Error:', error);
        return AppError.toResponse(error, 'FF Categories DELETE');
    }
}

