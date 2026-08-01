import { createHash, timingSafeEqual } from "node:crypto";

export type LogtoEmailUsageType = "ForgotPassword" | "Generic" | "Register" | "SignIn";

export interface EmailDeliveryInput {
    html: string;
    subject: string;
    to: string;
}

class LogtoEmailError extends Error {
    readonly code: string;
    readonly status: number;

    constructor(code: string, message: string, status: number) {
        super(message);
        this.name = "LogtoEmailError";
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

function isUsageType(value: unknown): value is LogtoEmailUsageType {
    return value === "ForgotPassword"
        || value === "Generic"
        || value === "Register"
        || value === "SignIn";
}

function escapeHtml(value: string): string {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function parsePayload(value: unknown): {
    code: string;
    email: string;
    type: LogtoEmailUsageType;
} {
    if (!value || typeof value !== "object") {
        throw new LogtoEmailError("INVALID_PAYLOAD", "Gecersiz e-posta istegi.", 400);
    }

    const body = value as { payload?: unknown; to?: unknown; type?: unknown };
    const payload = body.payload;
    const email = typeof body.to === "string" ? body.to.trim().toLowerCase() : "";

    if (!payload || typeof payload !== "object") {
        throw new LogtoEmailError("INVALID_PAYLOAD", "Gecersiz e-posta istegi.", 400);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new LogtoEmailError("INVALID_EMAIL", "Gecerli bir e-posta adresi gerekli.", 400);
    }

    const code = (payload as { code?: unknown }).code;
    if (typeof code !== "string" || !/^\d{6}$/.test(code)) {
        throw new LogtoEmailError("INVALID_CODE", "Gecersiz dogrulama kodu.", 400);
    }
    if (!isUsageType(body.type)) {
        throw new LogtoEmailError("INVALID_USAGE", "Desteklenmeyen e-posta turu.", 400);
    }

    return { code, email, type: body.type };
}

function buildEmail(type: LogtoEmailUsageType, code: string): Pick<EmailDeliveryInput, "html" | "subject"> {
    const action = {
        ForgotPassword: "Sifre yenileme",
        Generic: "Dogrulama",
        Register: "Hesap dogrulama",
        SignIn: "Giris dogrulama",
    }[type];
    const safeCode = escapeHtml(code);

    return {
        subject: `Tik Profil - ${action} kodu`,
        html: [
            '<div style="font-family:Arial,sans-serif;color:#211a12;line-height:1.5">',
            `<h2 style="margin:0 0 16px">${escapeHtml(action)}</h2>`,
            "<p>Tik Profil dogrulama kodunuz:</p>",
            `<p style="font-size:28px;font-weight:700;letter-spacing:6px">${safeCode}</p>`,
            "<p>Bu kodu kimseyle paylasmayin.</p>",
            "</div>",
        ].join(""),
    };
}

export async function handleLogtoEmailWebhook(
    request: Request,
    dependencies: {
        send: (input: EmailDeliveryInput) => Promise<void>;
        webhookSecret: string;
    },
): Promise<Response> {
    if (dependencies.webhookSecret.trim().length < 32) {
        return jsonError("EMAIL_WEBHOOK_UNCONFIGURED", "E-posta servisi yapilandirilmadi.", 503);
    }

    const bearer = readBearer(request);
    if (!bearer || !secureEqual(bearer, dependencies.webhookSecret.trim())) {
        return jsonError("UNAUTHORIZED", "Yetkisiz istek.", 401);
    }

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return jsonError("INVALID_JSON", "Gecersiz e-posta istegi.", 400);
    }

    try {
        const parsed = parsePayload(body);
        await dependencies.send({
            ...buildEmail(parsed.type, parsed.code),
            to: parsed.email,
        });
        return Response.json({ success: true });
    } catch (error) {
        if (error instanceof LogtoEmailError && error.status < 500) {
            return jsonError(error.code, error.message, error.status);
        }
        return jsonError("EMAIL_DELIVERY_FAILED", "Dogrulama e-postasi gonderilemedi.", 502);
    }
}
