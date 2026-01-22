// Welcome Email Test Endpoint
import { NextResponse } from 'next/server';
import { sendWelcomeEmail } from '@/lib/services/emailService';

export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const to = url.searchParams.get('to');

        if (!to) {
            return NextResponse.json({
                message: 'Hoş geldin email test endpoint',
                usage: '/api/email/welcome?to=email@example.com&name=İsim&business=İşletme',
                example: 'https://tikprofil.com/api/email/welcome?to=test@gmail.com&name=Ahmet&business=Cafe%20Istanbul'
            });
        }

        const name = url.searchParams.get('name') || 'Değerli Müşterimiz';
        const business = url.searchParams.get('business') || 'İşletmeniz';

        const result = await sendWelcomeEmail({
            to,
            ownerName: name,
            businessName: business
        });

        if (result.success) {
            return NextResponse.json({
                success: true,
                message: `Hoş geldin emaili ${to} adresine gönderildi!`,
                messageId: result.messageId
            });
        } else {
            return NextResponse.json(
                { error: result.error || 'Email gönderilemedi' },
                { status: 500 }
            );
        }
    } catch (error) {
        console.error('[API] Welcome email error:', error);
        return NextResponse.json(
            { error: 'Sunucu hatası' },
            { status: 500 }
        );
    }
}
