// Test Email API Endpoint
import { NextResponse } from 'next/server';
import { sendEmail, sendWelcomeEmail } from '@/lib/services/emailService';

export async function POST(request: Request) {
    try {
        const { to, subject, message, type } = await request.json();

        if (!to) {
            return NextResponse.json(
                { error: 'to alanı gerekli' },
                { status: 400 }
            );
        }

        // Send actual Welcome Email template if requested
        if (type === 'welcome') {
            const result = await sendWelcomeEmail({
                to,
                businessName: 'Tık Profil Demo İşletme',
                ownerName: 'Ahmet Bey'
            });

            if (result.success) {
                return NextResponse.json({
                    success: true,
                    message: 'Welcome email başarıyla gönderildi!',
                    messageId: result.messageId
                });
            } else {
                return NextResponse.json(
                    { error: result.error || 'Email gönderilemedi' },
                    { status: 500 }
                );
            }
        }

        if (!subject) {
            return NextResponse.json(
                { error: 'subject alanı gerekli (standart test için)' },
                { status: 400 }
            );
        }

        const html = `
            <!DOCTYPE html>
            <html lang="tr">
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #f9fafb; margin: 0; padding: 40px 20px; color: #374151; }
                    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); border: 1px solid #e5e7eb; }
                    .header { background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%); padding: 40px; text-align: center; }
                    .header h1 { color: white; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.025em; }
                    .content { padding: 40px; }
                    .content h2 { color: #111827; margin-top: 0; font-size: 20px; font-weight: 600; margin-bottom: 16px; }
                    .content p { color: #4b5563; line-height: 1.75; margin-bottom: 24px; font-size: 16px; }
                    .info-box { background-color: #f3f4f6; border-left: 4px solid #2563EB; padding: 20px; border-radius: 6px; margin: 24px 0; }
                    .info-box p { margin: 0; color: #4b5563; font-size: 14px; }
                    .footer { background: #f9fafb; padding: 32px; text-align: center; border-top: 1px solid #e5e7eb; }
                    .footer p { color: #9ca3af; font-size: 13px; margin: 0; }
                    .footer a { color: #2563EB; text-decoration: none; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>${subject}</h1>
                    </div>
                    <div class="content">
                        <h2>Sayın Kullanıcımız,</h2>
                        <p>Bu e-posta, Tık Profil mail sisteminin yapılandırmasını doğrulamak amacıyla gönderilmiştir. Şu anda sistemimiz üzerinden başarıyla e-posta alabiliyorsunuz.</p>
                        
                        <div class="info-box">
                            <p><strong>Mesaj İçeriği:</strong><br>${message || 'Sistem testi başarıyla tamamlandı.'}</p>
                        </div>

                        <p>Tık Profil olarak işletmenizin dijital süreçlerini en iyi şekilde yönetmeniz için çalışıyoruz. Mail sistemimiz, sipariş bildirimleri, şifre sıfırlama işlemleri ve personel davetleri gibi kritik süreçlerde kullanılmaktadır.</p>
                        
                        <p>Güvenliğiniz bizim için önemlidir. Tüm e-posta gönderimlerimiz SPF, DKIM ve DMARC protokolleri ile şifrelenmekte ve imzalanmaktadır.</p>
                        
                        <p>Sevgi ve Saygılarımızla,<br>Tık Profil Ekibi</p>
                    </div>
                    <div class="footer">
                        <p>© 2024 Tık Profil Teknoloji A.Ş.</p>
                        <p>Bu e-posta otomatik olarak oluşturulmuştur, lütfen yanıtlamayınız.</p>
                        <p><a href="https://tikprofil.com">tikprofil.com</a> | <a href="https://tikprofil.com/privacy">Gizlilik Politikası</a></p>
                    </div>
                </div>
            </body>
            </html>
        `;

        const result = await sendEmail(to, subject, html);

        if (result.success) {
            return NextResponse.json({
                success: true,
                message: 'Email başarıyla gönderildi!',
                messageId: result.messageId
            });
        } else {
            return NextResponse.json(
                { error: result.error || 'Email gönderilemedi' },
                { status: 500 }
            );
        }
    } catch (error) {
        console.error('[API] Test email error:', error);
        return NextResponse.json(
            { error: 'Sunucu hatası' },
            { status: 500 }
        );
    }
}

// GET endpoint for simple test
export async function GET(request: Request) {
    const url = new URL(request.url);
    const to = url.searchParams.get('to');

    if (!to) {
        return NextResponse.json({
            message: 'Test email endpoint',
            usage: 'POST /api/email/test with { to, subject, message }',
            example: { to: 'user@example.com', subject: 'Test', message: 'Merhaba!' }
        });
    }

    // Quick test with email parameter
    const result = await sendEmail(
        to,
        '🧪 Tık Profil Sistem Kontrolü',
        `
            <!DOCTYPE html>
            <html lang="tr">
            <body style="font-family: -apple-system, sans-serif; background-color: #f9fafb; padding: 20px;">
                <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; border: 1px solid #e5e7eb;">
                    <h2 style="color: #2563EB; margin-top: 0;">✅ Email Sistemi Aktif</h2>
                    <p style="color: #4b5563; line-height: 1.6;">Sayın Yetkili,</p>
                    <p style="color: #4b5563; line-height: 1.6;">Bu e-posta, Tık Profil mail sunucularının doğru yapılandırıldığını doğrulamak amacıyla gönderilmiştir. Şu anda SPF, DKIM ve DMARC kayıtlarınız aktif durumdadır.</p>
                    
                    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
                        <p style="margin: 0; color: #374151; font-size: 14px;"><strong>Gönderim Zamanı:</strong> ${new Date().toLocaleString('tr-TR')}</p>
                        <p style="margin: 5px 0 0 0; color: #374151; font-size: 14px;"><strong>Sunucu:</strong> Resend API</p>
                    </div>

                    <p style="color: #4b5563; line-height: 1.6;">Herhangi bir sorunuz olması durumunda teknik ekibimizle iletişime geçebilirsiniz.</p>
                    
                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                    <p style="color: #9ca3af; font-size: 12px; text-align: center;">© 2024 Tık Profil Teknoloji A.Ş. | İzinsiz kopyalanması yasaktır.</p>
                </div>
            </body>
            </html>
        `
    );

    if (result.success) {
        return NextResponse.json({
            success: true,
            message: `Test email ${to} adresine gönderildi!`,
            messageId: result.messageId
        });
    } else {
        return NextResponse.json(
            { error: result.error },
            { status: 500 }
        );
    }
}
