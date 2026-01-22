// Consultant Login API
// Danışmanlar için ayrı giriş sistemi
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SignJWT } from 'jose';
import { getCollectionREST, updateDocumentREST } from '@/lib/documentStore';
import { getSessionSecretBytes } from '@/lib/env';
import bcrypt from 'bcryptjs';

const CONSULTANTS_COLLECTION = 'em_consultants';
const BUSINESSES_COLLECTION = 'businesses';

// Get JWT secret
const getJwtSecret = () => getSessionSecretBytes();

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, password, phone } = body;

        // Email veya telefon ile giriş
        if (!email && !phone) {
            return NextResponse.json({
                success: false,
                error: 'E-posta veya telefon numarası gerekli'
            }, { status: 400 });
        }

        if (!password) {
            return NextResponse.json({
                success: false,
                error: 'Şifre gerekli'
            }, { status: 400 });
        }

        // Find consultant
        const allConsultants = await getCollectionREST(CONSULTANTS_COLLECTION);
        const consultant = allConsultants.find(c => {
            if (email) {
                const consultantEmail = (c.email as string | undefined)?.toLowerCase();
                return consultantEmail === email.toLowerCase() && c.isActive !== false;
            }
            if (phone) {
                const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
                const consultantPhone = ((c.phone as string) || '').replace(/[\s\-\(\)]/g, '');
                return consultantPhone === cleanPhone && c.isActive !== false;
            }
            return false;
        });

        if (!consultant) {
            return NextResponse.json({
                success: false,
                error: 'Danışman bulunamadı'
            }, { status: 401 });
        }

        // Check if consultant has password set
        if (!consultant.password) {
            return NextResponse.json({
                success: false,
                error: 'Şifre henüz oluşturulmamış. Lütfen işletme sahibinden şifre talep edin.',
                needsPasswordSetup: true
            }, { status: 401 });
        }

        // Verify password
        const passwordMatch = await bcrypt.compare(password, consultant.password as string);
        if (!passwordMatch) {
            return NextResponse.json({
                success: false,
                error: 'Şifre hatalı'
            }, { status: 401 });
        }

        // Get business info
        const businesses = await getCollectionREST(BUSINESSES_COLLECTION);
        const business = businesses.find(b => b.id === consultant.businessId);

        if (!business) {
            return NextResponse.json({
                success: false,
                error: 'İşletme bulunamadı'
            }, { status: 404 });
        }

        // Create JWT token
        const token = await new SignJWT({
            consultantId: consultant.id,
            businessId: consultant.businessId,
            name: consultant.name,
            role: 'consultant'
        })
            .setProtectedHeader({ alg: 'HS256' })
            .setExpirationTime('7d')
            .setIssuedAt()
            .sign(getJwtSecret());

        // Set cookie
        const cookieStore = await cookies();
        cookieStore.set('tikprofil_consultant_session', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7, // 7 days
            path: '/',
        });

        // Update last login
        await updateDocumentREST(CONSULTANTS_COLLECTION, consultant.id as string, {
            lastLogin: new Date().toISOString()
        });

        return NextResponse.json({
            success: true,
            data: {
                consultant: {
                    id: consultant.id,
                    name: consultant.name,
                    title: consultant.title,
                    email: consultant.email,
                    phone: consultant.phone,
                    photoUrl: consultant.photoUrl,
                    slug: consultant.slug,
                },
                business: {
                    id: business.id,
                    name: business.name,
                    slug: business.slug,
                }
            }
        });
    } catch (error) {
        console.error('[Consultant Login] Error:', error);
        return NextResponse.json({
            success: false,
            error: 'Sunucu hatası'
        }, { status: 500 });
    }
}
