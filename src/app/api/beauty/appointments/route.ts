import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import {
    createDocumentREST,
    getCollectionREST,
    getDocumentREST,
    updateDocumentREST,
} from "@/lib/documentStore";
import { AppError } from "@/lib/errors";
import { Appointment, createAppointmentSchema } from "@/types/beauty";
import {
    assertBusinessMember,
    resolvePublicBusinessContext,
} from "@/server/auth/guards";

export async function GET(request: NextRequest) {
    try {
        const { businessId } = await assertBusinessMember();
        const date = request.nextUrl.searchParams.get("date");
        const status = request.nextUrl.searchParams.get("status");

        const allAppointments = await getCollectionREST("beauty_appointments");
        let appointments = allAppointments.filter((appointment: any) => appointment.businessId === businessId);

        if (date) {
            appointments = appointments.filter((appointment: any) => appointment.date === date);
        }

        if (status) {
            appointments = appointments.filter((appointment: any) => appointment.status === status);
        }

        appointments.sort((a: any, b: any) => {
            const dateA = new Date(`${a.date}T${a.time}`);
            const dateB = new Date(`${b.date}T${b.time}`);
            return dateB.getTime() - dateA.getTime();
        });

        return NextResponse.json({ success: true, appointments });
    } catch (error) {
        return AppError.toResponse(error, "Beauty Appointments GET");
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const businessContext = await resolvePublicBusinessContext({
            businessId: body.businessId,
        });

        if (!businessContext?.businessId) {
            return NextResponse.json({ success: false, error: "Business ID required" }, { status: 400 });
        }
        const businessId = businessContext.businessId;

        const { businessId: _ignoredBusinessId, ...appointmentData } = body;
        const validation = createAppointmentSchema.safeParse(appointmentData);
        if (!validation.success) {
            return NextResponse.json({
                success: false,
                error: validation.error.issues[0].message,
            }, { status: 400 });
        }

        const validData = validation.data;
        const service = await getDocumentREST("beauty_services", validData.serviceId);
        if (!service || service.businessId !== businessId) {
            return NextResponse.json({ success: false, error: "Hizmet bulunamadi" }, { status: 404 });
        }

        let staffName = "Herhangi bir uzman";
        if (validData.staffId && validData.staffId !== "any") {
            const staff = await getDocumentREST("beauty_staff", validData.staffId);
            if (!staff || staff.businessId !== businessId) {
                return NextResponse.json({ success: false, error: "Uzman bulunamadi" }, { status: 404 });
            }

            if (typeof staff.name === "string") {
                staffName = staff.name;
            }
        }

        const startDateTime = new Date(`${validData.date}T${validData.time}`);
        const serviceDuration = Number(service.duration);
        const endDateTime = new Date(startDateTime.getTime() + serviceDuration * 60000);
        const endTime = endDateTime.toTimeString().slice(0, 5);

        if (validData.staffId && validData.staffId !== "any") {
            const allAppointments = await getCollectionREST("beauty_appointments");
            const existingAppointments = allAppointments.filter((appointment: any) =>
                appointment.businessId === businessId &&
                appointment.staffId === validData.staffId &&
                appointment.date === validData.date &&
                ["pending", "confirmed"].includes(appointment.status)
            );

            const hasConflict = existingAppointments.some((appointment: any) => {
                return validData.time < appointment.endTime && endTime > appointment.time;
            });

            if (hasConflict) {
                return NextResponse.json({
                    success: false,
                    error: "Secilen uzmanın bu saatte baska bir randevusu var.",
                }, { status: 409 });
            }
        }

        const newAppointment: Appointment = {
            id: uuidv4(),
            businessId,
            serviceId: validData.serviceId,
            serviceName: String(service.name),
            serviceDuration: Number(service.duration),
            staffId: validData.staffId,
            staffName,
            customerName: validData.customerName,
            customerPhone: validData.customerPhone,
            date: validData.date,
            time: validData.time,
            endTime,
            status: "pending",
            note: validData.notes || "",
            createdAt: new Date().toISOString(),
        };

        await createDocumentREST("beauty_appointments", newAppointment as any, newAppointment.id);
        return NextResponse.json({ success: true, appointment: newAppointment });
    } catch (error) {
        return AppError.toResponse(error, "Beauty Appointments POST");
    }
}

export async function PUT(request: NextRequest) {
    try {
        const { businessId } = await assertBusinessMember();
        const body = await request.json();
        const { id, status, note } = body;

        if (!id || !status) {
            return NextResponse.json({ success: false, error: "ID and status required" }, { status: 400 });
        }

        const validStatuses = ["pending", "confirmed", "cancelled", "rejected", "completed"];
        if (!validStatuses.includes(status)) {
            return NextResponse.json({ success: false, error: "Invalid status" }, { status: 400 });
        }

        const appointment = await getDocumentREST("beauty_appointments", id);
        if (!appointment) {
            return NextResponse.json({ success: false, error: "Appointment not found" }, { status: 404 });
        }

        if (appointment.businessId !== businessId) {
            throw AppError.forbidden("Bu randevuya erisim yetkiniz yok.");
        }

        const updates: Record<string, unknown> = { status };
        if (note !== undefined) {
            updates.note = note;
        }

        await updateDocumentREST("beauty_appointments", id, updates);
        return NextResponse.json({ success: true });
    } catch (error) {
        return AppError.toResponse(error, "Beauty Appointments PUT");
    }
}
