export class ReservationNotFoundError extends Error {
    readonly code = "RESERVATION_NOT_FOUND";
    readonly statusCode = 404;

    constructor(message = "Reservation was not found for this owner.") {
        super(message);
        this.name = "ReservationNotFoundError";
    }
}

export class ReservationTerminalStatusError extends Error {
    readonly code = "RESERVATION_TERMINAL_STATUS";
    readonly statusCode = 409;

    constructor() {
        super("A terminal reservation cannot be changed.");
        this.name = "ReservationTerminalStatusError";
    }
}

export class ReservationConflictError extends Error {
    readonly code = "RESERVATION_CONFLICT";
    readonly statusCode = 409;

    constructor(message = "The selected resource is no longer available for this range.") {
        super(message);
        this.name = "ReservationConflictError";
    }
}

export class ReservationCanonicalDataError extends Error {
    readonly code = "RESERVATION_CANONICAL_DATA_UNAVAILABLE";
    readonly statusCode = 409;

    constructor(message = "Canonical reservation data is unavailable.") {
        super(message);
        this.name = "ReservationCanonicalDataError";
    }
}
