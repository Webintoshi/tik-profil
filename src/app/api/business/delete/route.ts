// Business Delete API with Cascade Delete
// Supports both Admin and Owner session
import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import {
    getCollectionREST,
    deleteDocumentREST,
    cascadeDeleteBusinessData
} from '@/lib/documentStore';
import { AppError } from '@/lib/errors';
import { getSessionSecretBytes } from '@/lib/env';

// Force dynamic
export const dynamic = 'force-dynamic';

// Get JWT secret
const getJwtSecret = () => getSessionSecretBytes();

// Session result type
interface SessionResult {
    businessId: string | null;
    isAdmin: boolean;
    username?: string;
}

// Get session from any valid cookie (admin or owner)
async function getSession(): Promise<SessionResult> {
    try {
        const cookieStore = await cookies();

        // Check for admin session first
        const adminToken = cookieStore.get("tikprofil_session")?.value;
        if (adminToken) {
            try {
                const { payload } = await jwtVerify(adminToken, getJwtSecret());
                return {
                    businessId: null, // Admin doesn't have a specific business
                    isAdmin: true,
                    username: payload.username as string
                };
            } catch {
                // Invalid admin token, fall through
            }
        }

        // Check for owner session
        const ownerToken = cookieStore.get("tikprofil_owner_session")?.value;
        if (ownerToken) {
            try {
                const { payload } = await jwtVerify(ownerToken, getJwtSecret());
                return {
                    businessId: payload.businessId as string || null,
                    isAdmin: false
                };
            } catch {
                // Invalid owner token
            }
        }

        return { businessId: null, isAdmin: false };
    } catch {
        return { businessId: null, isAdmin: false };
    }
}

// DELETE - Delete business and all associated data (cascade delete)
export async function DELETE(request: Request) {
    try {
        const session = await getSession();

        // Get target businessId from request body (for admin) or session (for owner)
        let targetBusinessId: string | null = null;

        try {
            const body = await request.json();
            if (body.businessId && session.isAdmin) {
                // Admin can specify any business to delete
                targetBusinessId = body.businessId;
            }
        } catch {
            // No body or invalid JSON - that's okay
        }

        // If not admin specifying a target, use session businessId
        if (!targetBusinessId) {
            targetBusinessId = session.businessId;
        }

        // Must have either admin session with target OR owner session with businessId
        if (!targetBusinessId) {
            return AppError.unauthorized().toResponse();
        }

        // Verify business exists
        const businesses = await getCollectionREST('businesses');
        const business = businesses.find(b => b.id === targetBusinessId);
        if (!business) {
            return AppError.notFound('İşletme').toResponse();
        }
        // 1. CASCADE DELETE: Delete all module-specific data
        const cascadeResults = await cascadeDeleteBusinessData(targetBusinessId);
        // 2. Delete business_owners associated with this business
        const owners = await getCollectionREST('business_owners');
        const businessOwners = owners.filter(o =>
            o.business_id === targetBusinessId || o.businessId === targetBusinessId
        );
        for (const owner of businessOwners) {
            await deleteDocumentREST('business_owners', owner.id as string);
        }
        // 3. Delete the business document itself
        await deleteDocumentREST('businesses', targetBusinessId);
        // Calculate total deleted
        const totalDeleted = Object.values(cascadeResults).reduce((sum, val) => sum + val, 0);

        return Response.json({
            success: true,
            message: 'İşletme ve tüm verileri silindi',
            deleted: {
                business: 1,
                owners: businessOwners.length,
                totalModuleData: totalDeleted,
                details: cascadeResults
            }
        });

    } catch (error) {
        return AppError.toResponse(error, 'Business Delete');
    }
}
