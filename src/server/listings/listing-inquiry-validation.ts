import { z } from "zod";

export const inquiryIdSchema = z.string().trim().min(1).max(200);
export const inquiryStatusSchema = z.enum(["pending", "contacted", "resolved", "rejected", "cancelled"]);

const createSchema = z.object({
    businessSlug: z.string().trim().min(1).max(200),
    customerName: z.string().trim().min(2).max(120),
    customerPhone: z.string().trim().min(7).max(30),
    idempotencyKey: z.string().trim().min(8).max(128).regex(/^[A-Za-z0-9._:-]+$/),
    listingId: inquiryIdSchema,
    message: z.string().trim().min(1).max(2000),
});

const ownerUpdateSchema = z.object({
    id: inquiryIdSchema,
    status: z.enum(["contacted", "resolved", "rejected"]),
});

export function parseListingInquiryCreateInput(value: unknown) {
    return createSchema.parse(value);
}

export function parseListingInquiryOwnerUpdate(value: unknown) {
    return ownerUpdateSchema.parse(value);
}
