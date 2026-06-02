import { NextResponse } from "next/server";
import { sendWelcomeEmail } from "@/lib/services/emailService";
import { AppError } from "@/lib/errors";
import { assertPlatformAdmin } from "@/server/auth/guards";

export async function GET(request: Request) {
    try {
        await assertPlatformAdmin();

        const url = new URL(request.url);
        const to = url.searchParams.get("to");

        if (!to) {
            return NextResponse.json({
                message: "Hos geldin email test endpoint",
                usage: "/api/email/welcome?to=email@example.com&name=Isim&business=Isletme",
            });
        }

        const name = url.searchParams.get("name") || "Degerli Musterimiz";
        const business = url.searchParams.get("business") || "Isletmeniz";

        const result = await sendWelcomeEmail({
            to,
            ownerName: name,
            businessName: business,
        });

        if (!result.success) {
            return NextResponse.json(
                { error: result.error || "Email gonderilemedi" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: `Hos geldin emaili ${to} adresine gonderildi!`,
            messageId: result.messageId,
        });
    } catch (error) {
        return AppError.toResponse(error, "Email Welcome GET");
    }
}
