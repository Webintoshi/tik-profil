"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, MessageSquareText, Phone } from "lucide-react";
import {
    getCustomerPhoneOtpErrorMessage,
    getCustomerPhoneOtpStepCopy,
    type CustomerPhoneOtpStep,
} from "./customerPhoneOtpCopy";

interface CustomerPhoneOtpCardProps {
    className?: string;
    onAuthenticated?: () => void;
    redirectTo?: string;
}

interface OtpApiResponse<TData> {
    code?: string;
    data?: TData;
    error?: string;
    success?: boolean;
}

interface OtpStartData {
    expiresInSeconds: number;
    maskedPhone: string;
    resendAfterSeconds: number;
}

async function readOtpResponse<TData>(response: Response): Promise<OtpApiResponse<TData>> {
    try {
        return await response.json() as OtpApiResponse<TData>;
    } catch {
        return {
            error: "İşlem tamamlanamadı.",
            success: false,
        };
    }
}

export function CustomerPhoneOtpCard({
    className = "",
    onAuthenticated,
    redirectTo,
}: CustomerPhoneOtpCardProps) {
    const router = useRouter();
    const [code, setCode] = useState("");
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [maskedPhone, setMaskedPhone] = useState<string | null>(null);
    const [phone, setPhone] = useState("");
    const [step, setStep] = useState<CustomerPhoneOtpStep>("phone");

    const copy = getCustomerPhoneOtpStepCopy(step);

    async function startOtp() {
        const response = await fetch("/api/auth/customer/otp/start", {
            body: JSON.stringify({ phone }),
            credentials: "include",
            headers: {
                "content-type": "application/json",
            },
            method: "POST",
        });
        const payload = await readOtpResponse<OtpStartData>(response);

        if (!response.ok || !payload.success || !payload.data) {
            throw new Error(getCustomerPhoneOtpErrorMessage(payload.code, payload.error));
        }

        setMaskedPhone(payload.data.maskedPhone);
        setStep("code");
        setCode("");
    }

    async function verifyOtp() {
        const response = await fetch("/api/auth/customer/otp/verify", {
            body: JSON.stringify({ code, phone }),
            credentials: "include",
            headers: {
                "content-type": "application/json",
            },
            method: "POST",
        });
        const payload = await readOtpResponse<unknown>(response);

        if (!response.ok || !payload.success) {
            throw new Error(getCustomerPhoneOtpErrorMessage(payload.code, payload.error));
        }

        setStep("success");
        setErrorMessage(null);
        onAuthenticated?.();
        router.refresh();

        if (redirectTo) {
            router.push(redirectTo);
        }
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setErrorMessage(null);
        setIsSubmitting(true);

        try {
            if (step === "phone") {
                await startOtp();
            } else if (step === "code") {
                await verifyOtp();
            }
        } catch (error) {
            setErrorMessage(error instanceof Error
                ? error.message
                : "İşlem tamamlanamadı. Lütfen tekrar deneyin.");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <section className={`relative overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.12)] ${className}`}>
            <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-emerald-200/60 blur-3xl" />
            <div className="absolute -bottom-20 -left-20 h-52 w-52 rounded-full bg-sky-200/70 blur-3xl" />

            <div className="relative p-6 sm:p-8">
                <div className="mb-6 flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-950/20">
                        {step === "success" ? (
                            <CheckCircle2 className="h-6 w-6" />
                        ) : step === "code" ? (
                            <MessageSquareText className="h-6 w-6" />
                        ) : (
                            <Phone className="h-6 w-6" />
                        )}
                    </div>
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.28em] text-emerald-600">
                            Güvenli giriş
                        </p>
                        <h2 className="text-2xl font-black tracking-tight text-slate-950">
                            {copy.title}
                        </h2>
                    </div>
                </div>

                <p className="mb-6 text-base font-medium leading-relaxed text-slate-600">
                    {step === "code" && maskedPhone
                        ? `${maskedPhone} numarasına gönderilen kodu gir.`
                        : copy.body}
                </p>

                {step === "success" ? (
                    <div className="rounded-3xl bg-emerald-50 p-5 text-emerald-800">
                        <p className="font-bold">Giriş tamamlandı.</p>
                        <p className="mt-1 text-sm font-medium">Profilin hazırlanıyor.</p>
                    </div>
                ) : (
                    <form className="space-y-4" onSubmit={handleSubmit}>
                        {step === "phone" ? (
                            <label className="block">
                                <span className="mb-2 block text-sm font-bold text-slate-700">
                                    Cep telefonu
                                </span>
                                <input
                                    autoComplete="tel"
                                    inputMode="tel"
                                    onChange={(event) => setPhone(event.target.value)}
                                    placeholder="05xx xxx xx xx"
                                    type="tel"
                                    value={phone}
                                    className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-lg font-black tracking-wide text-slate-950 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/15"
                                />
                            </label>
                        ) : (
                            <label className="block">
                                <span className="mb-2 block text-sm font-bold text-slate-700">
                                    SMS kodu
                                </span>
                                <input
                                    autoComplete="one-time-code"
                                    inputMode="numeric"
                                    maxLength={6}
                                    onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                                    placeholder="------"
                                    type="text"
                                    value={code}
                                    className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-center text-2xl font-black tracking-[0.35em] text-slate-950 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/15"
                                />
                            </label>
                        )}

                        {errorMessage && (
                            <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                                {errorMessage}
                            </div>
                        )}

                        <button
                            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-base font-black text-white shadow-xl shadow-slate-950/20 transition hover:-translate-y-0.5 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                            disabled={isSubmitting || (step === "code" && code.length !== 6)}
                            type="submit"
                        >
                            {isSubmitting && <Loader2 className="h-5 w-5 animate-spin" />}
                            {copy.action}
                        </button>

                        {step === "code" && (
                            <button
                                className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                                disabled={isSubmitting}
                                onClick={() => {
                                    setCode("");
                                    setErrorMessage(null);
                                    setStep("phone");
                                }}
                                type="button"
                            >
                                Telefon numarasını değiştir
                            </button>
                        )}
                    </form>
                )}

                <p className="mt-5 text-xs font-semibold leading-relaxed text-slate-500">
                    Tek kullanımlık kod yalnızca müşteri hesabı açar. İşletme, personel ve yönetici girişleri ayrı kalır.
                </p>
            </div>
        </section>
    );
}
