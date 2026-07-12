import { createHash, timingSafeEqual } from "node:crypto";

export type LogtoSmsUsageType = "ForgotPassword" | "Generic" | "Register" | "SignIn";

export interface NetgsmSmsConfig {
    appname?: string;
    endpoint: string;
    msgheader: string;
    password: string;
    usercode: string;
}

export interface SmsDeliveryInput {
    message: string;
    phone: string;
}

interface NetgsmResponse {
    code?: string;
    description?: string;
    jobid?: string;
}

class LogtoSmsError extends Error {
    readonly code: string;
    readonly status: number;

    constructor(
        code: string,
        message: string,
        status: number,
    ) {
        super(message);
        this.name = "LogtoSmsError";
        this.code = code;
        this.status = status;
    }
}

function jsonError(code: string, error: string, status: number): Response {
    return Response.json({ code, error, success: false }, { status });
}

function secureEqual(left: string, right: string): boolean {
    const leftHash = createHash("sha256").update(left).digest();
    const rightHash = createHash("sha256").update(right).digest();
    return timingSafeEqual(leftHash, rightHash);
}

function readBearer(request: Request): string | null {
    const authorization = request.headers.get("authorization");
    if (!authorization?.startsWith("Bearer ")) return null;
    const token = authorization.slice("Bearer ".length).trim();
    return token || null;
}

function isUsageType(value: unknown): value is LogtoSmsUsageType {
    return value === "ForgotPassword"
        || value === "Generic"
        || value === "Register"
        || value === "SignIn";
}

function copyFor(type: LogtoSmsUsageType, code: string): string {
    const action = {
        ForgotPassword: "sifre yenileme",
        Generic: "dogrulama",
        Register: "kayit",
        SignIn: "giris",
    }[type];

    return `Tik Profil ${action} kodunuz: ${code}. Bu kodu kimseyle paylasmayin.`;
}

export function normalizeLogtoTurkishPhone(value: unknown): string {
    if (typeof value !== "string" || !/^\+905\d{9}$/.test(value.trim())) {
        throw new LogtoSmsError(
            "INVALID_PHONE",
            "Gecerli bir Turkiye cep telefonu gerekli.",
            400,
        );
    }

    return value.trim().slice(3);
}

function parsePayload(value: unknown): {
    code: string;
    phone: string;
    type: LogtoSmsUsageType;
} {
    if (!value || typeof value !== "object") {
        throw new LogtoSmsError("INVALID_PAYLOAD", "Gecersiz SMS istegi.", 400);
    }

    const body = value as { payload?: unknown; to?: unknown; type?: unknown };
    const payload = body.payload;
    if (!payload || typeof payload !== "object") {
        throw new LogtoSmsError("INVALID_PAYLOAD", "Gecersiz SMS istegi.", 400);
    }

    const code = (payload as { code?: unknown }).code;
    if (typeof code !== "string" || !/^\d{6}$/.test(code)) {
        throw new LogtoSmsError("INVALID_CODE", "Gecersiz dogrulama kodu.", 400);
    }
    if (!isUsageType(body.type)) {
        throw new LogtoSmsError("INVALID_USAGE", "Desteklenmeyen SMS turu.", 400);
    }

    return {
        code,
        phone: normalizeLogtoTurkishPhone(body.to),
        type: body.type,
    };
}

function validateConfig(config: NetgsmSmsConfig): NetgsmSmsConfig {
    if (
        !config.endpoint.trim()
        || !config.msgheader.trim()
        || !config.password.trim()
        || !config.usercode.trim()
    ) {
        throw new LogtoSmsError(
            "NETGSM_UNCONFIGURED",
            "Netgsm yapilandirmasi eksik.",
            503,
        );
    }

    return {
        ...config,
        appname: config.appname?.trim() || undefined,
        endpoint: config.endpoint.trim(),
        msgheader: config.msgheader.trim(),
        password: config.password.trim(),
        usercode: config.usercode.trim(),
    };
}

export function createNetgsmSmsSender(input: {
    config: NetgsmSmsConfig;
    fetchImpl?: typeof fetch;
}): (delivery: SmsDeliveryInput) => Promise<void> {
    const config = validateConfig(input.config);
    const fetchImpl = input.fetchImpl ?? fetch;

    return async (delivery) => {
        const response = await fetchImpl(config.endpoint, {
            body: JSON.stringify({
                ...(config.appname ? { appname: config.appname } : {}),
                msg: delivery.message,
                msgheader: config.msgheader,
                no: delivery.phone,
            }),
            headers: {
                authorization: `Basic ${Buffer.from(`${config.usercode}:${config.password}`).toString("base64")}`,
                "content-type": "application/json",
            },
            method: "POST",
        });
        const result = await response.json().catch(() => null) as NetgsmResponse | null;

        if (!response.ok || result?.code !== "00") {
            throw new LogtoSmsError(
                "NETGSM_SEND_FAILED",
                "Dogrulama mesaji gonderilemedi.",
                502,
            );
        }
    };
}

export async function handleLogtoSmsWebhook(
    request: Request,
    dependencies: {
        send: (input: SmsDeliveryInput) => Promise<void>;
        webhookSecret: string;
    },
): Promise<Response> {
    if (dependencies.webhookSecret.trim().length < 32) {
        return jsonError("SMS_WEBHOOK_UNCONFIGURED", "SMS servisi yapilandirilmadi.", 503);
    }

    const bearer = readBearer(request);
    if (!bearer || !secureEqual(bearer, dependencies.webhookSecret.trim())) {
        return jsonError("UNAUTHORIZED", "Yetkisiz istek.", 401);
    }

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return jsonError("INVALID_JSON", "Gecersiz SMS istegi.", 400);
    }

    try {
        const parsed = parsePayload(body);
        await dependencies.send({
            message: copyFor(parsed.type, parsed.code),
            phone: parsed.phone,
        });
        return new Response(null, { status: 204 });
    } catch (error) {
        if (error instanceof LogtoSmsError && error.status < 500) {
            return jsonError(error.code, error.message, error.status);
        }
        if (error instanceof LogtoSmsError && error.status === 503) {
            return jsonError(error.code, "SMS servisi yapilandirilmadi.", 503);
        }
        return jsonError(
            "SMS_DELIVERY_FAILED",
            "Dogrulama mesaji gonderilemedi.",
            502,
        );
    }
}
