import { getOptionalEnvValue } from "@/lib/env";
import {
    createNetgsmSmsSender,
    handleLogtoSmsWebhook,
} from "@/server/auth/logto/netgsmSms";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
    return handleLogtoSmsWebhook(request, {
        send: async (input) => createNetgsmSmsSender({
            config: {
                appname: getOptionalEnvValue("NETGSM_OTP_APPNAME"),
                endpoint: getOptionalEnvValue("NETGSM_OTP_ENDPOINT")
                    ?? "https://api.netgsm.com.tr/sms/rest/v2/otp",
                msgheader: getOptionalEnvValue("NETGSM_MSGHEADER") ?? "",
                password: getOptionalEnvValue("NETGSM_PASSWORD") ?? "",
                usercode: getOptionalEnvValue("NETGSM_USERCODE") ?? "",
            },
        })(input),
        webhookSecret: getOptionalEnvValue("LOGTO_SMS_WEBHOOK_SECRET") ?? "",
    });
}
