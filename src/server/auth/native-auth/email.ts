import { Resend } from "resend";

import { getResendApiKey, getResendFromEmail } from "../../../lib/env.ts";

export async function sendNativeAuthOtp(input: {
    challengeId: string;
    code: string;
    email: string;
    purpose: "sign_in" | "sign_up";
}): Promise<void> {
    const resend = new Resend(getResendApiKey());
    const action = input.purpose === "sign_up" ? "hesabini olusturmak" : "hesabina girmek";
    const { error } = await resend.emails.send({
        from: getResendFromEmail(),
        to: input.email,
        subject: "Tik Profil dogrulama kodun",
        text: `Tik Profil'de ${action} icin dogrulama kodun: ${input.code}. Kod 10 dakika gecerlidir. Bu istegi sen yapmadiysan bu e-postayi yok say.`,
        html: `
            <div style="background:#f7f7f5;padding:32px 16px;font-family:Arial,sans-serif;color:#171717">
                <div style="max-width:480px;margin:0 auto;background:#fff;border:1px solid #ece9e5;border-radius:16px;padding:32px">
                    <div style="color:#EE534F;font-size:28px;font-weight:800;margin-bottom:24px">Tik Profil</div>
                    <h1 style="font-size:22px;margin:0 0 12px">Dogrulama kodun</h1>
                    <p style="font-size:15px;line-height:1.6;color:#5f5b57;margin:0 0 24px">Tik Profil'de ${action} icin asagidaki kodu kullan.</p>
                    <div style="font-size:36px;font-weight:800;letter-spacing:8px;background:#fff4f3;border-radius:12px;padding:18px;text-align:center;color:#b62f2b">${input.code}</div>
                    <p style="font-size:13px;line-height:1.6;color:#77716c;margin:24px 0 0">Kod 10 dakika gecerlidir ve yalnizca bir kez kullanilabilir. Bu istegi sen yapmadiysan e-postayi yok say.</p>
                </div>
            </div>
        `,
    }, { idempotencyKey: `native-auth/${input.challengeId}` });
    if (error) {
        throw new Error(`Resend delivery failed: ${error.message}`);
    }
}
