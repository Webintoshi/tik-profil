export class CatalogOrderError extends Error {
    readonly code: string;
    readonly statusCode: number;

    constructor(code: string, message: string, statusCode = 400) {
        super(message);
        this.name = "CatalogOrderError";
        this.code = code;
        this.statusCode = statusCode;
    }
}
export function catalogOrderError(code: string, message: string, statusCode = 400): never {
    throw new CatalogOrderError(code, message, statusCode);
}
