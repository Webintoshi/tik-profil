import { NextRequest, NextResponse } from "next/server";
import { createDocumentREST, getDocumentREST } from "@/lib/documentStore";
import { AppError } from "@/lib/errors";
import { DEFAULT_WORKING_HOURS, beautySettingsSchema } from "@/types/beauty";
import { assertBusinessMember } from "@/server/auth/guards";

export async function GET() {
    try {
        const { businessId } = await assertBusinessMember();
        const settings = await getDocumentREST("beauty_settings", businessId);

        if (!settings) {
            return NextResponse.json({
                success: true,
                settings: {
                    businessId,
                    workingHours: DEFAULT_WORKING_HOURS,
                    appointmentSlotMinutes: 30,
                    appearance: {
                        cardStyle: "detailed",
                        showDuration: true,
                        showStaff: false,
                    },
                },
            });
        }

        return NextResponse.json({ success: true, settings });
    } catch (error) {
        return AppError.toResponse(error, "Beauty Settings GET");
    }
}

export async function POST(request: NextRequest) {
    try {
        const { businessId } = await assertBusinessMember();
        const body = await request.json();
        const { businessId: _ignoredBusinessId, ...settingsData } = body;
        const validation = beautySettingsSchema.safeParse(settingsData);

        if (!validation.success) {
            return NextResponse.json({
                success: false,
                error: validation.error.issues[0].message,
            }, { status: 400 });
        }

        const newSettings = {
            businessId,
            ...validation.data,
            appointmentSlotMinutes: validation.data.appointmentSlotMinutes ?? 30,
        };

        await createDocumentREST("beauty_settings", newSettings, businessId);
        return NextResponse.json({ success: true, settings: newSettings });
    } catch (error) {
        return AppError.toResponse(error, "Beauty Settings POST");
    }
}
