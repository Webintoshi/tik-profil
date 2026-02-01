// Consultant Session API - Get current session
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { getSessionSecretBytes } from '@/lib/env';
import { getDocumentREST } from '@/lib/documentStore';

const CONSULTANTS_COLLECTION = 'em_consultants';
const BUSINESSES_COLLECTION = 'businesses';

// Get JWT secret
const getJwtSecret = () => getSessionSecretBytes();

export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('tikprofil_consultant_session')?.value;

        if (!token) {
            return NextResponse.json({
                success: false,
                error: 'No session'
            }, { status: 401 });
        }

        // Verify token
        const { payload } = await jwtVerify(token, getJwtSecret());

        const consultantId = payload.consultantId as string;
        const businessId = payload.businessId as string;

        // Get consultant data
        const consultant = await getDocumentREST(CONSULTANTS_COLLECTION, consultantId);
        if (!consultant || consultant.isActive === false) {
            return NextResponse.json({
                success: false,
                error: 'Danışman bulunamadı veya aktif değil'
            }, { status: 401 });
        }

        // Get business data
        const business = await getDocumentREST(BUSINESSES_COLLECTION, businessId);

        return NextResponse.json({
            success: true,
            session: {
                consultantId,
                businessId,
                name: payload.name,
                role: payload.role,
            },
            consultant: {
                id: consultant.id,
                name: consultant.name,
                title: consultant.title,
                email: consultant.email,
                phone: consultant.phone,
                photoUrl: consultant.photoUrl,
                slug: consultant.slug,
                bio: consultant.bio,
            },
            business: business ? {
                id: business.id,
                name: business.name,
                slug: business.slug,
            } : null,
        });
    } catch (error) {
        console.error('[Consultant Session] Error:', error);
        return NextResponse.json({
            success: false,
            error: 'Oturum geçersiz'
        }, { status: 401 });
    }
}
