// Beauty Services API - CRUD Operations
import {
    getCollectionREST,
    createDocumentREST,
    updateDocumentREST,
    deleteDocumentREST
} from '@/lib/documentStore';
import { requireAuth } from '@/lib/apiAuth';
import { AppError, validateOrThrow } from '@/lib/errors';
import { createServiceSchema } from '@/types/beauty';

const COLLECTION = 'beauty_services';

// Helper for date sorting
function getTime(val: unknown): number {
    if (!val) return 0;
    if (typeof val === 'string') return new Date(val).getTime();
    if (typeof val === 'object' && val !== null && 'seconds' in val) {
        return (val as { seconds: number }).seconds * 1000;
    }
    return 0;
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

        const allServices = await getCollectionREST(COLLECTION);
        let services = allServices.filter((s) => s.businessId === businessId);

        // Apply category filter
        if (categoryId) {
            services = services.filter((s) => s.categoryId === categoryId);
        }

        // Sort by creation date (newest first)
        services.sort((a, b) => getTime(b.createdAt) - getTime(a.createdAt));

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

        // Server-side validation with Zod
        const data = validateOrThrow(createServiceSchema, body);

        const serviceId = await createDocumentREST(COLLECTION, {
            businessId,
            categoryId: data.categoryId,
            name: data.name,
            description: data.description || '',
            price: data.price,
            currency: 'TRY',
            duration: data.duration,
            images: data.images || [],
            isActive: data.isActive !== false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });

        return Response.json({ success: true, serviceId });
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

        // Verify ownership
        const allServices = await getCollectionREST(COLLECTION);
        const service = allServices.find((s) => s.id === id);
        if (!service || service.businessId !== businessId) {
            return AppError.notFound('Hizmet').toResponse();
        }

        await updateDocumentREST(COLLECTION, id, {
            ...updateData,
            updatedAt: new Date().toISOString(),
        });

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

        // Verify ownership
        const allServices = await getCollectionREST(COLLECTION);
        const service = allServices.find((s) => s.id === id);
        if (!service || service.businessId !== businessId) {
            return AppError.notFound('Hizmet').toResponse();
        }

        await deleteDocumentREST(COLLECTION, id);

        return Response.json({ success: true });
    } catch (error) {
        return AppError.toResponse(error, 'Beauty Services DELETE');
    }
}
