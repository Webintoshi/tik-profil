// Beauty Services API - CRUD Operations
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/apiAuth';
import { AppError, validateOrThrow } from '@/lib/errors';
import { createServiceSchema } from '@/types/beauty';

const TABLE = 'beauty_services';

interface ServiceRow {
    id: string;
    business_id: string;
    category_id: string;
    name: string;
    name_en: string | null;
    description: string | null;
    description_en: string | null;
    price: string | number;
    duration_minutes: number | null;
    image_url: string | null;
    is_active: boolean;
    is_featured: boolean;
    tags: string[] | null;
    sort_order: number;
    created_at: string;
    updated_at: string;
}

function mapService(row: ServiceRow) {
    return {
        id: row.id,
        businessId: row.business_id,
        categoryId: row.category_id,
        name: row.name,
        description: row.description,
        price: typeof row.price === 'string' ? parseFloat(row.price) : row.price,
        currency: 'TRY',
        duration: row.duration_minutes,
        images: row.image_url ? [row.image_url] : [],
        isActive: row.is_active,
        isFeatured: row.is_featured,
        tags: row.tags || [],
        sortOrder: row.sort_order,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

// GET - List services with optional filters
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
            .eq('business_id', businessId);

        if (categoryId) {
            query = query.eq('category_id', categoryId);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;

        const services = (data || []).map(mapService);

        return Response.json({ success: true, services });
    } catch (error) {
        return AppError.toResponse(error, 'Beauty Services GET');
    }
}

// POST - Create service
export async function POST(request: Request) {
    try {
        const authResult = await requireAuth();
        if (!authResult.authorized || !authResult.user) {
            return AppError.unauthorized().toResponse();
        }

        const businessId = authResult.user.businessId;
        const body = await request.json();

        const data = validateOrThrow(createServiceSchema, body);

        const supabase = getSupabaseAdmin();
        const { data: newService, error: insertError } = await supabase
            .from(TABLE)
            .insert({
                business_id: businessId,
                category_id: data.categoryId,
                name: data.name,
                description: data.description || null,
                price: data.price,
                duration_minutes: data.duration,
                image_url: data.images?.[0] || null,
                is_active: data.isActive !== false,
                is_featured: false,
                tags: [],
                sort_order: 0,
            })
            .select()
            .single();
        
        if (insertError) throw insertError;

        return Response.json({ success: true, serviceId: newService.id });
    } catch (error) {
        return AppError.toResponse(error, 'Beauty Services POST');
    }
}

// PUT - Update service
export async function PUT(request: Request) {
    try {
        const authResult = await requireAuth();
        if (!authResult.authorized || !authResult.user) {
            return AppError.unauthorized().toResponse();
        }

        const businessId = authResult.user.businessId;
        const body = await request.json();
        const { id, ...updateData } = body;

        if (!id) {
            return AppError.badRequest('ID zorunlu').toResponse();
        }

        const supabase = getSupabaseAdmin();
        
        const { data: existingData, error: existingError } = await supabase
            .from(TABLE)
            .select('id')
            .eq('id', id)
            .eq('business_id', businessId)
            .single();
        
        if (existingError || !existingData) {
            return AppError.notFound('Hizmet').toResponse();
        }

        const updateObj: Record<string, unknown> = {};
        if (updateData.categoryId !== undefined) updateObj.category_id = updateData.categoryId;
        if (updateData.name !== undefined) updateObj.name = updateData.name;
        if (updateData.description !== undefined) updateObj.description = updateData.description;
        if (updateData.price !== undefined) updateObj.price = updateData.price;
        if (updateData.duration !== undefined) updateObj.duration_minutes = updateData.duration;
        if (updateData.images !== undefined) updateObj.image_url = updateData.images?.[0] || null;
        if (updateData.isActive !== undefined) updateObj.is_active = updateData.isActive;
        if (updateData.isFeatured !== undefined) updateObj.is_featured = updateData.isFeatured;
        if (updateData.tags !== undefined) updateObj.tags = updateData.tags;
        if (updateData.sortOrder !== undefined) updateObj.sort_order = updateData.sortOrder;

        const { error: updateError } = await supabase
            .from(TABLE)
            .update(updateObj)
            .eq('id', id)
            .eq('business_id', businessId);
        
        if (updateError) throw updateError;

        return Response.json({ success: true });
    } catch (error) {
        return AppError.toResponse(error, 'Beauty Services PUT');
    }
}

// DELETE - Delete service
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
            return AppError.badRequest('ID zorunlu').toResponse();
        }

        const supabase = getSupabaseAdmin();
        
        const { data: existingData, error: existingError } = await supabase
            .from(TABLE)
            .select('id')
            .eq('id', id)
            .eq('business_id', businessId)
            .single();
        
        if (existingError || !existingData) {
            return AppError.notFound('Hizmet').toResponse();
        }

        const { error: deleteError } = await supabase
            .from(TABLE)
            .delete()
            .eq('id', id)
            .eq('business_id', businessId);
        
        if (deleteError) throw deleteError;

        return Response.json({ success: true });
    } catch (error) {
        return AppError.toResponse(error, 'Beauty Services DELETE');
    }
}
