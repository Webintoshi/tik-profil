import { getAppUrl } from "@/lib/env";
import {
    buildActivationVerificationResultUrl,
    verifyBusinessRecoveryEmail,
} from "@/server/business-imports/account-activation";

const RESPONSE_HEADERS = {
    "cache-control": "no-store, max-age=0",
    pragma: "no-cache",
    "referrer-policy": "no-referrer",
};

export async function GET(request: Request) {
    const appUrl = getAppUrl();
    if (!appUrl) {
        return new Response(null, { status: 503, headers: RESPONSE_HEADERS });
    }

    const rawToken = new URL(request.url).searchParams.get("token") ?? "";
    let result: "success" | "invalid" = "invalid";
    try {
        if (await verifyBusinessRecoveryEmail(rawToken)) result = "success";
    } catch {
        result = "invalid";
    }

    return new Response(null, {
        status: 303,
        headers: {
            ...RESPONSE_HEADERS,
            location: buildActivationVerificationResultUrl(appUrl, result),
        },
    });
}
