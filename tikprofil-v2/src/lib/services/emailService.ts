// Email Service using Resend
// https://resend.com

import { Resend } from 'resend';

// Lazy-load Resend client (avoids build-time errors if API key is missing)
let resendClient: Resend | null = null;

function getResendClient(): Resend {
    if (!resendClient) {
        const apiKey = process.env.RESEND_API_KEY;
        if (!apiKey) {
            throw new Error('RESEND_API_KEY ortam değişkeni tanımlanmamış');
        }
        resendClient = new Resend(apiKey);
    }
    return resendClient;
}

// Default sender - will need to be verified domain
const DEFAULT_FROM = 'Tık Profil <noreply@tikprofil.com>';

// ============================================
// EMAIL TYPES
// ============================================

export interface EmailResult {
    success: boolean;
    messageId?: string;
    error?: string;
}

export interface WelcomeEmailData {
    to: string;
    businessName: string;
    ownerName: string;
}

export interface StaffInviteEmailData {
    to: string;
    staffName: string;
    businessName: string;
    tempPassword: string;
    loginUrl: string;
}

export interface PasswordResetEmailData {
    to: string;
    name: string;
    resetLink: string;
}

export interface OrderNotificationEmailData {
    to: string;
    businessName: string;
    orderNumber: string;
    customerName: string;
    totalAmount: number;
    items: { name: string; quantity: number; price: number }[];
}

// ============================================
// EMAIL TEMPLATES (HTML)
// ============================================

function getBaseStyles(): string {
    return `
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f4f4f5; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px; text-align: center; }
        .header h1 { color: white; margin: 0; font-size: 28px; }
        .content { padding: 32px; }
        .content h2 { color: #1f2937; margin-top: 0; }
        .content p { color: #4b5563; line-height: 1.6; }
        .button { display: inline-block; background: #10b981; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 16px 0; }
        .button:hover { background: #059669; }
        .footer { background: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb; }
        .footer p { color: #9ca3af; font-size: 14px; margin: 0; }
        .highlight { background: #f0fdf4; padding: 16px; border-radius: 8px; border-left: 4px solid #10b981; margin: 16px 0; }
        .code { font-family: monospace; background: #f3f4f6; padding: 8px 16px; border-radius: 6px; font-size: 18px; letter-spacing: 2px; }
    `;
}

function welcomeEmailTemplate(data: WelcomeEmailData): string {
    return `
    <!DOCTYPE html>
    <html lang="tr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Tık Profil'e Hoş Geldiniz</title>
        <!--[if mso]>
        <style type="text/css">
            body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
        </style>
        <![endif]-->
    </head>
    <body style="margin: 0; padding: 0; background-color: #f5f5f7; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', Helvetica, Arial, sans-serif;">
        
        <!-- Outer Container -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f5f5f7;">
            <tr>
                <td align="center" style="padding: 40px 20px;">
                    
                    <!-- Email Container -->
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 18px; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);">
                        
                        <!-- Logo Section -->
                        <tr>
                            <td align="center" style="padding: 48px 40px 24px 40px;">
                                <!-- Tık Profil Logo -->
                                <table role="presentation" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td align="center">
                                            <div style="width: 56px; height: 56px; background: linear-gradient(145deg, #60A5FA 0%, #2563EB 100%); border-radius: 14px; display: inline-block; box-shadow: 0 8px 24px rgba(37, 99, 235, 0.35);"></div>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td align="center" style="padding-top: 16px;">
                                            <p style="margin: 0; font-size: 24px; font-weight: 700; color: #1d1d1f; letter-spacing: -0.5px;">Tık Profil</p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        
                        <!-- Hero Text -->
                        <tr>
                            <td align="center" style="padding: 0 40px 16px 40px;">
                                <h1 style="margin: 0; font-size: 32px; font-weight: 600; color: #1d1d1f; letter-spacing: -0.5px; line-height: 1.2;">
                                    Hoş Geldiniz
                                </h1>
                            </td>
                        </tr>
                        
                        <!-- Subtitle -->
                        <tr>
                            <td align="center" style="padding: 0 40px 40px 40px;">
                                <p style="margin: 0; font-size: 17px; color: #86868b; line-height: 1.5; font-weight: 400;">
                                    ${data.ownerName}, Tık Profil ailesine katıldığınız için teşekkür ederiz
                                </p>
                            </td>
                        </tr>
                        
                        <!-- Divider -->
                        <tr>
                            <td style="padding: 0 40px;">
                                <div style="height: 1px; background: linear-gradient(90deg, transparent, #e5e5e5, transparent);"></div>
                            </td>
                        </tr>
                        
                        <!-- Business Info Card -->
                        <tr>
                            <td style="padding: 40px;">
                                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background: linear-gradient(135deg, #fafafa 0%, #f5f5f7 100%); border-radius: 12px; border: 1px solid #e8e8ed;">
                                    <tr>
                                        <td style="padding: 24px;">
                                            <p style="margin: 0 0 8px 0; font-size: 13px; color: #86868b; text-transform: uppercase; letter-spacing: 1px; font-weight: 500;">
                                                İşletmeniz
                                            </p>
                                            <p style="margin: 0; font-size: 22px; font-weight: 600; color: #1d1d1f;">
                                                ${data.businessName}
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        
                        <!-- Features Section -->
                        <tr>
                            <td style="padding: 0 40px 40px 40px;">
                                <p style="margin: 0 0 24px 0; font-size: 15px; color: #1d1d1f; font-weight: 500;">
                                    Artık yapabilecekleriniz:
                                </p>
                                
                                <!-- Feature 1 -->
                                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 16px;">
                                    <tr>
                                        <td width="44" valign="top">
                                            <div style="width: 36px; height: 36px; background: #EFF6FF; border-radius: 10px; text-align: center; line-height: 36px; font-size: 18px;">📱</div>
                                        </td>
                                        <td valign="middle" style="padding-left: 12px;">
                                            <p style="margin: 0; font-size: 15px; color: #1d1d1f; font-weight: 500;">QR Menü</p>
                                            <p style="margin: 4px 0 0 0; font-size: 13px; color: #86868b;">Dijital menünüzü anında oluşturun</p>
                                        </td>
                                    </tr>
                                </table>
                                
                                <!-- Feature 2 -->
                                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 16px;">
                                    <tr>
                                        <td width="44" valign="top">
                                            <div style="width: 36px; height: 36px; background: #EFF6FF; border-radius: 10px; text-align: center; line-height: 36px; font-size: 18px;">🪑</div>
                                        </td>
                                        <td valign="middle" style="padding-left: 12px;">
                                            <p style="margin: 0; font-size: 15px; color: #1d1d1f; font-weight: 500;">Masa Yönetimi</p>
                                            <p style="margin: 4px 0 0 0; font-size: 13px; color: #86868b;">Masalarınızı tek ekrandan takip edin</p>
                                        </td>
                                    </tr>
                                </table>
                                
                                <!-- Feature 3 -->
                                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 16px;">
                                    <tr>
                                        <td width="44" valign="top">
                                            <div style="width: 36px; height: 36px; background: #EFF6FF; border-radius: 10px; text-align: center; line-height: 36px; font-size: 18px;">👥</div>
                                        </td>
                                        <td valign="middle" style="padding-left: 12px;">
                                            <p style="margin: 0; font-size: 15px; color: #1d1d1f; font-weight: 500;">Ekip Yönetimi</p>
                                            <p style="margin: 4px 0 0 0; font-size: 13px; color: #86868b;">Personel hesapları ve izinler</p>
                                        </td>
                                    </tr>
                                </table>
                                
                                <!-- Feature 4 -->
                                <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                                    <tr>
                                        <td width="44" valign="top">
                                            <div style="width: 36px; height: 36px; background: #EFF6FF; border-radius: 10px; text-align: center; line-height: 36px; font-size: 18px;">📊</div>
                                        </td>
                                        <td valign="middle" style="padding-left: 12px;">
                                            <p style="margin: 0; font-size: 15px; color: #1d1d1f; font-weight: 500;">Analitik</p>
                                            <p style="margin: 4px 0 0 0; font-size: 13px; color: #86868b;">Detaylı raporlar ve içgörüler</p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        
                        <!-- CTA Button -->
                        <tr>
                            <td align="center" style="padding: 0 40px 48px 40px;">
                                <a href="https://tikprofil.com/panel" style="display: inline-block; background: #0071E3; color: #ffffff; font-size: 17px; font-weight: 500; text-decoration: none; padding: 16px 40px; border-radius: 12px; box-shadow: 0 4px 16px rgba(0, 113, 227, 0.35); letter-spacing: 0.2px;">
                                    Panele Giriş Yap
                                </a>
                            </td>
                        </tr>
                        
                    </table>
                    
                    <!-- Footer -->
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px;">
                        <tr>
                            <td align="center" style="padding: 32px 40px;">
                                <p style="margin: 0 0 8px 0; font-size: 13px; color: #86868b;">
                                    © 2024 Tık Profil. Tüm hakları saklıdır.
                                </p>
                                <p style="margin: 0; font-size: 13px; color: #86868b;">
                                    <a href="https://tikprofil.com" style="color: #0071E3; text-decoration: none;">tikprofil.com</a>
                                </p>
                            </td>
                        </tr>
                    </table>
                    
                </td>
            </tr>
        </table>
        
    </body>
    </html>
    `;
}

function staffInviteEmailTemplate(data: StaffInviteEmailData): string {
    return `
    <!DOCTYPE html>
    <html>
    <head><style>${getBaseStyles()}</style></head>
    <body>
        <div class="container">
            <div class="header">
                <h1>👋 Ekibe Davet Edildiniz!</h1>
            </div>
            <div class="content">
                <h2>Merhaba ${data.staffName}!</h2>
                <p><strong>${data.businessName}</strong> sizi ekibine davet etti. Aşağıdaki bilgilerle sisteme giriş yapabilirsiniz.</p>
                
                <div class="highlight">
                    <p><strong>Giriş Bilgileriniz:</strong></p>
                    <p>Email: <strong>${data.to}</strong></p>
                    <p>Geçici Şifre: <span class="code">${data.tempPassword}</span></p>
                </div>
                
                <p>⚠️ İlk girişinizde şifrenizi değiştirmenizi öneririz.</p>
                
                <a href="${data.loginUrl}" class="button">Giriş Yap →</a>
            </div>
            <div class="footer">
                <p>© 2024 Tık Profil - İşletmenizi Dijitalleştirin</p>
            </div>
        </div>
    </body>
    </html>
    `;
}

function passwordResetEmailTemplate(data: PasswordResetEmailData): string {
    return `
    <!DOCTYPE html>
    <html>
    <head><style>${getBaseStyles()}</style></head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🔐 Şifre Sıfırlama</h1>
            </div>
            <div class="content">
                <h2>Merhaba ${data.name}!</h2>
                <p>Şifrenizi sıfırlamak için aşağıdaki butona tıklayın. Bu bağlantı 1 saat süreyle geçerlidir.</p>
                
                <a href="${data.resetLink}" class="button">Şifremi Sıfırla →</a>
                
                <p style="color: #9ca3af; font-size: 14px;">Bu isteği siz yapmadıysanız, bu emaili görmezden gelebilirsiniz.</p>
            </div>
            <div class="footer">
                <p>© 2024 Tık Profil - İşletmenizi Dijitalleştirin</p>
            </div>
        </div>
    </body>
    </html>
    `;
}

function orderNotificationEmailTemplate(data: OrderNotificationEmailData): string {
    const itemsHtml = data.items.map(item =>
        `<tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${item.name}</td><td style="padding: 8px; text-align: center; border-bottom: 1px solid #e5e7eb;">${item.quantity}</td><td style="padding: 8px; text-align: right; border-bottom: 1px solid #e5e7eb;">₺${item.price.toFixed(2)}</td></tr>`
    ).join('');

    return `
    <!DOCTYPE html>
    <html>
    <head><style>${getBaseStyles()}</style></head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🍽️ Yeni Sipariş!</h1>
            </div>
            <div class="content">
                <h2>${data.businessName}</h2>
                <p>Yeni bir sipariş alındı!</p>
                
                <div class="highlight">
                    <p><strong>Sipariş No:</strong> #${data.orderNumber}</p>
                    <p><strong>Müşteri:</strong> ${data.customerName}</p>
                </div>
                
                <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                    <thead>
                        <tr style="background: #f9fafb;">
                            <th style="padding: 12px 8px; text-align: left;">Ürün</th>
                            <th style="padding: 12px 8px; text-align: center;">Adet</th>
                            <th style="padding: 12px 8px; text-align: right;">Fiyat</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml}
                    </tbody>
                    <tfoot>
                        <tr style="background: #10b981; color: white;">
                            <td colspan="2" style="padding: 12px 8px; font-weight: bold;">TOPLAM</td>
                            <td style="padding: 12px 8px; text-align: right; font-weight: bold;">₺${data.totalAmount.toFixed(2)}</td>
                        </tr>
                    </tfoot>
                </table>
                
                <a href="https://tikprofil.com/panel/orders" class="button">Siparişleri Görüntüle →</a>
            </div>
            <div class="footer">
                <p>© 2024 Tık Profil - İşletmenizi Dijitalleştirin</p>
            </div>
        </div>
    </body>
    </html>
    `;
}

// ============================================
// EMAIL SENDING FUNCTIONS
// ============================================

/**
 * Send welcome email to new business owner
 */
export async function sendWelcomeEmail(data: WelcomeEmailData): Promise<EmailResult> {
    try {
        const result = await getResendClient().emails.send({
            from: DEFAULT_FROM,
            to: data.to,
            subject: `🎉 Hoş Geldiniz ${data.ownerName}! - Tık Profil`,
            html: welcomeEmailTemplate(data),
        });

        if (result.error) {
            console.error('[Email] Welcome email error:', result.error);
            return { success: false, error: result.error.message };
        }
        return { success: true, messageId: result.data?.id };
    } catch (error) {
        console.error('[Email] Welcome email exception:', error);
        return { success: false, error: String(error) };
    }
}

/**
 * Send staff invitation email
 */
export async function sendStaffInviteEmail(data: StaffInviteEmailData): Promise<EmailResult> {
    try {
        const result = await getResendClient().emails.send({
            from: DEFAULT_FROM,
            to: data.to,
            subject: `👋 ${data.businessName} Sizi Ekibe Davet Etti!`,
            html: staffInviteEmailTemplate(data),
        });

        if (result.error) {
            console.error('[Email] Staff invite error:', result.error);
            return { success: false, error: result.error.message };
        }
        return { success: true, messageId: result.data?.id };
    } catch (error) {
        console.error('[Email] Staff invite exception:', error);
        return { success: false, error: String(error) };
    }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(data: PasswordResetEmailData): Promise<EmailResult> {
    try {
        const result = await getResendClient().emails.send({
            from: DEFAULT_FROM,
            to: data.to,
            subject: '🔐 Şifre Sıfırlama - Tık Profil',
            html: passwordResetEmailTemplate(data),
        });

        if (result.error) {
            console.error('[Email] Password reset error:', result.error);
            return { success: false, error: result.error.message };
        }
        return { success: true, messageId: result.data?.id };
    } catch (error) {
        console.error('[Email] Password reset exception:', error);
        return { success: false, error: String(error) };
    }
}

/**
 * Send order notification email
 */
export async function sendOrderNotificationEmail(data: OrderNotificationEmailData): Promise<EmailResult> {
    try {
        const result = await getResendClient().emails.send({
            from: DEFAULT_FROM,
            to: data.to,
            subject: `🍽️ Yeni Sipariş #${data.orderNumber} - ${data.businessName}`,
            html: orderNotificationEmailTemplate(data),
        });

        if (result.error) {
            console.error('[Email] Order notification error:', result.error);
            return { success: false, error: result.error.message };
        }
        return { success: true, messageId: result.data?.id };
    } catch (error) {
        console.error('[Email] Order notification exception:', error);
        return { success: false, error: String(error) };
    }
}

/**
 * Send a generic email
 */
export async function sendEmail(
    to: string,
    subject: string,
    html: string,
    from?: string
): Promise<EmailResult> {
    try {
        const result = await getResendClient().emails.send({
            from: from || DEFAULT_FROM,
            to,
            subject,
            html,
        });

        if (result.error) {
            console.error('[Email] Send error:', result.error);
            return { success: false, error: result.error.message };
        }
        return { success: true, messageId: result.data?.id };
    } catch (error) {
        console.error('[Email] Send exception:', error);
        return { success: false, error: String(error) };
    }
}
