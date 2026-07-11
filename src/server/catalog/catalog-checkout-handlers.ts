import { randomUUID } from "node:crypto";
import { z } from "zod";

import type { CustomerContext } from "../auth/customer-session.ts";
import type { CatalogOrderRepository } from "../repositories/catalog-order.repository.ts";
import { parseCatalogOrderInput } from "./catalog-order-validation.ts";

interface CatalogCheckoutHandlerDependencies {
    repository: CatalogOrderRepository;
    resolveOptionalCustomer: (request: Request) => Promise<CustomerContext | null>;
}
function checkoutErrorResponse(error: unknown): Response {
    if (error && typeof error === "object" && "code" in error) {
        const status = "statusCode" in error && typeof error.statusCode === "number" ? error.statusCode : 400;
        return Response.json({
            code: String(error.code),
            error: error instanceof Error ? error.message : "Checkout failed.",
            success: false,
        }, { status });
    }
    if (error instanceof z.ZodError || error instanceof SyntaxError) {
        return Response.json({ code: "VALIDATION_ERROR", error: "Invalid checkout request.", success: false }, { status: 400 });
    }
    console.error("[Catalog Checkout] Unexpected error:", error);
    return Response.json({ code: "SERVER_ERROR", error: "Order could not be created.", success: false }, { status: 500 });
}

export function createCatalogCheckoutHandlers(dependencies: CatalogCheckoutHandlerDependencies) {
    return {
        async create(request: Request): Promise<Response> {
            try {
                const customer = await dependencies.resolveOptionalCustomer(request);
                const body = await request.json() as Record<string, unknown>;
                if (!body.idempotencyKey && !customer) body.idempotencyKey = `guest-${randomUUID()}`;
                const input = parseCatalogOrderInput(body);
                const order = await dependencies.repository.create({ ...input, appUserId: customer?.appUserId ?? null });
                return Response.json({
                    orderId: order.id,
                    orderNumber: order.orderNumber,
                    success: true,
                    total: order.total,
                }, { status: order.wasCreated === false ? 200 : 201 });
            } catch (error) {
                return checkoutErrorResponse(error);
            }
        },
    };
}
