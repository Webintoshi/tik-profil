import { requireCustomer } from "@/server/auth/guards";
import { createCatalogCheckoutHandlers } from "@/server/catalog/catalog-checkout-handlers";
import { catalogOrderRepository } from "@/server/repositories/catalog-order.repository";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function resolveOptionalCustomer(request: Request) {
    if (!request.headers.get("authorization")) return null;
    return requireCustomer();
}

const handlers = createCatalogCheckoutHandlers({ repository: catalogOrderRepository, resolveOptionalCustomer });

export async function POST(request: Request) {
    return handlers.create(request);
}
