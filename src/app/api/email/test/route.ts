import { NextResponse } from "next/server";
import { sendEmail, sendWelcomeEmail } from "@/lib/services/emailService";
import { AppError } from "@/lib/errors";
import { assertPlatformAdmin } from "@/server/auth/guards";

export async function POST(request: Request) {
    try {
        await assertPlatformAdmin();

        const { to, subject, message, type } = await request.json();

        if (!to) {
            return NextResponse.json(
                { error: "to alani gerekli" },
                { status: 400 }
            );
        }

        if (type === "welcome") {
            const result = await sendWelcomeEmail({
                to,
                businessName: "Tik Profil Demo Isletme",
                ownerName: "Ahmet Bey",
            });

            if (!result.success) {
                return NextResponse.json(
                    { error: result.error || "Email gonderilemedi" },
                    { status: 500 }
                );
            }

            return NextResponse.json({
                success: true,
                message: "Welcome email basariyla gonderildi!",
                messageId: result.messageId,
            });
        }

        if (!subject) {
            return NextResponse.json(
                { error: "subject alani gerekli" },
                { status: 400 }
            );
        }

        const html = `
            <!DOCTYPE html>
            <html lang="tr">
            <head>
                <meta charset="UTF-8">
            </head>
            <body>
                <h1>${subject}</h1>
                <p>${message || "Sistem testi basariyla tamamlandi."}</p>
            </body>
            </html>
        `;

        const result = await sendEmail(to, subject, html);
        if (!result.success) {
            return NextResponse.json(
                { error: result.error || "Email gonderilemedi" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: "Email basariyla gonderildi!",
            messageId: result.messageId,
        });
    } catch (error) {
        return AppError.toResponse(error, "Email Test POST");
    }
}

export async function GET() {
    try {
        await assertPlatformAdmin();

        return NextResponse.json({
            message: "Test email endpoint",
            usage: "POST /api/email/test with { to, subject, message }",
            example: { to: "user@example.com", subject: "Test", message: "Merhaba!" },
            note: "GET mail gonderimi guvenlik nedeniyle devre disi birakildi.",
        });
    } catch (error) {
        return AppError.toResponse(error, "Email Test GET");
    }
}
