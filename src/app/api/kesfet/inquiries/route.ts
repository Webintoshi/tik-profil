import { requireBusinessMember, requireCustomer } from "@/server/auth/guards";
import { createListingInquiryHandlers } from "@/server/listings/listing-inquiry-handlers";
import { customerRepository } from "@/server/repositories/customer.repository";
import { listingInquiryRepository } from "@/server/repositories/listing-inquiry.repository";

import { createCustomerHandlers } from "../customer-handlers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const inquiryHandlers = createListingInquiryHandlers({
    repository: listingInquiryRepository,
    requireBusinessMember,
    requireCustomer,
});
const customerHandlers = createCustomerHandlers({ repository: customerRepository, requireCustomer });

export async function GET() {
    return customerHandlers.getInquiries();
}

export async function POST(request: Request) {
    return inquiryHandlers.create(request);
}
