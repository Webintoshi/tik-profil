import { z } from "zod";

import type { CustomerContext } from "../auth/customer-session.ts";
import type { AppointmentRepository } from "../repositories/appointment.repository.ts";
import { DISABLED_APPOINTMENT_OPTIONS } from "./appointment-contract.ts";
import {
    AppointmentCanonicalDataError,
    AppointmentNotFoundError,
    AppointmentOverlapError,
    AppointmentTerminalStatusError,
} from "./appointment-errors.ts";
import { parseAppointmentCreateInput } from "./appointment-validation.ts";

export {
    AppointmentCanonicalDataError,
    AppointmentNotFoundError,
    AppointmentOverlapError,
    AppointmentTerminalStatusError,
};

interface AppointmentHandlerDependencies {
    now?: () => Date;
    repository: AppointmentRepository;
    requireCustomer: () => Promise<CustomerContext>;
}

const cancelSchema = z.object({
    id: z.string().trim().min(1).max(200),
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
                error: error instanceof Error ? error.message : "Appointment request failed.",
            }, { status: error.statusCode });
        }
    }

    if (error instanceof z.ZodError || error instanceof SyntaxError) {
        return Response.json({
            success: false,
            code: "VALIDATION_ERROR",
            error: "Invalid appointment request.",
            details: error instanceof z.ZodError
                ? error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`)
                : undefined,
        }, { status: 400 });
    }

    console.error(`[${context}] Unexpected error:`, error);
    return Response.json({ success: false, code: "SERVER_ERROR", error: "Server error." }, { status: 500 });
}

export function createAppointmentHandlers(dependencies: AppointmentHandlerDependencies) {
    const now = dependencies.now ?? (() => new Date());

    return {
        async getOptions(request: Request): Promise<Response> {
            try {
                const businessSlug = z.string().trim().min(1).max(200).parse(
                    new URL(request.url).searchParams.get("businessSlug"),
                );
                const options = await dependencies.repository.getOptions(businessSlug, now());
                return Response.json({ success: true, ...options });
            } catch (error) {
                if (isCanonicalUnavailable(error)) {
                    return Response.json({ success: true, ...DISABLED_APPOINTMENT_OPTIONS });
                }
                return errorResponse(error, "Appointment Options GET");
            }
        },

        async list(): Promise<Response> {
            try {
                const customer = await dependencies.requireCustomer();
                const appointments = await dependencies.repository.listOwned(customer.appUserId);
                return Response.json({ success: true, appointments });
            } catch (error) {
                if (isCanonicalUnavailable(error)) {
                    return Response.json({ success: true, appointments: [] });
                }
                return errorResponse(error, "Appointments GET");
            }
        },

        async create(request: Request): Promise<Response> {
            try {
                const customer = await dependencies.requireCustomer();
                const input = parseAppointmentCreateInput(await request.json(), now());
                const appointment = await dependencies.repository.createOwned({
                    ...input,
                    appUserId: customer.appUserId,
                    customerEmail: input.customerEmail ?? customer.email,
                    note: input.note ?? null,
                });
                return Response.json({ success: true, appointment }, { status: 201 });
            } catch (error) {
                return errorResponse(error, "Appointments POST");
            }
        },

        async cancel(request: Request): Promise<Response> {
            try {
                const customer = await dependencies.requireCustomer();
                const { id } = cancelSchema.parse(await request.json());
                const appointment = await dependencies.repository.cancelOwned(customer.appUserId, id);
                return Response.json({ success: true, appointment });
            } catch (error) {
                return errorResponse(error, "Appointments PATCH");
            }
        },
    };
}
