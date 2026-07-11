import { requireBusinessMember, requireCustomer } from "@/server/auth/guards";
import { reservationRepository } from "@/server/repositories/reservation.repository";
import { createReservationHandlers } from "@/server/reservations/reservation-handlers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const handlers = createReservationHandlers({ repository: reservationRepository, requireBusinessMember, requireCustomer });

export async function GET(request: Request) {
    return handlers.getOptions(request);
}
