// Reset Password API - Verify token and set new password
import { NextResponse } from 'next/server';
import { getCollectionREST, updateDocumentREST } from '@/lib/documentStore';
import { hashPassword } from '@/lib/password';

export async function POST(request: Request) {
    try {
        const { token, newPassword } = await request.json();

        if (!token || !newPassword) {
            return NextResponse.json(
                { error: 'Token ve yeni şifre gerekli' },
                { status: 400 }
            );
        }

        if (newPassword.length < 6) {
            return NextResponse.json(
                { error: 'Şifre en az 6 karakter olmalıdır' },
                { status: 400 }
            );
        }

        // Find the reset token
        const tokens = await getCollectionREST('password_reset_tokens');
        const resetToken = tokens.find(t =>
            (t.token as string) === token &&
            !(t.used as boolean)
        );

        if (!resetToken) {
            return NextResponse.json(
                { error: 'Geçersiz veya süresi dolmuş bağlantı' },
                { status: 400 }
            );
        }

        // Check if token is expired
        const expires = new Date(resetToken.expires as string);
        if (expires < new Date()) {
            return NextResponse.json(
                { error: 'Bu bağlantının süresi dolmuş. Lütfen yeni bir şifre sıfırlama isteği oluşturun.' },
                { status: 400 }
            );
        }

        const email = (resetToken.email as string).toLowerCase();
        const userType = resetToken.type as string;

        // Hash the new password using secure PBKDF2
        const hashedPassword = await hashPassword(newPassword);

        if (userType === 'owner') {
            const owners = await getCollectionREST('business_owners');
            const owner = owners.find(o => ((o.email as string) || '').toLowerCase() === email);

            if (owner) {
                await updateDocumentREST('business_owners', owner.id as string, {
                    password_hash: hashedPassword,
                    updated_at: new Date().toISOString()
                });
            }
        } else if (userType === 'staff') {
            // Update staff password
            const staffId = resetToken.staffId as string;
            if (staffId) {
                await updateDocumentREST('business_staff', staffId, {
                    password_hash: hashedPassword,
                    passwordHash: hashedPassword,
                    updated_at: new Date().toISOString()
                });
            }
        }

        // Mark token as used
        await updateDocumentREST('password_reset_tokens', resetToken.id as string, {
            used: true,
            usedAt: new Date().toISOString()
        });

        return NextResponse.json({
            success: true,
            message: 'Şifreniz başarıyla güncellendi. Şimdi giriş yapabilirsiniz.'
        });

    } catch (error) {
        console.error('[ResetPassword] Error:', error);
        return NextResponse.json(
            { error: 'Sunucu hatası' },
            { status: 500 }
        );
    }
}

// GET endpoint to verify token validity
export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const token = url.searchParams.get('token');

        if (!token) {
            return NextResponse.json(
                { valid: false, error: 'Token gerekli' },
                { status: 400 }
            );
        }

        const tokens = await getCollectionREST('password_reset_tokens');
        const resetToken = tokens.find(t =>
            (t.token as string) === token &&
            !(t.used as boolean)
        );

        if (!resetToken) {
            return NextResponse.json({ valid: false, error: 'Geçersiz token' });
        }

        const expires = new Date(resetToken.expires as string);
        if (expires < new Date()) {
            return NextResponse.json({ valid: false, error: 'Token süresi dolmuş' });
        }

        return NextResponse.json({
            valid: true,
            email: resetToken.email
        });

    } catch (error) {
        console.error('[ResetPassword] Verify error:', error);
        return NextResponse.json(
            { valid: false, error: 'Sunucu hatası' },
            { status: 500 }
        );
    }
}
