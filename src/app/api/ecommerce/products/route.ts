import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { AppError, validateOrThrow } from '@/lib/errors';
import { productSchema } from '@/types/ecommerce';

const TABLE = 'ecommerce_products';

interface ProductRow {
    id: string;
    business_id: string;
    category_id: string;
    name: string;
    name_en: string | null;
    description: string | null;
    description_en: string | null;
    price: string | number;
    image_url: string | null;
    is_active: boolean;
    in_stock: boolean;
    is_featured: boolean;
    is_premium: boolean;
    tags: string[] | null;
    sort_order: number | null;
    created_at: string;
    updated_at: string;
}

function mapProduct(row: ProductRow) {
    return {
        id: row.id,
        businessId: row.business_id,
        categoryId: row.category_id,
        name: row.name,
        nameEn: row.name_en,
        description: row.description,
        descriptionEn: row.description_en,
        price: typeof row.price === 'string' ? parseFloat(row.price) : row.price,
        imageUrl: row.image_url,
        isActive: row.is_active,
        inStock: row.in_stock,
        isFeatured: row.is_featured,
        isPremium: row.is_premium,
        tags: row.tags || [],
        sortOrder: row.sort_order ?? 0,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const businessId = searchParams.get('businessId');
        const productId = searchParams.get('id');
        const categoryId = searchParams.get('categoryId');

        if (!businessId) {
            return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();

        if (productId) {
            const { data, error } = await supabase
                .from(TABLE)
                .select('*')
                .eq('id', productId)
                .eq('business_id', businessId)
                .single();

            if (error || !data) {
                return NextResponse.json({ error: 'Product not found' }, { status: 404 });
            }

            return NextResponse.json(mapProduct(data));
        }

        let query = supabase
            .from(TABLE)
            .select('*')
            .eq('business_id', businessId)
            .order('sort_order', { ascending: true });

        if (categoryId) {
            query = query.eq('category_id', categoryId);
        }

        const { data, error } = await query;
        if (error) throw error;

        const products = (data || []).map(mapProduct);
        return NextResponse.json({ success: true, products });
    } catch (error) {
        console.error('[Ecommerce Products GET Error]:', error);
        return NextResponse.json(
            { error: 'Ürünler alınırken hata oluştu' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { businessId, ...productData } = body;

        if (!businessId) {
            return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
        }

        validateOrThrow(productSchema, productData);

        const supabase = getSupabaseAdmin();

        const { data, error } = await supabase
            .from(TABLE)
            .insert({
                business_id: businessId,
                category_id: productData.categoryId,
                name: productData.name,
                name_en: productData.nameEn,
                description: productData.description,
                description_en: productData.descriptionEn,
                price: productData.price,
                image_url: productData.imageUrl,
                is_active: productData.isActive ?? true,
                in_stock: productData.inStock ?? true,
                is_featured: productData.isFeatured ?? false,
                is_premium: productData.isPremium ?? false,
                tags: productData.tags || [],
                sort_order: productData.sortOrder ?? 0,
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({
            success: true,
            id: data.id,
            product: mapProduct(data)
        });
    } catch (error) {
        console.error('[Ecommerce Products POST Error]:', error);
        return NextResponse.json(
            { error: 'Ürün oluşturulurken hata oluştu' },
            { status: 500 }
        );
    }
}

export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { businessId, id, ...updateData } = body;

        if (!businessId || !id) {
            return NextResponse.json({ error: 'Business ID and Product ID required' }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();

        const { data: existing, error: checkError } = await supabase
            .from(TABLE)
            .select('*')
            .eq('id', id)
            .eq('business_id', businessId)
            .single();

        if (checkError || !existing) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 });
        }

        const { data, error } = await supabase
            .from(TABLE)
            .update({
                category_id: updateData.categoryId,
                name: updateData.name,
                name_en: updateData.nameEn,
                description: updateData.description,
                description_en: updateData.descriptionEn,
                price: updateData.price,
                image_url: updateData.imageUrl,
                is_active: updateData.isActive,
                in_stock: updateData.inStock,
                is_featured: updateData.isFeatured,
                is_premium: updateData.isPremium,
                tags: updateData.tags,
                sort_order: updateData.sortOrder,
            })
            .eq('id', id)
            .eq('business_id', businessId)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Ecommerce Products PUT Error]:', error);
        return NextResponse.json(
            { error: 'Ürün güncellenirken hata oluştu' },
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
            return NextResponse.json({ error: 'Business ID and Product ID required' }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();

        const { data: existing, error: checkError } = await supabase
            .from(TABLE)
            .select('id, business_id')
            .eq('id', id)
            .eq('business_id', businessId)
            .single();

        if (checkError || !existing) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 });
        }

        const { error } = await supabase
            .from(TABLE)
            .delete()
            .eq('id', id)
            .eq('business_id', businessId);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Ecommerce Products DELETE Error]:', error);
        return NextResponse.json(
            { error: 'Ürün silinirken hata oluştu' },
            { status: 500 }
        );
    }
}
