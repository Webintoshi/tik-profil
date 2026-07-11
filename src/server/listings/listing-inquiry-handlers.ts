import { z } from "zod";

import type { CustomerContext } from "../auth/customer-session.ts";
import type { ListingInquiryRepository } from "../repositories/listing-inquiry.repository.ts";
import { DISABLED_LISTING_OPTIONS } from "./listing-inquiry-contract.ts";
import {
    ListingInquiryCanonicalDataError,
    ListingInquiryIdempotencyConflictError,
    ListingInquiryNotFoundError,
    ListingInquiryStatusConflictError,
} from "./listing-inquiry-errors.ts";
import {
    inquiryIdSchema,
    inquiryStatusSchema,
    parseListingInquiryCreateInput,
    parseListingInquiryOwnerUpdate,
} from "./listing-inquiry-validation.ts";

export {
    ListingInquiryCanonicalDataError,
    ListingInquiryIdempotencyConflictError,
    ListingInquiryNotFoundError,
    ListingInquiryStatusConflictError,
};

interface ListingInquiryHandlerDependencies {
    repository: ListingInquiryRepository;
    requireBusinessMember: () => Promise<{ businessId: string }>;
    requireCustomer: () => Promise<CustomerContext>;
}

function isCanonicalUnavailable(error: unknown): boolean {
    return Boolean(error && typeof error === "object" && "code" in error
        && (error.code === "42P01" || error.code === "42703"));
}

function errorResponse(error: unknown, context: string): Response {
    if (error && typeof error === "object" && "code" in error) {
        if (error.code === "UNAUTHORIZED") {
            return Response.json({
                success: false, code: "UNAUTHORIZED", error: "Customer authentication is required.",
            }, { status: 401 });
        }
        if ("statusCode" in error && typeof error.statusCode === "number") {
            return Response.json({
                success: false,
                code: String(error.code),
                error: error instanceof Error ? error.message : "Listing inquiry request failed.",
            }, { status: error.statusCode });
        }
    }
    if (error instanceof z.ZodError || error instanceof SyntaxError) {
        return Response.json({
            success: false,
            code: "VALIDATION_ERROR",
            error: "Invalid listing inquiry request.",
            details: error instanceof z.ZodError
                ? error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`)
                : undefined,
        }, { status: 400 });
    }
    console.error(`[${context}] Unexpected error:`, error);
    return Response.json({ success: false, code: "SERVER_ERROR", error: "Server error." }, { status: 500 });
}

export function createListingInquiryHandlers(dependencies: ListingInquiryHandlerDependencies) {
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
                    return Response.json({ success: true, ...DISABLED_LISTING_OPTIONS });
                }
                return errorResponse(error, "Listing Options GET");
            }
        },

        async create(request: Request): Promise<Response> {
            try {
                const customer = await dependencies.requireCustomer();
                const input = parseListingInquiryCreateInput(await request.json());
                const inquiry = await dependencies.repository.createOwned({
                    ...input,
                    appUserId: customer.appUserId,
                    customerEmail: customer.email,
                });
                return Response.json({ success: true, inquiry }, { status: 201 });
            } catch (error) {
                return errorResponse(error, "Listing Inquiries POST");
            }
        },

        async cancel(id: string): Promise<Response> {
            try {
                const customer = await dependencies.requireCustomer();
                const inquiry = await dependencies.repository.cancelOwned(
                    customer.appUserId,
                    inquiryIdSchema.parse(id),
                );
                return Response.json({ success: true, inquiry });
            } catch (error) {
                return errorResponse(error, "Listing Inquiries Cancel PATCH");
            }
        },

        async listBusiness(request: Request): Promise<Response> {
            try {
                const member = await dependencies.requireBusinessMember();
                const rawStatus = new URL(request.url).searchParams.get("status");
                const status = rawStatus ? inquiryStatusSchema.parse(rawStatus) : null;
                const inquiries = await dependencies.repository.listBusiness(member.businessId, { status });
                return Response.json({ success: true, inquiries });
            } catch (error) {
                return errorResponse(error, "Business Listing Inquiries GET");
            }
        },

        async updateBusinessStatus(request: Request): Promise<Response> {
            try {
                const member = await dependencies.requireBusinessMember();
                const input = parseListingInquiryOwnerUpdate(await request.json());
                const inquiry = await dependencies.repository.updateBusinessStatus(
                    member.businessId,
                    input.id,
                    input.status,
                );
                return Response.json({ success: true, inquiry });
            } catch (error) {
                return errorResponse(error, "Business Listing Inquiries PATCH");
            }
        },
    };
}
