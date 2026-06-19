import { getOptionalEnvValue } from "../../../lib/env.ts";
import { NativeCustomerAuthError } from "./errors.ts";
import type { OtpDeliveryProvider } from "./otp.ts";

interface NetgsmOtpResponse {
    code?: string;
    description?: string;
    jobid?: string;
}

function getRequiredNetgsmEnv(name: string): string {
    const value = getOptionalEnvValue(name);
    if (!value) {
        throw new NativeCustomerAuthError(
            "NETGSM_UNCONFIGURED",
            `${name} is required for Netgsm OTP SMS.`,
            503,
        );
    }

    return value;
}

function buildBasicAuth(username: string, password: string): string {
    return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
}

export function createNetgsmOtpDeliveryProvider(input?: {
    endpoint?: string;
    fetchImpl?: typeof fetch;
}): OtpDeliveryProvider {
    const fetchImpl = input?.fetchImpl ?? fetch;

    return {
        async send(sendInput) {
            const usercode = getRequiredNetgsmEnv("NETGSM_USERCODE");
            const password = getRequiredNetgsmEnv("NETGSM_PASSWORD");
            const msgheader = getRequiredNetgsmEnv("NETGSM_MSGHEADER");
            const endpoint = input?.endpoint
                ?? getOptionalEnvValue("NETGSM_OTP_ENDPOINT")
                ?? "https://api.netgsm.com.tr/sms/rest/v2/otp";
            const response = await fetchImpl(endpoint, {
                body: JSON.stringify({
                    appname: getOptionalEnvValue("NETGSM_OTP_APPNAME"),
                    msg: sendInput.message,
                    msgheader,
                    no: sendInput.phone.netgsmNo,
                }),
                headers: {
                    "Authorization": buildBasicAuth(usercode, password),
                    "Content-Type": "application/json",
                },
                method: "POST",
            });
            const payload = await response.json().catch(() => null) as NetgsmOtpResponse | null;

            if (!response.ok || payload?.code !== "00") {
                throw new NativeCustomerAuthError(
                    "NETGSM_SEND_FAILED",
                    payload?.description ?? "Netgsm OTP SMS could not be sent.",
                    response.ok ? 502 : response.status,
                );
            }

            return {
                providerJobId: payload.jobid ?? null,
            };
        },
    };
}
