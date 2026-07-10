import { z } from "zod";

import type { CustomerContext } from "../../../server/auth/customer-session.ts";
import type {
    CustomerProfileInput,
    CustomerRepository,
} from "../../../server/repositories/customer.repository.ts";

interface CustomerHandlerDependencies {
    repository: Pick<
        CustomerRepository,
        | "addFavorite"
        | "deleteFavorite"
        | "getProfile"
        | "listAddresses"
        | "listFavorites"
        | "listOrders"
        | "listReservations"
        | "saveProfileWithAddresses"
    >;
    requireCustomer: () => Promise<CustomerContext>;
}

const nullableText = z.string().trim().max(500).nullable().optional();

function isCalendarDate(value: string): boolean {
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(0);
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCFullYear(year, month - 1, day);
    return date.getUTCFullYear() === year
        && date.getUTCMonth() === month - 1
        && date.getUTCDate() === day;
}

const birthDateSchema = z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine(isCalendarDate, "Birth date must be a real calendar date");
const addressSchema = z.object({
    city: z.string().trim().min(1).max(100),
    district: z.string().trim().min(1).max(100),
    fullAddress: z.string().trim().min(1).max(1000),
    id: z.string().uuid().optional(),
    isDefault: z.boolean().optional().default(false),
    label: z.string().trim().min(1).max(50),
    latitude: z.number().min(-90).max(90).nullable().optional().default(null),
    longitude: z.number().min(-180).max(180).nullable().optional().default(null),
});
const profileSchema = z.object({
    addresses: z.array(addressSchema).max(20).optional(),
    avatarUrl: z.string().trim().url().max(2000).nullable().optional(),
    birthDate: birthDateSchema.nullable().optional(),
    displayName: z.string().trim().min(1).max(200).nullable().optional(),
    hobbies: z.array(z.string().trim().min(1).max(100)).max(50).optional(),
    maritalStatus: nullableText,
    occupation: nullableText,
    phone: z.string().trim().max(30).nullable().optional(),
    preferences: z.record(z.string(), z.unknown()).optional(),
});
const favoriteSchema = z.object({
    businessSlug: z.string().trim().min(1).max(200),
});

function errorResponse(error: unknown, context: string): Response {
    if (error && typeof error === "object" && "code" in error && error.code === "UNAUTHORIZED") {
        return Response.json({
            success: false,
            code: "UNAUTHORIZED",
            error: "Customer authentication is required.",
        }, { status: 401 });
    }

    if (error && typeof error === "object" && "code" in error && "statusCode" in error) {
        const code = error.code;
        const statusCode = error.statusCode;
        if (
            typeof code === "string"
            && (statusCode === 404 || statusCode === 409)
            && (code === "CUSTOMER_RESOURCE_NOT_FOUND" || code === "CUSTOMER_RESOURCE_CONFLICT")
        ) {
            return Response.json({
                success: false,
                code,
                error: statusCode === 404 ? "Customer resource not found." : "Customer resource conflict.",
            }, { status: statusCode });
        }
    }

    if (error instanceof z.ZodError || error instanceof SyntaxError) {
        return Response.json({
            success: false,
            code: "VALIDATION_ERROR",
            error: "Invalid customer request.",
            details: error instanceof z.ZodError
                ? error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`)
                : undefined,
        }, { status: 400 });
    }

    console.error(`[${context}] Unexpected error:`, error);
    return Response.json({
        success: false,
        code: "SERVER_ERROR",
        error: "Server error.",
    }, { status: 500 });
}

function profileInputFrom(
    current: Awaited<ReturnType<CustomerRepository["getProfile"]>>,
    update: z.infer<typeof profileSchema>,
): CustomerProfileInput {
    return {
        avatarUrl: update.avatarUrl === undefined ? current?.avatarUrl ?? null : update.avatarUrl,
        birthDate: update.birthDate === undefined ? current?.birthDate ?? null : update.birthDate,
        displayName: update.displayName === undefined ? current?.displayName ?? null : update.displayName,
        hobbies: update.hobbies ?? current?.hobbies ?? [],
        maritalStatus: update.maritalStatus === undefined ? current?.maritalStatus ?? null : update.maritalStatus,
        occupation: update.occupation === undefined ? current?.occupation ?? null : update.occupation,
        phone: update.phone === undefined ? current?.phone ?? null : update.phone,
        preferences: update.preferences ?? current?.preferences ?? {},
    };
}

export function createCustomerHandlers(dependencies: CustomerHandlerDependencies) {
    return {
        async getProfile(): Promise<Response> {
            try {
                const customer = await dependencies.requireCustomer();
                const [profile, addresses] = await Promise.all([
                    dependencies.repository.getProfile(customer.appUserId),
                    dependencies.repository.listAddresses(customer.appUserId),
                ]);
                return Response.json({ success: true, profile, email: customer.email, addresses });
            } catch (error) {
                return errorResponse(error, "Customer Profile GET");
            }
        },

        async putProfile(request: Request): Promise<Response> {
            try {
                const customer = await dependencies.requireCustomer();
                const update = profileSchema.parse(await request.json());
                const current = await dependencies.repository.getProfile(customer.appUserId);
                const result = await dependencies.repository.saveProfileWithAddresses(
                    customer.appUserId,
                    profileInputFrom(current, update),
                    update.addresses ?? [],
                );
                return Response.json({
                    success: true,
                    profile: result.profile,
                    email: customer.email,
                    addresses: result.addresses,
                });
            } catch (error) {
                return errorResponse(error, "Customer Profile PUT");
            }
        },

        async getFavorites(): Promise<Response> {
            try {
                const customer = await dependencies.requireCustomer();
                const favorites = await dependencies.repository.listFavorites(customer.appUserId);
                return Response.json({ success: true, favorites });
            } catch (error) {
                return errorResponse(error, "Customer Favorites GET");
            }
        },

        async postFavorite(request: Request): Promise<Response> {
            try {
                const customer = await dependencies.requireCustomer();
                const input = favoriteSchema.parse(await request.json());
                const favorite = await dependencies.repository.addFavorite(
                    customer.appUserId,
                    input.businessSlug,
                );
                return Response.json({ success: true, favorite });
            } catch (error) {
                return errorResponse(error, "Customer Favorites POST");
            }
        },

        async deleteFavorite(request: Request): Promise<Response> {
            try {
                const customer = await dependencies.requireCustomer();
                const input = favoriteSchema.parse({
                    businessSlug: new URL(request.url).searchParams.get("businessSlug"),
                });
                const deleted = await dependencies.repository.deleteFavorite(
                    customer.appUserId,
                    input.businessSlug,
                );
                return Response.json({ success: true, deleted });
            } catch (error) {
                return errorResponse(error, "Customer Favorites DELETE");
            }
        },

        async getOrders(): Promise<Response> {
            try {
                const customer = await dependencies.requireCustomer();
                const orders = await dependencies.repository.listOrders(customer.appUserId);
                return Response.json({ success: true, orders });
            } catch (error) {
                return errorResponse(error, "Customer Orders GET");
            }
        },

        async getReservations(): Promise<Response> {
            try {
                const customer = await dependencies.requireCustomer();
                const reservations = await dependencies.repository.listReservations(customer.appUserId);
                return Response.json({ success: true, reservations });
            } catch (error) {
                return errorResponse(error, "Customer Reservations GET");
            }
        },
    };
}
