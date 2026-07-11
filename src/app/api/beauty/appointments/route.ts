import { NextRequest, NextResponse } from "next/server";

import { AppError } from "@/lib/errors";
import { getSupabaseAdmin } from "@/lib/supabase";
import { assertWithinWorkingHours } from "@/server/appointments/appointment-validation";
import type { AppointmentRecord } from "@/server/appointments/appointment-contract";
import { assertBusinessMember, resolvePublicBusinessContext } from "@/server/auth/guards";
import { appointmentRepository } from "@/server/repositories/appointment.repository";
import { createAppointmentSchema } from "@/types/beauty";

const TABLE = "beauty_appointments";

function dateOnly(value: unknown) {
    return typeof value === "string" ? value.slice(0, 10) : "";
}

function timeOnly(value: unknown) {
    return typeof value === "string" ? value.slice(0, 5) : "";
}

function mapAppointment(row: Record<string, unknown>) {
    const startsAt = new Date(String(row.starts_at ?? ""));
    const endsAt = new Date(String(row.ends_at ?? ""));
    const duration = Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())
        ? 30
        : Math.max(1, Math.round((endsAt.getTime() - startsAt.getTime()) / 60_000));
    return {
        businessId: String(row.business_id ?? ""),
        createdAt: String(row.created_at ?? ""),
        customerName: String(row.customer_name ?? ""),
        customerPhone: String(row.customer_phone ?? ""),
        date: dateOnly(row.date ?? row.starts_at),
        endTime: Number.isNaN(endsAt.getTime()) ? "" : endsAt.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" }),
        id: String(row.id ?? ""),
        note: String(row.notes ?? ""),
        serviceDuration: duration,
        serviceId: String(row.service_id ?? ""),
        serviceName: String(row.service_name ?? ""),
        staffId: String(row.staff_id ?? ""),
        staffName: String(row.staff_name ?? ""),
        status: String(row.status ?? "pending"),
        time: timeOnly(row.time_slot),
    };
}

function mapCanonicalAppointment(appointment: AppointmentRecord) {
    const startsAt = appointment.startsAt ? new Date(appointment.startsAt) : null;
    const endsAt = appointment.endsAt ? new Date(appointment.endsAt) : null;
    const serviceDuration = startsAt && endsAt && !Number.isNaN(startsAt.getTime()) && !Number.isNaN(endsAt.getTime())
        ? Math.max(1, Math.round((endsAt.getTime() - startsAt.getTime()) / 60_000))
        : 0;
    return {
        businessId: appointment.businessId,
        createdAt: appointment.createdAt,
        customerName: appointment.customerName,
        customerPhone: appointment.customerPhone,
        date: appointment.date,
        endTime: endsAt && !Number.isNaN(endsAt.getTime()) ? endsAt.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" }) : "",
        id: appointment.id,
        note: appointment.note ?? "",
        serviceDuration,
        serviceId: appointment.serviceId,
        serviceName: appointment.serviceName,
        staffId: appointment.staffId,
        staffName: appointment.staffName,
        status: appointment.status,
        time: appointment.time,
    };
}

function defaultWorkingHours() {
    return Object.fromEntries(["monday", "tuesday", "wednesday", "thursday", "friday"].map((day) => [
        day,
        { end: "18:00", isOpen: true, start: "09:00" },
    ]));
}

function normalizeWorkingHours(value: unknown) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return defaultWorkingHours();
    return Object.fromEntries(Object.entries(value).flatMap(([day, raw]) => {
        if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
        const record = raw as Record<string, unknown>;
        if (typeof record.start !== "string" || typeof record.end !== "string") return [];
        return [[day, {
            end: record.end,
            isOpen: record.isOpen === true || record.isActive === true,
            start: record.start,
        }]];
    }));
}

export async function GET(request: NextRequest) {
    try {
        const { businessId } = await assertBusinessMember();
        const appointments = (await appointmentRepository.listBusiness("beauty", businessId, {
            date: request.nextUrl.searchParams.get("date"),
            status: request.nextUrl.searchParams.get("status"),
        })).map(mapCanonicalAppointment);
        return NextResponse.json({ success: true, appointments });
    } catch (error) {
        return AppError.toResponse(error, "Beauty Appointments GET");
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const businessContext = await resolvePublicBusinessContext({ businessId: body.businessId });
        if (!businessContext?.businessId) {
            return NextResponse.json({ success: false, error: "Business ID required" }, { status: 400 });
        }
        const { businessId: _ignoredBusinessId, ...appointmentData } = body;
        const validation = createAppointmentSchema.safeParse(appointmentData);
        if (!validation.success) {
            return NextResponse.json({ success: false, error: validation.error.issues[0].message }, { status: 400 });
        }

        const validData = validation.data;
        const supabase = getSupabaseAdmin();
        const [businessResult, serviceResult, settingsResult] = await Promise.all([
            supabase.from("businesses").select("id,name,slug").eq("id", businessContext.businessId).maybeSingle(),
            supabase.from("beauty_services").select("id,business_id,name,price,duration_minutes,is_active")
                .eq("id", validData.serviceId).eq("business_id", businessContext.businessId).eq("is_active", true).maybeSingle(),
            supabase.from("beauty_settings").select("working_hours").eq("business_id", businessContext.businessId).maybeSingle(),
        ]);
        if (businessResult.error || serviceResult.error || settingsResult.error) throw businessResult.error || serviceResult.error || settingsResult.error;
        if (!businessResult.data || !serviceResult.data) {
            return NextResponse.json({ success: false, error: "Hizmet bulunamadı" }, { status: 404 });
        }

        let staffQuery = supabase.from("beauty_staff").select("id,business_id,name,is_active")
            .eq("business_id", businessContext.businessId).eq("is_active", true);
        staffQuery = validData.staffId && validData.staffId !== "any"
            ? staffQuery.eq("id", validData.staffId)
            : staffQuery.order("created_at", { ascending: true }).limit(1);
        const { data: staffRows, error: staffError } = await staffQuery;
        if (staffError) throw staffError;
        const staff = staffRows?.[0];
        if (!staff) return NextResponse.json({ success: false, error: "Uzman bulunamadı" }, { status: 404 });

        const durationMinutes = Math.max(5, Number(serviceResult.data.duration_minutes) || 30);
        assertWithinWorkingHours(validData.date, validData.time, durationMinutes, normalizeWorkingHours(settingsResult.data?.working_hours));
        const startsAt = new Date(`${validData.date}T${validData.time}:00+03:00`);
        const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);
        const { data: inserted, error: insertError } = await supabase.from(TABLE).insert({
            app_user_id: null,
            business_id: businessContext.businessId,
            business_name: businessResult.data.name,
            business_slug: businessResult.data.slug,
            customer_email: null,
            customer_name: validData.customerName,
            customer_phone: validData.customerPhone,
            date: validData.date,
            ends_at: endsAt.toISOString(),
            notes: validData.notes || null,
            service_id: serviceResult.data.id,
            service_name: serviceResult.data.name,
            service_price: Number(serviceResult.data.price) || 0,
            staff_id: staff.id,
            staff_name: staff.name,
            starts_at: startsAt.toISOString(),
            status: "pending",
            time_slot: validData.time,
        }).select("*").single();
        if (insertError) {
            if (insertError.code === "23P01") {
                return NextResponse.json({ success: false, error: "Seçilen uzmanın bu saatte başka bir randevusu var." }, { status: 409 });
            }
            throw insertError;
        }
        return NextResponse.json({ success: true, appointment: mapAppointment(inserted as Record<string, unknown>) });
    } catch (error) {
        return AppError.toResponse(error, "Beauty Appointments POST");
    }
}

export async function PUT(request: NextRequest) {
    try {
        const { businessId } = await assertBusinessMember();
        const body = await request.json();
        const { id, status, note } = body;
        const validStatuses = ["pending", "confirmed", "cancelled", "rejected", "completed"];
        if (!id || !validStatuses.includes(status)) {
            return NextResponse.json({ success: false, error: "Valid ID and status required" }, { status: 400 });
        }
        await appointmentRepository.updateBusinessStatus("beauty", businessId, id, status, note);
        return NextResponse.json({ success: true });
    } catch (error) {
        return AppError.toResponse(error, "Beauty Appointments PUT");
    }
}
