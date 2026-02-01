
import { NextRequest, NextResponse } from "next/server";
import { getCollectionREST, getDocumentREST } from "@/lib/documentStore";
import { DEFAULT_WORKING_HOURS, WorkingHours, DayHours } from "@/types/beauty";

// Helper to get day name for WorkingHours key
function getDayName(dateStr: string): keyof WorkingHours {
    const date = new Date(dateStr);
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[date.getDay()] as keyof WorkingHours;
}

// Helper: Convert "HH:mm" to minutes from midnight
function timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
}

// Helper: Convert minutes from midnight to "HH:mm"
function minutesToTime(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const businessId = searchParams.get("businessId");
        const date = searchParams.get("date"); // YYYY-MM-DD
        const serviceDuration = Number(searchParams.get("serviceDuration") || 30);
        const staffId = searchParams.get("staffId"); // "any" or UUID

        if (!businessId || !date) {
            return NextResponse.json({ success: false, error: "Missing required params" }, { status: 400 });
        }

        // 1. Get Settings (for Working Hours & Slot Interval)
        const settingsDoc = await getDocumentREST('beauty_settings', businessId);
        const workingHours = (settingsDoc?.workingHours as WorkingHours) || DEFAULT_WORKING_HOURS;
        const slotInterval = (settingsDoc?.appointmentSlotMinutes as number) || 30;

        // 2. Check if open on this day
        const dayName = getDayName(date);
        const hours: DayHours = workingHours[dayName];

        if (!hours.isOpen || !hours.open || !hours.close) {
            return NextResponse.json({ success: true, slots: [], message: "Closed on this day" });
        }

        // 3. Generate all potential slots for the day
        const openMins = timeToMinutes(hours.open);
        const closeMins = timeToMinutes(hours.close);
        const potentialSlots: { start: string, end: string, startMins: number, endMins: number }[] = [];

        for (let time = openMins; time + serviceDuration <= closeMins; time += slotInterval) {
            potentialSlots.push({
                start: minutesToTime(time),
                end: minutesToTime(time + serviceDuration),
                startMins: time,
                endMins: time + serviceDuration
            });
        }

        // 4. Fetch Appointments for this date
        const allAppointments = await getCollectionREST('beauty_appointments');
        const activeAppointments = allAppointments.filter((app: any) =>
            app.businessId === businessId &&
            app.date === date &&
            (app.status === 'pending' || app.status === 'confirmed')
        );

        // 5. Fetch Active Staff (active only)
        // Only if staffId is 'any' or not provided
        let relevantStaffIds: string[] = [];
        if (!staffId || staffId === 'any') {
            const allStaff = await getCollectionREST('beauty_staff');
            const staffList = allStaff.filter((s: any) =>
                s.businessId === businessId && s.isActive === true
            );
            relevantStaffIds = staffList.map((s: any) => s.id as string);
        } else {
            relevantStaffIds = [staffId];
        }

        if (relevantStaffIds.length === 0) {
            // No active staff at all? Then no slots.
            return NextResponse.json({ success: true, slots: [], error: "No active staff found" });
        }

        // 6. Filter Slots
        const availableSlots = potentialSlots.filter(slot => {
            // For this slot, check availability
            // We need to find IF there is at least ONE staff member who is free.

            // Calculate which staff are BUSY during this slot
            const busyStaffIds = new Set<string>();

            for (const app of activeAppointments) {
                const appStartMins = timeToMinutes(app.startTime as string);
                const appEndMins = timeToMinutes(app.endTime as string);

                // Check overlap
                // Slot: [Start, End) - typically we treat end as exclusive for continuous slots, but overlap logic:
                // Overlap = (StartA < EndB) and (EndA > StartB)
                const isOverlapping = (slot.startMins < appEndMins) && (slot.endMins > appStartMins);

                if (isOverlapping) {
                    if (app.staffId && app.staffId !== 'any') {
                        busyStaffIds.add(app.staffId as string);
                    } else if (app.staffId === 'any') {
                        // Treat as virtual busy
                        busyStaffIds.add(`virtual_busy_${app.id}`);
                    }
                }
            }

            // Now, check if we have any free staff
            // If specific staff selected:
            if (staffId && staffId !== 'any') {
                return !busyStaffIds.has(staffId);
            }

            // If "any" staff selected:
            const bookedRealStaffCount = relevantStaffIds.filter(id => busyStaffIds.has(id)).length;
            const virtualBusyCount = Array.from(busyStaffIds).filter(id => id.startsWith('virtual_busy_')).length;
            const totalBusy = bookedRealStaffCount + virtualBusyCount;

            // Available = Total - Busy
            return (relevantStaffIds.length - totalBusy) > 0;
        });

        return NextResponse.json({
            success: true,
            slots: availableSlots.map(s => s.start)
        });

    } catch (error) {
        console.error("Error generating availability:", error);
        return NextResponse.json({ success: false, error: "Failed to generate availability" }, { status: 500 });
    }
}
