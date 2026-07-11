import { z } from "zod";

import type { CustomerContext } from "../auth/customer-session.ts";
import type { ReservationRepository } from "../repositories/reservation.repository.ts";
import { DISABLED_RESERVATION_OPTIONS } from "./reservation-contract.ts";
import {
    ReservationCanonicalDataError,
    ReservationConflictError,
    ReservationNotFoundError,
    ReservationTerminalStatusError,
} from "./reservation-errors.ts";
import { parseReservationAvailabilityInput, parseReservationCreateInput } from "./reservation-validation.ts";

export {
    ReservationCanonicalDataError,
    ReservationConflictError,
    ReservationNotFoundError,
    ReservationTerminalStatusError,
};

interface BusinessMemberContext {
    businessId: string;
}

interface ReservationHandlerDependencies {
    now?: () => Date;
    repository: ReservationRepository;
    requireBusinessMember: () => Promise<BusinessMemberContext>;
    requireCustomer: () => Promise<CustomerContext>;
}

const idSchema = z.string().trim().min(1).max(200);
const verticalSchema = z.enum(["restaurant", "hotel", "vehicle"]);
const statusSchema = z.enum(["pending", "confirmed", "rejected", "completed", "cancelled"]);
const ownerUpdateSchema = z.object({
    id: idSchema,
    status: statusSchema,
    vertical: verticalSchema,
});

function isCanonicalUnavailable(error: unknown): boolean {
    return Boolean(error && typeof error === "object" && "code" in error
        && (error.code === "42P01" || error.code === "42703"));
}

function errorResponse(error: unknown, context: string): Response {
    if (error && typeof error === "object" && "code" in error) {
        if (error.code === "UNAUTHORIZED") {
            return Response.json({ success: false, code: "UNAUTHORIZED", error: "Customer authentication is required." }, { status: 401 });
        }
        if ("statusCode" in error && typeof error.statusCode === "number") {
            return Response.json({
                success: false,
                code: String(error.code),
                error: error instanceof Error ? error.message : "Reservation request failed.",
            }, { status: error.statusCode });
        }
    }
    if (error instanceof z.ZodError || error instanceof SyntaxError) {
        return Response.json({
            success: false,
            code: "VALIDATION_ERROR",
            error: "Invalid reservation request.",
            details: error instanceof z.ZodError
                ? error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`)
                : undefined,
        }, { status: 400 });
    }
    console.error(`[${context}] Unexpected error:`, error);
    return Response.json({ success: false, code: "SERVER_ERROR", error: "Server error." }, { status: 500 });
}

export function createReservationHandlers(dependencies: ReservationHandlerDependencies) {
    const now = dependencies.now ?? (() => new Date());

    return {
        async getOptions(request: Request): Promise<Response> {
            try {
                const businessSlug = z.string().trim().min(1).max(200).parse(
                    new URL(request.url).searchParams.get("businessSlug"),
                );
                const options = await dependencies.repository.getOptions(businessSlug);
                return Response.json({ success: true, ...options });
            } catch (error) {
                if (isCanonicalUnavailable(error)) {
                    return Response.json({ success: true, ...DISABLED_RESERVATION_OPTIONS });
                }
                return errorResponse(error, "Reservation Options GET");
            }
        },

        async getAvailability(request: Request): Promise<Response> {
            try {
                const input = parseReservationAvailabilityInput(new URL(request.url).searchParams);
                const availability = await dependencies.repository.getAvailability(input);
                return Response.json({ success: true, ...availability });
            } catch (error) {
                return errorResponse(error, "Reservation Availability GET");
            }
        },

        async list(): Promise<Response> {
            try {
                const customer = await dependencies.requireCustomer();
                const reservations = await dependencies.repository.listOwned(customer.appUserId);
                return Response.json({ success: true, reservations });
            } catch (error) {
                if (isCanonicalUnavailable(error)) return Response.json({ success: true, reservations: [] });
                return errorResponse(error, "Reservations GET");
            }
        },

        async create(request: Request): Promise<Response> {
            try {
                const customer = await dependencies.requireCustomer();
                const input = parseReservationCreateInput(await request.json(), now());
                const reservation = await dependencies.repository.createOwned({
                    ...input,
                    appUserId: customer.appUserId,
                    customerEmail: input.customerEmail ?? customer.email,
                    note: input.note ?? null,
                });
                return Response.json({ success: true, reservation }, { status: 201 });
            } catch (error) {
                return errorResponse(error, "Reservations POST");
            }
        },

        async cancel(id: string): Promise<Response> {
            try {
                const customer = await dependencies.requireCustomer();
                const reservation = await dependencies.repository.cancelOwned(customer.appUserId, idSchema.parse(id));
                return Response.json({ success: true, reservation });
            } catch (error) {
                return errorResponse(error, "Reservations DELETE");
            }
        },

        async listBusiness(request: Request): Promise<Response> {
            try {
                const member = await dependencies.requireBusinessMember();
                const searchParams = new URL(request.url).searchParams;
                const vertical = verticalSchema.parse(searchParams.get("vertical"));
                const rawStatus = searchParams.get("status");
                const status = rawStatus ? statusSchema.parse(rawStatus) : null;
                const reservations = await dependencies.repository.listBusiness(vertical, member.businessId, { status });
                return Response.json({ success: true, reservations });
            } catch (error) {
                return errorResponse(error, "Business Reservations GET");
            }
        },

        async updateBusinessStatus(request: Request): Promise<Response> {
            try {
                const member = await dependencies.requireBusinessMember();
                const input = ownerUpdateSchema.parse(await request.json());
                const reservation = await dependencies.repository.updateBusinessStatus(
                    input.vertical,
                    member.businessId,
                    input.id,
                    input.status,
                );
                return Response.json({ success: true, reservation });
            } catch (error) {
                return errorResponse(error, "Business Reservations PATCH");
            }
        },
    };
}
