// Fast Food Products API
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/apiAuth';
import { AppError } from '@/lib/errors';

const TABLE = 'ff_products';

interface ProductRow {
    id: string;
    business_id: string;
    category_id: string;
    name: string;
    description: string | null;
    price: number | string;
    image_url: string | null;
    is_active: boolean | null;
    in_stock: boolean | null;
    extra_group_ids: string[] | null;
    sort_order: number | null;
    sizes: unknown;
    prep_time: number | null;
    tax_rate: number | string | null;
    allergens: string[] | null;
    discount_price: number | string | null;
    discount_until: string | null;
    tags: string[] | null;
    calories: number | null;
    spicy_level: number | null;
}

function mapProduct(row: ProductRow) {
    return {
        id: row.id,
        businessId: row.business_id,
        categoryId: row.category_id,
        name: row.name,
        description: row.description || '',
        price: Number(row.price || 0),
        imageUrl: row.image_url || '',
        isActive: row.is_active !== false,
        inStock: row.in_stock !== false,
        extraGroupIds: row.extra_group_ids || [],
        sortOrder: row.sort_order ?? 0,
        sizes: row.sizes || null,
        prepTime: row.prep_time ?? null,
        taxRate: row.tax_rate !== null && row.tax_rate !== undefined ? Number(row.tax_rate) : null,
        allergens: row.allergens || null,
        discountPrice: row.discount_price !== null && row.discount_price !== undefined ? Number(row.discount_price) : null,
        discountUntil: row.discount_until || null,
        tags: row.tags || null,
        calories: row.calories ?? null,
        spicyLevel: row.spicy_level ?? null,
    };
}

// GET - List products
export async function GET(request: Request) {
    try {
        const authResult = await requireAuth();
        if (!authResult.authorized || !authResult.user) {
            return AppError.unauthorized().toResponse();
        }

        const businessId = authResult.user.businessId;
        const { searchParams } = new URL(request.url);
        const categoryId = searchParams.get('categoryId');

        const supabase = getSupabaseAdmin();
        let query = supabase
            .from(TABLE)
            .select('*')
            .eq('business_id', businessId)
            .order('sort_order', { ascending: true });

        if (categoryId) {
            query = query.eq('category_id', categoryId);
        }

        const { data, error } = await query;
        if (error) {
            throw error;
        }

        const products = (data || []).map(mapProduct);

        return Response.json({ success: true, products });
    } catch (error) {
        return AppError.toResponse(error, 'FF Products GET');
    }
}

// POST - Create product
export async function POST(request: Request) {
    try {
        const authResult = await requireAuth();
        if (!authResult.authorized || !authResult.user) {
            return AppError.unauthorized().toResponse();
        }

        const businessId = authResult.user.businessId;
        const body = await request.json();
        const {
            name, description, price, categoryId, imageUrl, isActive, inStock, extraGroupIds, sortOrder,
            // New fields
            sizes, prepTime, taxRate, allergens, discountPrice, discountUntil, tags, calories, spicyLevel
        } = body;

        if (!name || !categoryId || price === undefined) {
            return AppError.badRequest('Name, categoryId and price required').toResponse();
        }
        const supabase = getSupabaseAdmin();
        const productData = {
            business_id: businessId,
            category_id: categoryId,
            name,
            description: description || '',
            price: Number(price),
            image_url: imageUrl || '',
            is_active: isActive !== false,
            in_stock: inStock !== false,
            extra_group_ids: extraGroupIds || [],
            sort_order: sortOrder || 0,
            sizes: sizes || null,
            prep_time: prepTime ? Number(prepTime) : null,
            tax_rate: taxRate ? Number(taxRate) : null,
            allergens: allergens || null,
            discount_price: discountPrice ? Number(discountPrice) : null,
            discount_until: discountUntil || null,
            tags: tags || null,
            calories: calories ? Number(calories) : null,
            spicy_level: spicyLevel ? Number(spicyLevel) : null,
        };

        const { data, error } = await supabase
            .from(TABLE)
            .insert(productData)
            .select('id')
            .single();

        if (error) {
            throw error;
        }

        const productId = data?.id;
        return Response.json({ success: true, productId });
    } catch (error) {
        console.error('[FF Products POST] Error:', error);
        return AppError.toResponse(error, 'FF Products POST');
    }
}

// PUT - Update product
export async function PUT(request: Request) {
    try {
        const authResult = await requireAuth();
        if (!authResult.authorized || !authResult.user) {
            return AppError.unauthorized().toResponse();
        }

        const businessId = authResult.user.businessId;
        const body = await request.json();
        const {
            id, name, description, price, categoryId, imageUrl, isActive, inStock, extraGroupIds, sortOrder,
            // New fields
            sizes, prepTime, taxRate, allergens, discountPrice, discountUntil, tags, calories, spicyLevel
        } = body;

        if (!id) {
            return AppError.badRequest('ID required').toResponse();
        }

        // Verify ownership
        const supabase = getSupabaseAdmin();
        const { data: existingProduct, error: existingError } = await supabase
            .from(TABLE)
            .select('id, business_id')
            .eq('id', id)
            .eq('business_id', businessId)
            .maybeSingle();

        if (existingError) {
            throw existingError;
        }

        if (!existingProduct) {
            return AppError.notFound('Ürün').toResponse();
        }

        // Build update object with only defined fields
        const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };

        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (price !== undefined) updateData.price = Number(price);
        if (categoryId !== undefined) updateData.category_id = categoryId;
        if (imageUrl !== undefined) updateData.image_url = imageUrl;
        if (isActive !== undefined) updateData.is_active = isActive;
        if (inStock !== undefined) updateData.in_stock = inStock;
        if (extraGroupIds !== undefined) updateData.extra_group_ids = extraGroupIds;
        if (sortOrder !== undefined) updateData.sort_order = sortOrder;

        if (sizes !== undefined) updateData.sizes = sizes;
        if (prepTime !== undefined) updateData.prep_time = prepTime ? Number(prepTime) : null;
        if (taxRate !== undefined) updateData.tax_rate = taxRate ? Number(taxRate) : null;
        if (allergens !== undefined) updateData.allergens = allergens;
        if (discountPrice !== undefined) updateData.discount_price = discountPrice ? Number(discountPrice) : null;
        if (discountUntil !== undefined) updateData.discount_until = discountUntil;
        if (tags !== undefined) updateData.tags = tags;
        if (calories !== undefined) updateData.calories = calories ? Number(calories) : null;
        if (spicyLevel !== undefined) updateData.spicy_level = spicyLevel ? Number(spicyLevel) : null;

        const { error: updateError } = await supabase
            .from(TABLE)
            .update(updateData)
            .eq('id', id)
            .eq('business_id', businessId);

        if (updateError) {
            throw updateError;
        }

        return Response.json({ success: true });
    } catch (error) {
        return AppError.toResponse(error, 'FF Products PUT');
    }
}

// DELETE - Delete product
export async function DELETE(request: Request) {
    try {
        const authResult = await requireAuth();
        if (!authResult.authorized || !authResult.user) {
            return AppError.unauthorized().toResponse();
        }

        const businessId = authResult.user.businessId;
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return AppError.badRequest('ID required').toResponse();
        }

        // Verify ownership
        const supabase = getSupabaseAdmin();
        const { data: existingProduct, error: existingError } = await supabase
            .from(TABLE)
            .select('id')
            .eq('id', id)
            .eq('business_id', businessId)
            .maybeSingle();

        if (existingError) {
            throw existingError;
        }

        if (!existingProduct) {
            return AppError.notFound('Ürün').toResponse();
        }

        const { error: deleteError } = await supabase
            .from(TABLE)
            .delete()
            .eq('id', id)
            .eq('business_id', businessId);

        if (deleteError) {
            throw deleteError;
        }

        return Response.json({ success: true });
    } catch (error) {
        return AppError.toResponse(error, 'FF Products DELETE');
    }
}
