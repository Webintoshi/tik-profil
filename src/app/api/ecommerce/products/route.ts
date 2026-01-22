import { NextRequest, NextResponse } from 'next/server';
import {
    getDocumentREST,
    createDocumentREST,
    updateDocumentREST,
    deleteDocumentREST
} from '@/lib/documentStore';
import { getSupabaseClient } from '@/lib/supabase';
import { productSchema } from '@/types/ecommerce';
import type { Product } from '@/types/ecommerce';

const COLLECTION = 'ecommerce_products';
const CATEGORIES_COLLECTION = 'ecommerce_categories';

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

// GET: List products or get single product
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const businessId = searchParams.get('businessId');
        const productId = searchParams.get('id');
        const categoryId = searchParams.get('categoryId');

        if (!businessId) {
            return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
        }

        // Get single product
        if (productId) {
            const product = await getDocumentREST(COLLECTION, productId);
            if (!product || product.businessId !== businessId) {
                return NextResponse.json({ error: 'Product not found' }, { status: 404 });
            }
            return NextResponse.json(product);
        }

        // Get all products for business
        const supabase = getSupabaseClient();
        let queryBuilder = supabase
            .from('app_documents')
            .select('id,data')
            .eq('collection', COLLECTION)
            .eq('data->>businessId', businessId);

        // Filter by category if provided
        if (categoryId) {
            queryBuilder = queryBuilder.eq('data->>categoryId', categoryId);
        }

        const { data, error } = await queryBuilder.range(0, 1999);
        if (error) throw error;
        const products = (data || [])
            .map((r: any) => ({ id: r.id as string, ...(r.data as Record<string, unknown>) } as unknown as Product))
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return NextResponse.json({ success: true, products });
    } catch (error) {
        console.error('[Ecommerce Products GET Error]:', error);
        return NextResponse.json(
            { error: 'Ürünler alınırken hata oluştu' },
            { status: 500 }
        );
    }
}

// POST: Create new product
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { businessId, ...productData } = body;

        if (!businessId) {
            return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
        }

        // Validate
        const validation = productSchema.safeParse(productData);
        if (!validation.success) {
            return NextResponse.json({
                error: validation.error.issues[0].message
            }, { status: 400 });
        }

        const data = validation.data;

        // Generate slug if not provided
        const slug = data.slug || generateSlug(data.name);

        // Generate SKU if not provided
        const sku = data.sku || `SKU-${Date.now().toString(36).toUpperCase()}`;

        // Check for duplicate slug in same business
        const supabase = getSupabaseClient();
        const { data: duplicateRows, error: duplicateError } = await supabase
            .from('app_documents')
            .select('id')
            .eq('collection', COLLECTION)
            .eq('data->>businessId', businessId)
            .eq('data->>slug', slug)
            .range(0, 0);
        if (duplicateError) throw duplicateError;
        const duplicate = duplicateRows?.[0];
        if (duplicate) {
            return NextResponse.json({ error: 'Bu slug zaten kullanılıyor' }, { status: 400 });
        }

        // Omit status and stock to avoid type conflicts from Zod inference
        const { status: inputStatus, stock: inputStock, ...restData } = data;

        const newProduct = {
            ...restData,
            businessId,
            slug,
            sku,
            status: (inputStatus || 'active') as 'active' | 'inactive' | 'draft' | 'archived',
            stock: inputStock ?? 0,
            stockQuantity: inputStock ?? 0,
            trackStock: data.trackStock ?? true,
            hasVariants: data.hasVariants ?? false,
            images: data.images ?? [],
            sortOrder: data.sortOrder ?? 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        const id = await createDocumentREST(COLLECTION, newProduct);

        // Update category product count
        if (data.categoryId) {
            try {
                const category = await getDocumentREST(CATEGORIES_COLLECTION, data.categoryId);
                if (category) {
                    const currentCount = (category.productCount as number) || 0;
                    await updateDocumentREST(CATEGORIES_COLLECTION, data.categoryId, {
                        productCount: currentCount + 1,
                    });
                }
            } catch (e) {
                console.error('Error updating category count:', e);
            }
        }

        return NextResponse.json({
            success: true,
            id,
            product: { id, ...newProduct }
        });
    } catch (error) {
        console.error('[Ecommerce Products POST Error]:', error);
        return NextResponse.json(
            { error: 'Ürün oluşturulurken hata oluştu' },
            { status: 500 }
        );
    }
}

// PUT: Update product
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { businessId, id, ...updateData } = body;

        if (!businessId || !id) {
            return NextResponse.json({ error: 'Business ID and Product ID required' }, { status: 400 });
        }

        // Check product exists and belongs to business
        const existing = await getDocumentREST(COLLECTION, id);
        if (!existing || existing.businessId !== businessId) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 });
        }

        // Validate
        const validation = productSchema.partial().safeParse(updateData);
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

        // Handle category change - update product counts
        if (data.categoryId && data.categoryId !== existing.categoryId) {
            try {
                // Decrease old category count
                if (existing.categoryId) {
                    const categoryId = existing.categoryId as string;
                    const oldCategory = await getDocumentREST(CATEGORIES_COLLECTION, categoryId);
                    if (oldCategory) {
                        const oldCount = (oldCategory.productCount as number) || 0;
                        await updateDocumentREST(CATEGORIES_COLLECTION, categoryId, {
                            productCount: Math.max(0, oldCount - 1),
                        });
                    }
                }
                // Increase new category count
                const newCategory = await getDocumentREST(CATEGORIES_COLLECTION, data.categoryId);
                if (newCategory) {
                    const newCount = (newCategory.productCount as number) || 0;
                    await updateDocumentREST(CATEGORIES_COLLECTION, data.categoryId, {
                        productCount: newCount + 1,
                    });
                }
            } catch (e) {
                console.error('Error updating category counts:', e);
            }
        }

        await updateDocumentREST(COLLECTION, id, {
            ...data,
            updatedAt: new Date().toISOString(),
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Ecommerce Products PUT Error]:', error);
        return NextResponse.json(
            { error: 'Ürün güncellenirken hata oluştu' },
            { status: 500 }
        );
    }
}

// DELETE: Delete product
export async function DELETE(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const businessId = searchParams.get('businessId');
        const id = searchParams.get('id');

        if (!businessId || !id) {
            return NextResponse.json({ error: 'Business ID and Product ID required' }, { status: 400 });
        }

        // Check product exists and belongs to business
        const existing = await getDocumentREST(COLLECTION, id);
        if (!existing || existing.businessId !== businessId) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 });
        }

        // Delete product
        await deleteDocumentREST(COLLECTION, id);

        // Update category product count
        if (existing.categoryId) {
            try {
                const category = await getDocumentREST(CATEGORIES_COLLECTION, existing.categoryId as string);
                if (category) {
                    const count = (category.productCount as number) || 0;
                    await updateDocumentREST(CATEGORIES_COLLECTION, existing.categoryId as string, {
                        productCount: Math.max(0, count - 1),
                    });
                }
            } catch (e) {
                console.error('Error updating category count:', e);
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Ecommerce Products DELETE Error]:', error);
        return NextResponse.json(
            { error: 'Ürün silinirken hata oluştu' },
            { status: 500 }
        );
    }
}
