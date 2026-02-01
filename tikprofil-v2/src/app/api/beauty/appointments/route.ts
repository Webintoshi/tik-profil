
import { NextRequest, NextResponse } from "next/server";
import { getCollectionREST, createDocumentREST, updateDocumentREST, getDocumentREST } from "@/lib/documentStore";
import { createAppointmentSchema, Appointment } from "@/types/beauty";
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const businessId = searchParams.get("businessId");
        const date = searchParams.get("date"); // Optional: Filter by specific date
        const status = searchParams.get("status"); // Optional: Filter by specific status

        if (!businessId) {
            return NextResponse.json({ success: false, error: "Business ID required" }, { status: 400 });
        }

        // Fetch all appointments
        const allAppointments = await getCollectionREST(`beauty_appointments`);

        // Filter in memory
        let appointments = allAppointments.filter((app: any) => app.businessId === businessId);

        if (date) {
            appointments = appointments.filter((app: any) => app.date === date);
        }

        if (status) {
            appointments = appointments.filter((app: any) => app.status === status);
        }

        // Sort by date and time (descending - newest first if no date filter, ascending if date filter)
        appointments.sort((a: any, b: any) => {
            const dateA = new Date(`${a.date}T${a.time}`);
            const dateB = new Date(`${b.date}T${b.time}`);
            return dateB.getTime() - dateA.getTime();
        });

        return NextResponse.json({ success: true, appointments });

    } catch (error) {
        console.error("Error fetching appointments:", error);
        return NextResponse.json({ success: false, error: "Failed to fetch appointments" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { businessId, ...appointmentData } = body;

        if (!businessId) {
            return NextResponse.json({ success: false, error: "Business ID required" }, { status: 400 });
        }

        // Validate basic fields
        const validation = createAppointmentSchema.safeParse(appointmentData);
        if (!validation.success) {
            return NextResponse.json({
                success: false,
                error: validation.error.issues[0].message
            }, { status: 400 });
        }

        const validData = validation.data;

        // Fetch service details to get duration and name
        const service = await getDocumentREST('beauty_services', validData.serviceId);
        if (!service) {
            return NextResponse.json({ success: false, error: "Hizmet bulunamadı" }, { status: 404 });
        }

        // Fetch staff name if not "any"
        let staffName = "Herhangi bir uzman";
        if (validData.staffId && validData.staffId !== "any") {
            const staff = await getDocumentREST('beauty_staff', validData.staffId);
            if (staff && typeof staff.name === 'string') {
                staffName = staff.name;
            }
        }

        // Calculate end time
        const startDateTime = new Date(`${validData.date}T${validData.time}`);
        const serviceDuration = Number(service.duration);
        const endDateTime = new Date(startDateTime.getTime() + serviceDuration * 60000);
        const endTime = endDateTime.toTimeString().slice(0, 5); // HH:mm

        // Check for conflicts
        if (validData.staffId && validData.staffId !== "any") {
            const allApps = await getCollectionREST('beauty_appointments');
            const existingApps = allApps.filter((app: any) =>
                app.businessId === businessId &&
                app.staffId === validData.staffId &&
                app.date === validData.date &&
                ['pending', 'confirmed'].includes(app.status)
            );

            const hasConflict = existingApps.some((app: any) => {
                const appStart = app.time;
                const appEnd = app.endTime;
                // Check overlap: (StartA < EndB) and (EndA > StartB)
                return (validData.time < appEnd) && (endTime > appStart);
            });

            if (hasConflict) {
                return NextResponse.json({
                    success: false,
                    error: "Seçilen uzmanın bu saatte başka bir randevusu var."
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
            staffName: staffName,
            customerName: validData.customerName,
            customerPhone: validData.customerPhone,
            date: validData.date,
            time: validData.time,
            endTime: endTime,
            status: 'pending', // Default status
            note: validData.notes || "",
            createdAt: new Date().toISOString()
        };

        // Save to document store
        await createDocumentREST('beauty_appointments', newAppointment as any, newAppointment.id);

        return NextResponse.json({ success: true, appointment: newAppointment });

    } catch (error) {
        console.error("Error creating appointment:", error);
        return NextResponse.json({ success: false, error: "Failed to create appointment" }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { id, businessId, status, note } = body;

        if (!id || !businessId || !status) {
            return NextResponse.json({ success: false, error: "ID, BusinessID and Status required" }, { status: 400 });
        }

        // Validate status
        const validStatuses = ['pending', 'confirmed', 'cancelled', 'rejected', 'completed'];
        if (!validStatuses.includes(status)) {
            return NextResponse.json({ success: false, error: "Invalid status" }, { status: 400 });
        }

        // Get existing appointment
        const appointment = await getDocumentREST('beauty_appointments', id);
        if (!appointment) {
            return NextResponse.json({ success: false, error: "Appointment not found" }, { status: 404 });
        }

        if (appointment.businessId !== businessId) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
        }

        // Update
        const updates: any = { status };
        if (note !== undefined) updates.note = note;

        await updateDocumentREST('beauty_appointments', id, updates);

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Error updating appointment:", error);
        return NextResponse.json({ success: false, error: "Failed to update appointment" }, { status: 500 });
    }
}
