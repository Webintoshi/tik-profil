import { NextRequest, NextResponse } from "next/server";
import { getDocumentREST, createDocumentREST } from "@/lib/documentStore";
import { DEFAULT_WORKING_HOURS, beautySettingsSchema } from "@/types/beauty";

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const businessId = searchParams.get("businessId");

        if (!businessId) {
            return NextResponse.json({ success: false, error: "Business ID required" }, { status: 400 });
        }

        const settings = await getDocumentREST('beauty_settings', businessId);

        if (!settings) {
            // Return defaults if no settings exist
            const defaultSettings = {
                businessId,
                workingHours: DEFAULT_WORKING_HOURS,
                appointmentSlotMinutes: 30,
                appearance: {
                    cardStyle: 'detailed',
                    showDuration: true,
                    showStaff: false
                }
            };
            return NextResponse.json({ success: true, settings: defaultSettings });
        }

        return NextResponse.json({ success: true, settings });

    } catch (error) {
        console.error("Error fetching settings:", error);
        return NextResponse.json({ success: false, error: "Failed to fetch settings" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { businessId, ...settingsData } = body;

        if (!businessId) {
            return NextResponse.json({ success: false, error: "Business ID required" }, { status: 400 });
        }

        // Validate
        const validation = beautySettingsSchema.safeParse(settingsData);
        if (!validation.success) {
            return NextResponse.json({
                success: false,
                error: validation.error.issues[0].message
            }, { status: 400 });
        }

        const newSettings = {
            businessId,
            ...validation.data,
            appointmentSlotMinutes: validation.data.appointmentSlotMinutes ?? 30
        };

        // Use createDocumentREST to overwrite/upsert settings
        await createDocumentREST('beauty_settings', newSettings, businessId);

        return NextResponse.json({ success: true, settings: newSettings });

    } catch (error) {
        console.error("Error saving settings:", error);
        return NextResponse.json({ success: false, error: "Failed to save settings" }, { status: 500 });
    }
}
