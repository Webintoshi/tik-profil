import { z } from "zod";

import { getAppUrl } from "@/lib/env";
import { loadPanelSession } from "@/lib/panel/session";
import {
    AccountActivationError,
    getAccountActivationIdentity,
    getBusinessAccountActivation,
    isSameOriginActivationRequest,
    startBusinessAccountActivation,
} from "@/server/business-imports/account-activation";

const requestSchema = z.object({
    newPassword: z.string(),
    recoveryEmail: z.string(),
}).strict();

const NO_STORE_HEADERS = {
    "cache-control": "no-store, max-age=0",
    pragma: "no-cache",
    "referrer-policy": "no-referrer",
};

function json(body: Record<string, unknown>, status = 200, extraHeaders: Record<string, string> = {}) {
    return Response.json(body, { status, headers: { ...NO_STORE_HEADERS, ...extraHeaders } });
}

async function requireImportedOwnerIdentity() {
    const session = await loadPanelSession();
    if (
        !session
        || session.role !== "owner"
        || session.isStaff
        || session.authProvider !== "logto"
        || !session.appUserId
        || !session.businessId
        || !session.logtoSub
    ) return null;
    return getAccountActivationIdentity(session);
}

export async function GET() {
    const identity = await requireImportedOwnerIdentity();
    if (!identity) return json({ error: "activation_unavailable" }, 403);
    try {
        const state = await getBusinessAccountActivation(identity);
        if (!state) return json({ error: "activation_unavailable" }, 404);
        return json({ state });
    } catch {
        return json({ error: "activation_unavailable" }, 503);
    }
}

export async function POST(request: Request) {
    const appUrl = getAppUrl();
    if (!appUrl || !isSameOriginActivationRequest(request.headers, appUrl)) {
        return json({ error: "activation_unavailable" }, 403);
    }
    const identity = await requireImportedOwnerIdentity();
    if (!identity) return json({ error: "activation_unavailable" }, 403);

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return json({ error: "invalid_request" }, 400);
    }
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) return json({ error: "invalid_request" }, 400);

    try {
        await startBusinessAccountActivation({
            identity,
            newPassword: parsed.data.newPassword,
            recoveryEmail: parsed.data.recoveryEmail,
        });
        return json({ state: "password_changed" });
    } catch (error) {
        if (error instanceof AccountActivationError) {
            if (error.code === "password_invalid" || error.code === "recovery_email_invalid") {
                return json({ error: error.code }, 400);
            }
            if (error.code === "activation_retry_later") {
                return json({ error: "activation_retry_later" }, 429, { "retry-after": "60" });
            }
        }
        return json({ error: "activation_unavailable" }, 409);
    }
}
