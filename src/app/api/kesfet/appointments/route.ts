import { requireCustomer } from "@/server/auth/customer-session";
import { createAppointmentHandlers } from "@/server/appointments/appointment-handlers";
import { appointmentRepository } from "@/server/repositories/appointment.repository";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const handlers = createAppointmentHandlers({ repository: appointmentRepository, requireCustomer });

export async function GET() {
    return handlers.list();
}

export async function POST(request: Request) {
    return handlers.create(request);
}

export async function PATCH(request: Request) {
    return handlers.cancel(request);
}
