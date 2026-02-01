import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { AppError, validateOrThrow } from '@/lib/errors';
import { categorySchema } from '@/types/ecommerce';

const TABLE = 'ecommerce_categories';

interface CategoryRow {
    id: string;
    business_id: string;
    name: string;
    name_en: string | null;
    icon: string | null;
    image_url: string | null;
    sort_order: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

function mapCategory(row: CategoryRow) {
    return {
        id: row.id,
        businessId: row.business_id,
        name: row.name,
        nameEn: row.name_en,
        icon: row.icon,
        imageUrl: row.image_url,
        sortOrder: row.sort_order,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const businessId = searchParams.get('businessId');
        const categoryId = searchParams.get('id');

        if (!businessId) {
            return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();

        if (categoryId) {
            const { data, error } = await supabase
                .from(TABLE)
                .select('*')
                .eq('id', categoryId)
                .eq('business_id', businessId)
                .single();

            if (error || !data) {
                return NextResponse.json({ error: 'Category not found' }, { status: 404 });
            }

            return NextResponse.json(mapCategory(data));
        }

        const { data, error } = await supabase
            .from(TABLE)
            .select('*')
            .eq('business_id', businessId)
            .order('sort_order', { ascending: true });

        if (error) throw error;

        const categories = (data || []).map(mapCategory);
        return NextResponse.json({ success: true, categories });
    } catch (error) {
        console.error('[Ecommerce Categories GET Error]:', error);
        return NextResponse.json(
            { error: 'Kategoriler alınırken hata oluştu' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { businessId, ...categoryData } = body;

        if (!businessId) {
            return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
        }

        validateOrThrow(categorySchema, categoryData);

        const supabase = getSupabaseAdmin();

        const { data: existingCategories, error: checkError } = await supabase
            .from(TABLE)
            .select('sort_order')
            .eq('business_id', businessId)
            .order('sort_order', { ascending: false });

        if (checkError) throw checkError;

        const maxSortOrder = existingCategories?.[0]?.sort_order ?? 0;

        const { data, error } = await supabase
            .from(TABLE)
            .insert({
                business_id: businessId,
                name: categoryData.name,
                name_en: categoryData.nameEn,
                icon: categoryData.icon,
                image_url: categoryData.imageUrl,
                sort_order: categoryData.sortOrder ?? maxSortOrder + 1,
                is_active: categoryData.isActive ?? true,
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({
            success: true,
            id: data.id,
            category: mapCategory(data)
        });
    } catch (error) {
        console.error('[Ecommerce Categories POST Error]:', error);
        return NextResponse.json(
            { error: 'Kategori oluşturulurken hata oluştu' },
            { status: 500 }
        );
    }
}

export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { businessId, id, ...updateData } = body;

        if (!businessId || !id) {
            return NextResponse.json({ error: 'Business ID and Category ID required' }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();

        const { data: existing, error: checkError } = await supabase
            .from(TABLE)
            .select('*')
            .eq('id', id)
            .eq('business_id', businessId)
            .single();

        if (checkError || !existing) {
            return NextResponse.json({ error: 'Category not found' }, { status: 404 });
        }

        const { data, error } = await supabase
            .from(TABLE)
            .update({
                name: updateData.name,
                name_en: updateData.nameEn,
                icon: updateData.icon,
                image_url: updateData.imageUrl,
                sort_order: updateData.sortOrder,
                is_active: updateData.isActive,
            })
            .eq('id', id)
            .eq('business_id', businessId)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Ecommerce Categories PUT Error]:', error);
        return NextResponse.json(
            { error: 'Kategori güncellenirken hata oluştu' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const businessId = searchParams.get('businessId');
        const id = searchParams.get('id');

        if (!businessId || !id) {
            return NextResponse.json({ error: 'Business ID and Category ID required' }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();

        const { data: existing, error: checkError } = await supabase
            .from(TABLE)
            .select('id, business_id')
            .eq('id', id)
            .eq('business_id', businessId)
            .single();

        if (checkError || !existing) {
            return NextResponse.json({ error: 'Category not found' }, { status: 404 });
        }

        const { data: products, error: productsError } = await supabase
            .from('ecommerce_products')
            .select('id')
            .eq('business_id', businessId)
            .eq('category_id', id)
            .range(0, 0);

        if (productsError) throw productsError;

        if (products && products.length > 0) {
            return NextResponse.json({
                error: 'Bu kategoride ürün var, önce ürünleri taşıyın veya silin'
            }, { status: 400 });
        }

        const { error } = await supabase
            .from(TABLE)
            .delete()
            .eq('id', id)
            .eq('business_id', businessId);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Ecommerce Categories DELETE Error]:', error);
        return NextResponse.json(
            { error: 'Kategori silinirken hata oluştu' },
            { status: 500 }
        );
    }
}
