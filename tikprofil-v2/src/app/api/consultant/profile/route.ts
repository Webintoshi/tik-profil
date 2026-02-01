// Consultant Profile API - Profile management for consultants
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import {
    getDocumentREST,
    updateDocumentREST
} from '@/lib/documentStore';
import bcrypt from 'bcryptjs';
import { getSessionSecretBytes } from '@/lib/env';

const COLLECTION = 'em_consultants';

// Get JWT secret
const getJwtSecret = () => getSessionSecretBytes();

// Get consultant session data
async function getConsultantSession(): Promise<{ consultantId: string; businessId: string } | null> {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("tikprofil_consultant_session")?.value;
        if (!token) return null;

        const { payload } = await jwtVerify(token, getJwtSecret());
        const consultantId = payload.consultantId as string;
        const businessId = payload.businessId as string;

        if (!consultantId || !businessId) return null;
        return { consultantId, businessId };
    } catch {
        return null;
    }
}

// GET - Get current consultant's profile
export async function GET() {
    try {
        const session = await getConsultantSession();
        if (!session) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const consultant = await getDocumentREST(COLLECTION, session.consultantId);
        if (consultant && consultant.businessId !== session.businessId) {
            return NextResponse.json({ success: false, error: 'Danışman bulunamadı' }, { status: 404 });
        }

        if (!consultant) {
            return NextResponse.json({ success: false, error: 'Danışman bulunamadı' }, { status: 404 });
        }

        // Remove password from response
        const { password: _, ...safeConsultant } = consultant;

        return NextResponse.json({ success: true, consultant: safeConsultant });
    } catch (error) {
        console.error('[Consultant Profile] GET error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}

// PUT - Update consultant's profile
export async function PUT(request: Request) {
    try {
        const session = await getConsultantSession();
        if (!session) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const {
            name,
            title,
            phone,
            email,
            whatsapp,
            bio,
            photoUrl,
            currentPassword,
            newPassword
        } = body;

        // Verify consultant exists
        const consultant = await getDocumentREST(COLLECTION, session.consultantId);
        if (consultant && consultant.businessId !== session.businessId) {
            return NextResponse.json({ success: false, error: 'Danışman bulunamadı' }, { status: 404 });
        }

        if (!consultant) {
            return NextResponse.json({ success: false, error: 'Danışman bulunamadı' }, { status: 404 });
        }

        // Build update data
        const updateData: Record<string, unknown> = {
            updatedAt: new Date().toISOString(),
        };

        // Update allowed fields if provided
        if (name?.trim()) updateData.name = name.trim();
        if (title !== undefined) updateData.title = title.trim();
        if (phone?.trim()) updateData.phone = phone.trim();
        if (email !== undefined) updateData.email = email.trim();
        if (whatsapp !== undefined) updateData.whatsapp = whatsapp.trim();
        if (bio !== undefined) updateData.bio = bio.trim();
        if (photoUrl !== undefined) updateData.photoUrl = photoUrl.trim();

        // Handle password change if requested
        if (newPassword && newPassword.length >= 6) {
            // If consultant has a password, verify current password
            if (consultant.password && typeof consultant.password === 'string') {
                if (!currentPassword) {
                    return NextResponse.json({
                        success: false,
                        error: 'Mevcut şifre gerekli'
                    }, { status: 400 });
                }

                const passwordMatch = await bcrypt.compare(currentPassword as string, consultant.password);
                if (!passwordMatch) {
                    return NextResponse.json({
                        success: false,
                        error: 'Mevcut şifre yanlış'
                    }, { status: 400 });
                }
            }

            // Hash and save new password
            updateData.password = await bcrypt.hash(newPassword, 10);
        }

        await updateDocumentREST(COLLECTION, session.consultantId, updateData);

        return NextResponse.json({ success: true, message: 'Profil güncellendi' });
    } catch (error) {
        console.error('[Consultant Profile] PUT error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}
