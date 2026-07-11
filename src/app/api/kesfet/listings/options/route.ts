import { requireBusinessMember, requireCustomer } from "@/server/auth/guards";
import { createListingInquiryHandlers } from "@/server/listings/listing-inquiry-handlers";
import { listingInquiryRepository } from "@/server/repositories/listing-inquiry.repository";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const handlers = createListingInquiryHandlers({
    repository: listingInquiryRepository,
    requireBusinessMember,
    requireCustomer,
});

export async function GET(request: Request) {
    return handlers.getOptions(request);
}
