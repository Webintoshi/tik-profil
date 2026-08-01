import { getOptionalEnvValue } from "@/lib/env";
import { sendEmail } from "@/lib/services/emailService";
import { handleLogtoEmailWebhook } from "@/server/auth/logto/verificationEmail";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
    return handleLogtoEmailWebhook(request, {
        send: async (input) => {
            const result = await sendEmail(
                input.to,
                input.subject,
                input.html,
                getOptionalEnvValue("LOGTO_EMAIL_FROM"),
            );
            if (!result.success) throw new Error("email_delivery_failed");
        },
        webhookSecret: getOptionalEnvValue("LOGTO_EMAIL_WEBHOOK_SECRET") ?? "",
    });
}
