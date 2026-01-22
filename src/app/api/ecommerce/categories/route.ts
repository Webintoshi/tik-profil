import { NextRequest, NextResponse } from 'next/server';
import {
    getDocumentREST,
    createDocumentREST,
    updateDocumentREST,
    deleteDocumentREST
} from '@/lib/documentStore';
import { getSupabaseClient } from '@/lib/supabase';
import { categorySchema } from '@/types/ecommerce';
import type { Category } from '@/types/ecommerce';

const COLLECTION = 'ecommerce_categories';

// Helper to generate slug
function generateSlug(name: string): string {
    return name
        .toLowerCase()
        .replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u')
        .replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/ı/g, 'i')
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

// GET: List categories or get single category
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const businessId = searchParams.get('businessId');
        const categoryId = searchParams.get('id');

        if (!businessId) {
            return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
        }

        // Get single category
        if (categoryId) {
            const category = await getDocumentREST(COLLECTION, categoryId);
            if (!category || category.businessId !== businessId) {
                return NextResponse.json({ error: 'Category not found' }, { status: 404 });
            }
            return NextResponse.json(category);
        }

        // Get all categories for business
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
            .from('app_documents')
            .select('id,data')
            .eq('collection', COLLECTION)
            .eq('data->>businessId', businessId)
            .range(0, 1999);
        if (error) throw error;
        const categories = (data || [])
            .map((r: any) => ({ id: r.id as string, ...(r.data as Record<string, unknown>) } as unknown as Category))
            .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

        return NextResponse.json({ success: true, categories });
    } catch (error) {
        console.error('[Ecommerce Categories GET Error]:', error);
        return NextResponse.json(
            { error: 'Kategoriler alınırken hata oluştu' },
            { status: 500 }
        );
    }
}

// POST: Create new category
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { businessId, ...categoryData } = body;

        if (!businessId) {
            return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
        }

        // Validate
        const validation = categorySchema.safeParse(categoryData);
        if (!validation.success) {
            return NextResponse.json({
                error: validation.error.issues[0].message
            }, { status: 400 });
        }

        const data = validation.data;

        // Generate slug if not provided
        const slug = data.slug || generateSlug(data.name);

        const supabase = getSupabaseClient();
        const { data: categoryRows, error: categoriesError } = await supabase
            .from('app_documents')
            .select('id,data')
            .eq('collection', COLLECTION)
            .eq('data->>businessId', businessId)
            .range(0, 1999);
        if (categoriesError) throw categoriesError;

        const businessCategories = (categoryRows || []).map((r: any) => ({
            id: r.id as string,
            ...(r.data as Record<string, unknown>),
        })) as unknown as Category[];

        const duplicate = businessCategories.find(cat => cat.slug === slug);
        if (duplicate) {
            return NextResponse.json({ error: 'Bu slug zaten kullanılıyor' }, { status: 400 });
        }

        const maxSortOrder = businessCategories.reduce((max, cat) => Math.max(max, cat.sortOrder || 0), 0);

        const newCategory = {
            ...data,
            businessId,
            slug,
            sortOrder: data.sortOrder || maxSortOrder + 1,
            productCount: 0,
            status: data.status || 'active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        const id = await createDocumentREST(COLLECTION, newCategory);

        return NextResponse.json({
            success: true,
            id,
            category: { id, ...newCategory }
        });
    } catch (error) {
        console.error('[Ecommerce Categories POST Error]:', error);
        return NextResponse.json(
            { error: 'Kategori oluşturulurken hata oluştu' },
            { status: 500 }
        );
    }
}

// PUT: Update category
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { businessId, id, ...updateData } = body;

        if (!businessId || !id) {
            return NextResponse.json({ error: 'Business ID and Category ID required' }, { status: 400 });
        }

        // Check category exists and belongs to business
        const existing = await getDocumentREST(COLLECTION, id);
        if (!existing || existing.businessId !== businessId) {
            return NextResponse.json({ error: 'Category not found' }, { status: 404 });
        }

        // Validate
        const validation = categorySchema.partial().safeParse(updateData);
        if (!validation.success) {
            return NextResponse.json({
                error: validation.error.issues[0].message
            }, { status: 400 });
        }

        const data = validation.data;

        // If name changed and no slug provided, generate new slug
        if (data.name && !data.slug) {
            data.slug = generateSlug(data.name);
        }

        // Check for duplicate slug if slug changed
        if (data.slug && data.slug !== existing.slug) {
            const supabase = getSupabaseClient();
            const { data: duplicateRows, error: duplicateError } = await supabase
                .from('app_documents')
                .select('id')
                .eq('collection', COLLECTION)
                .eq('data->>businessId', businessId)
                .eq('data->>slug', data.slug)
                .neq('id', id)
                .range(0, 0);
            if (duplicateError) throw duplicateError;
            const duplicate = duplicateRows?.[0];
            if (duplicate) {
                return NextResponse.json({ error: 'Bu slug zaten kullanılıyor' }, { status: 400 });
            }
        }

        await updateDocumentREST(COLLECTION, id, {
            ...data,
            updatedAt: new Date().toISOString(),
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Ecommerce Categories PUT Error]:', error);
        return NextResponse.json(
            { error: 'Kategori güncellenirken hata oluştu' },
            { status: 500 }
        );
    }
}

// DELETE: Delete category
export async function DELETE(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const businessId = searchParams.get('businessId');
        const id = searchParams.get('id');

        if (!businessId || !id) {
            return NextResponse.json({ error: 'Business ID and Category ID required' }, { status: 400 });
        }

        // Check category exists and belongs to business
        const existing = await getDocumentREST(COLLECTION, id);
        if (!existing || existing.businessId !== businessId) {
            return NextResponse.json({ error: 'Category not found' }, { status: 404 });
        }

        // TODO: Check if category has products before deleting
        // For now, just delete
        await deleteDocumentREST(COLLECTION, id);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Ecommerce Categories DELETE Error]:', error);
        return NextResponse.json(
            { error: 'Kategori silinirken hata oluştu' },
            { status: 500 }
        );
    }
}
