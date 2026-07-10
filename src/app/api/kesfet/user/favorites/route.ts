import { requireCustomer } from "@/server/auth/guards";
import { customerRepository } from "@/server/repositories/customer.repository";
import { createCustomerHandlers } from "../../customer-handlers";

export const dynamic = "force-dynamic";

const handlers = createCustomerHandlers({ repository: customerRepository, requireCustomer });

export async function GET() {
    return handlers.getFavorites();
}

export async function POST(request: Request) {
    return handlers.postFavorite(request);
}

export async function DELETE(request: Request) {
    return handlers.deleteFavorite(request);
}
