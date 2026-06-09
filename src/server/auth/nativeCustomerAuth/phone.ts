import { NativeCustomerAuthError } from "./errors.ts";

export { NativeCustomerAuthError };

export interface NormalizedTurkishMobilePhone {
    e164: string;
    masked: string;
    netgsmNo: string;
    providerUserId: string;
}

function digitsOnly(value: string): string {
    return value.replace(/\D/g, "");
}

function toLocalMobileDigits(input: string): string | null {
    const digits = digitsOnly(input);

    if (digits.length === 10 && digits.startsWith("5")) {
        return digits;
    }

    if (digits.length === 11 && digits.startsWith("05")) {
        return digits.slice(1);
    }

    if (digits.length === 12 && digits.startsWith("905")) {
        return digits.slice(2);
    }

    return null;
}

export function normalizeTurkishMobilePhone(input: unknown): NormalizedTurkishMobilePhone {
    if (typeof input !== "string") {
        throw new NativeCustomerAuthError("INVALID_PHONE", "Gecerli bir cep telefonu girin.");
    }

    const localMobileDigits = toLocalMobileDigits(input.trim());
    if (!localMobileDigits || !/^5\d{9}$/.test(localMobileDigits)) {
        throw new NativeCustomerAuthError("INVALID_PHONE", "Gecerli bir Turkiye cep telefonu girin.");
    }

    const e164 = `+90${localMobileDigits}`;

    return {
        e164,
        masked: `+90 ${localMobileDigits.slice(0, 3)} *** ** ${localMobileDigits.slice(-2)}`,
        netgsmNo: localMobileDigits,
        providerUserId: `phone:${e164}`,
    };
}
