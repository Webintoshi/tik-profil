export type CustomerPhoneOtpStep = "phone" | "code" | "success";

export interface CustomerPhoneOtpStepCopy {
    action: string;
    body: string;
    title: string;
}

const STEP_COPY: Record<CustomerPhoneOtpStep, CustomerPhoneOtpStepCopy> = {
    code: {
        action: "Girişi tamamla",
        body: "SMS ile gelen 6 haneli kodu gir.",
        title: "Kodu doğrula",
    },
    phone: {
        action: "Kod gönder",
        body: "Cep telefonuna tek kullanımlık giriş kodu göndereceğiz.",
        title: "Telefonla giriş yap",
    },
    success: {
        action: "Devam et",
        body: "Hesabın hazırlandı.",
        title: "Giriş tamamlandı",
    },
};

const ERROR_COPY: Record<string, string> = {
    INVALID_PHONE: "Geçerli bir Türkiye cep telefonu girin.",
    NETGSM_SEND_FAILED: "Giriş kodu gönderilemedi. Lütfen tekrar deneyin.",
    NETGSM_UNCONFIGURED: "Telefonla giriş şu anda hazırlanıyor. Lütfen daha sonra tekrar deneyin.",
    OTP_CODE_INVALID: "6 haneli doğrulama kodunu girin.",
    OTP_INVALID: "Kod hatalı. Tekrar kontrol edin.",
    OTP_NOT_FOUND: "Kodun süresi dolmuş olabilir. Yeni kod isteyin.",
    OTP_RATE_LIMITED: "Çok fazla kod istendi. Lütfen daha sonra tekrar deneyin.",
    OTP_RESEND_COOLDOWN: "Yeni kod istemeden önce biraz bekleyin.",
};

export function getCustomerPhoneOtpStepCopy(step: CustomerPhoneOtpStep): CustomerPhoneOtpStepCopy {
    return STEP_COPY[step];
}

export function getCustomerPhoneOtpErrorMessage(code?: null | string, _fallback?: null | string): string {
    if (code && ERROR_COPY[code]) {
        return ERROR_COPY[code];
    }

    return "İşlem tamamlanamadı. Lütfen tekrar deneyin.";
}
