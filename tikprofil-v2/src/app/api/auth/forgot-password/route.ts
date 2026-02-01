// Forgot Password API - Request password reset
import { NextResponse } from 'next/server';
import { getCollectionREST, createDocumentREST, getDocumentREST } from '@/lib/documentStore';
import { sendPasswordResetEmail } from '@/lib/services/emailService';
import crypto from 'crypto';

export async function POST(request: Request) {
    try {
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json(
                { error: 'Email adresi gerekli' },
                { status: 400 }
            );
        }

        const emailLower = email.toLowerCase().trim();

        // Find owner with this email
        const owners = await getCollectionREST('business_owners');
        const owner = owners.find(o =>
            ((o.email as string) || '').toLowerCase() === emailLower
        );

        if (owner) {
            let businessName = (owner.full_name as string) || 'Değerli Müşterimiz';
            try {
                const business = await getDocumentREST('businesses', owner.business_id as string);
                if (business) {
                    businessName = (business.name as string) || businessName;
                }
            } catch {
            }

            // Generate reset token
            const resetToken = crypto.randomBytes(32).toString('hex');
            const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

            // Store token in document store
            await createDocumentREST('password_reset_tokens', {
                email: emailLower,
                token: resetToken,
                expires: resetExpires.toISOString(),
                used: false,
                type: 'owner'
            });

            // Send reset email
            const resetLink = `https://tikprofil.com/sifre-sifirla?token=${resetToken}`;

            await sendPasswordResetEmail({
                to: emailLower,
                name: businessName,
                resetLink
            });
        } else {
            // Check if it's a staff member
            const allStaff = await getCollectionREST('business_staff');
            const staffMember = allStaff.find(s =>
                ((s.email as string) || '').toLowerCase() === emailLower
            );

            if (staffMember) {
                // Generate reset token for staff
                const resetToken = crypto.randomBytes(32).toString('hex');
                const resetExpires = new Date(Date.now() + 60 * 60 * 1000);

                await createDocumentREST('password_reset_tokens', {
                    email: emailLower,
                    token: resetToken,
                    expires: resetExpires.toISOString(),
                    used: false,
                    type: 'staff',
                    staffId: staffMember.id
                });

                const resetLink = `https://tikprofil.com/sifre-sifirla?token=${resetToken}`;

                await sendPasswordResetEmail({
                    to: emailLower,
                    name: (staffMember.name as string) || 'Ekip Üyesi',
                    resetLink
                });
            }
        }

        // Always return success (don't reveal if email exists)
        return NextResponse.json({
            success: true,
            message: 'Eğer bu email ile kayıtlı bir hesap varsa, şifre sıfırlama bağlantısı gönderildi.'
        });

    } catch (error) {
        console.error('[ForgotPassword] Error:', error);
        return NextResponse.json(
            { error: 'Sunucu hatası' },
            { status: 500 }
        );
    }
}
