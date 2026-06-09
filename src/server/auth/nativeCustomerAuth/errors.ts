export class NativeCustomerAuthError extends Error {
    readonly code: string;
    readonly statusCode: number;

    constructor(code: string, message: string, statusCode = 400) {
        super(message);
        this.name = "NativeCustomerAuthError";
        this.code = code;
        this.statusCode = statusCode;
    }
}
