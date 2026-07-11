export class ListingInquiryNotFoundError extends Error {
    readonly code = "LISTING_INQUIRY_NOT_FOUND";
    readonly statusCode = 404;

    constructor() {
        super("Listing inquiry was not found for this owner.");
        this.name = "ListingInquiryNotFoundError";
    }
}

export class ListingInquiryCanonicalDataError extends Error {
    readonly code = "LISTING_INQUIRY_CANONICAL_DATA_UNAVAILABLE";
    readonly statusCode = 409;

    constructor() {
        super("The selected active listing is unavailable.");
        this.name = "ListingInquiryCanonicalDataError";
    }
}

export class ListingInquiryIdempotencyConflictError extends Error {
    readonly code = "LISTING_INQUIRY_IDEMPOTENCY_CONFLICT";
    readonly statusCode = 409;

    constructor() {
        super("The idempotency key was already used for a different inquiry.");
        this.name = "ListingInquiryIdempotencyConflictError";
    }
}

export class ListingInquiryStatusConflictError extends Error {
    readonly code = "LISTING_INQUIRY_STATUS_CONFLICT";
    readonly statusCode = 409;

    constructor() {
        super("The listing inquiry cannot move to the requested status.");
        this.name = "ListingInquiryStatusConflictError";
    }
}
