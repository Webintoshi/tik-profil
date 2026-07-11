import { requireBusinessMember, requireCustomer } from "@/server/auth/guards";
import { createListingInquiryHandlers } from "@/server/listings/listing-inquiry-handlers";
import { listingInquiryRepository } from "@/server/repositories/listing-inquiry.repository";

export const dynamic = "force-dynamic";

const handlers = createListingInquiryHandlers({
    repository: listingInquiryRepository,
    requireBusinessMember,
    requireCustomer,
});

export async function PATCH(
    _request: Request,
    context: { params: Promise<{ id: string }> },
) {
    const { id } = await context.params;
    return handlers.cancel(id);
}
