import { ArrowRight, CircleAlert, CircleCheck, Store } from "lucide-react";

const ERROR_MESSAGES: Record<string, string> = {
    logto_access_denied: "Bu hesap için işletme paneli erişimi bulunamadı.",
    logto_callback_failed: "Giriş tamamlanamadı. Lütfen yeniden deneyin.",
    logto_config_missing: "Giriş hizmetine şu anda ulaşılamıyor.",
    logto_discovery_failed: "Giriş hizmeti geçici olarak yanıt vermiyor.",
    logto_mapping_not_found: "Bu hesap henüz bir işletme profiliyle eşleşmiyor.",
    logto_state_invalid: "Giriş isteğinin süresi doldu. Lütfen yeniden başlayın.",
    logto_state_missing: "Giriş oturumu bulunamadı. Lütfen yeniden başlayın.",
};

interface BusinessLogtoRecoveryProps {
    authError: string | null;
    loggedOut: boolean;
    retryHref: string;
}

export function BusinessLogtoRecovery({
    authError,
    loggedOut,
    retryHref,
}: BusinessLogtoRecoveryProps) {
    const isError = Boolean(authError);
    const message = authError
        ? ERROR_MESSAGES[authError] ?? "Giriş sırasında beklenmeyen bir sorun oluştu."
        : "Oturumunuz güvenli biçimde kapatıldı.";

    return (
        <section className="w-full rounded-[8px] border border-[#E7DED3] bg-white px-6 py-7 shadow-[0_18px_48px_rgba(33,26,18,0.08)] sm:px-8 sm:py-8">
            <header className="mb-7 flex items-center gap-3 border-b border-[#E7DED3] pb-5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[8px] bg-[#FFB347] text-[#211A12]">
                    <Store aria-hidden="true" className="h-5 w-5" strokeWidth={2.25} />
                </span>
                <div className="min-w-0">
                    <p className="text-[12px] font-semibold uppercase text-[#8A5A17]">Tık Profil</p>
                    <h1 className="text-xl font-semibold text-[#211A12]">İşletme girişine dön</h1>
                </div>
            </header>

            <div className="flex items-start gap-3">
                {isError ? (
                    <CircleAlert aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-[#C93D36]" />
                ) : (
                    <CircleCheck aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-[#5C762B]" />
                )}
                <div>
                    <h2 className="text-base font-semibold text-[#211A12]">
                        {isError ? "Giriş tamamlanamadı" : loggedOut ? "Çıkış yapıldı" : "Girişe devam edin"}
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-[#6F665C]">{message}</p>
                </div>
            </div>

            <a
                href={retryHref}
                className="mt-7 flex h-12 w-full items-center justify-center gap-2 rounded-[8px] bg-[#FFB347] px-5 text-sm font-semibold text-[#211A12] transition-colors hover:bg-[#F6A52F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB347] focus-visible:ring-offset-2 active:bg-[#E99925]"
            >
                Tekrar dene
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </a>
        </section>
    );
}
