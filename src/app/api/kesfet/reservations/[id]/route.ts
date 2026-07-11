import { requireBusinessMember, requireCustomer } from "@/server/auth/guards";
import { reservationRepository } from "@/server/repositories/reservation.repository";
import { createReservationHandlers } from "@/server/reservations/reservation-handlers";

export const dynamic = "force-dynamic";

const handlers = createReservationHandlers({ repository: reservationRepository, requireBusinessMember, requireCustomer });

export async function DELETE(
    _request: Request,
    context: { params: Promise<{ id: string }> },
) {
    const { id } = await context.params;
    return handlers.cancel(id);
}

export async function PATCH(
    _request: Request,
    context: { params: Promise<{ id: string }> },
) {
    const { id } = await context.params;
    return handlers.cancel(id);
}
