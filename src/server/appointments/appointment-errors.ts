export class AppointmentNotFoundError extends Error {
    readonly code = "APPOINTMENT_NOT_FOUND";
    readonly statusCode = 404;

    constructor(message = "Appointment was not found for this customer.") {
        super(message);
        this.name = "AppointmentNotFoundError";
    }
}

export class AppointmentTerminalStatusError extends Error {
    readonly code = "APPOINTMENT_TERMINAL_STATUS";
    readonly statusCode = 409;

    constructor() {
        super("A terminal appointment cannot be cancelled.");
        this.name = "AppointmentTerminalStatusError";
    }
}

export class AppointmentOverlapError extends Error {
    readonly code = "APPOINTMENT_SLOT_CONFLICT";
    readonly statusCode = 409;

    constructor() {
        super("The selected appointment slot is no longer available.");
        this.name = "AppointmentOverlapError";
    }
}

export class AppointmentCanonicalDataError extends Error {
    readonly code = "APPOINTMENT_CANONICAL_DATA_UNAVAILABLE";
    readonly statusCode = 409;

    constructor(message = "Canonical appointment data is unavailable.") {
        super(message);
        this.name = "AppointmentCanonicalDataError";
    }
}
