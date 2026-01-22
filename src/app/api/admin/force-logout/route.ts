// Force Logout API - Admin endpoint to invalidate business sessions
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { updateDocumentREST, getCollectionREST, getDocumentREST } from '@/lib/documentStore';
import { AppError } from '@/lib/errors';
import { getSessionSecretBytes } from '@/lib/env';

// Force dynamic
export const dynamic = 'force-dynamic';

// Get JWT secret
const getJwtSecret = () => getSessionSecretBytes();

// Check if requester is admin
async function isAdmin(): Promise<{ isAdmin: boolean; username?: string }> {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("tikprofil_session")?.value;
        if (!token) return { isAdmin: false };

        const { payload } = await jwtVerify(token, getJwtSecret());
        return { isAdmin: true, username: payload.username as string };
    } catch {
        return { isAdmin: false };
    }
}

// POST - Force logout a business and all its staff
export async function POST(request: Request) {
    try {
        // Only admins can force logout
        const adminCheck = await isAdmin();
        if (!adminCheck.isAdmin) {
            return AppError.unauthorized().toResponse();
        }

        const body = await request.json();
        const { businessId } = body;

        if (!businessId) {
            return AppError.badRequest('businessId gerekli').toResponse();
        }

        // Verify business exists
        const business = await getDocumentREST('businesses', businessId);
        if (!business) {
            return AppError.notFound('İşletme').toResponse();
        }
        // 1. Update business status to force logout
        await updateDocumentREST('businesses', businessId, {
            status: 'inactive',
            forceLoggedOut: true,
            forceLoggedOutAt: new Date().toISOString(),
            forceLoggedOutBy: adminCheck.username,
        });

        // 2. Invalidate all staff sessions for this business
        const allStaff = await getCollectionREST('business_staff');
        const businessStaff = allStaff.filter(s =>
            s.businessId === businessId || s.business_id === businessId
        );

        let staffUpdated = 0;
        for (const staff of businessStaff) {
            await updateDocumentREST('business_staff', staff.id as string, {
                sessionActive: false,
                sessionInvalidatedAt: new Date().toISOString(),
            });
            staffUpdated++;
        }
        return Response.json({
            success: true,
            message: `${business.name} oturumları sonlandırıldı`,
            details: {
                businessStatus: 'inactive',
                staffSessionsInvalidated: staffUpdated,
            }
        });

    } catch (error) {
        return AppError.toResponse(error, 'Force Logout');
    }
}

// GET - Check force logout status of a business
export async function GET(request: Request) {
    try {
        const adminCheck = await isAdmin();
        if (!adminCheck.isAdmin) {
            return AppError.unauthorized().toResponse();
        }

        const { searchParams } = new URL(request.url);
        const businessId = searchParams.get('businessId');

        if (!businessId) {
            return AppError.badRequest('businessId gerekli').toResponse();
        }

        const business = await getDocumentREST('businesses', businessId);
        if (!business) {
            return AppError.notFound('İşletme').toResponse();
        }

        return Response.json({
            success: true,
            businessId,
            status: business.status,
            forceLoggedOut: business.forceLoggedOut || false,
            forceLoggedOutAt: business.forceLoggedOutAt || null,
        });

    } catch (error) {
        return AppError.toResponse(error, 'Force Logout Status');
    }
}
