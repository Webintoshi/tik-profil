"use client";

import { FormEvent, useId, useState } from "react";
import {
    AlertCircle,
    Check,
    Eye,
    EyeOff,
    KeyRound,
    LoaderCircle,
    MailCheck,
    ShieldCheck,
} from "lucide-react";

import type { ActivationState } from "@/server/business-imports/account-activation";

interface AccountActivationClientProps {
    businessName: string;
    fontClassName: string;
    initialState: Exclude<ActivationState, "active">;
    verification: "invalid" | null;
}

interface PasswordFieldProps {
    autoComplete: "new-password";
    id: string;
    label: string;
    name: string;
    onChange(value: string): void;
    value: string;
}

function PasswordField({ autoComplete, id, label, name, onChange, value }: PasswordFieldProps) {
    const [visible, setVisible] = useState(false);
    return (
        <div>
            <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-zinc-200">{label}</label>
            <div className="relative">
                <input
                    id={id}
                    name={name}
                    type={visible ? "text" : "password"}
                    autoComplete={autoComplete}
                    minLength={12}
                    maxLength={128}
                    required
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    className="h-11 w-full rounded-md border border-white/10 bg-zinc-950 px-3 pr-11 text-[15px] text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/25"
                />
                <button
                    type="button"
                    aria-label={visible ? `${label} alanini gizle` : `${label} alanini goster`}
                    aria-pressed={visible}
                    title={visible ? "Gizle" : "Göster"}
                    onClick={() => setVisible((current) => !current)}
                    className="absolute right-1 top-1 inline-flex h-9 w-9 items-center justify-center rounded-sm text-zinc-400 outline-none hover:bg-white/5 hover:text-zinc-100 focus:ring-2 focus:ring-amber-400"
                >
                    {visible ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                </button>
            </div>
        </div>
    );
}

function SentState({ businessName }: { businessName: string }) {
    return (
        <div className="border-t-2 border-amber-400 bg-zinc-900 p-6 sm:p-7" aria-live="polite">
            <MailCheck className="h-9 w-9 text-amber-400" aria-hidden="true" />
            <p className="mt-5 text-xs font-semibold uppercase text-amber-400">E-posta gönderildi</p>
            <h1 className="mt-2 text-2xl font-semibold text-zinc-50">Kurtarma adresinizi doğrulayın</h1>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
                {businessName} hesabı için gönderdiğimiz bağlantı 30 dakika boyunca ve yalnızca bir kez geçerlidir.
            </p>
        </div>
    );
}

export default function AccountActivationClient({
    businessName,
    fontClassName,
    initialState,
    verification,
}: AccountActivationClientProps) {
    const passwordId = useId();
    const confirmId = useId();
    const emailId = useId();
    const [state, setState] = useState(initialState);
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [recoveryEmail, setRecoveryEmail] = useState("");
    const [pending, setPending] = useState(false);
    const [error, setError] = useState<string | null>(
        verification === "invalid" ? "Doğrulama bağlantısı geçersiz veya süresi dolmuş." : null,
    );

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (password !== confirmPassword) {
            setError("Şifre alanları eşleşmiyor.");
            return;
        }
        setPending(true);
        setError(null);
        try {
            const response = await fetch("/api/panel/account-activation", {
                body: JSON.stringify({ newPassword: password, recoveryEmail }),
                headers: { "content-type": "application/json" },
                method: "POST",
            });
            const result = await response.json() as { error?: string; state?: ActivationState };
            if (!response.ok || result.state !== "password_changed") {
                if (result.error === "password_invalid") {
                    setError("Şifre güvenlik koşullarını karşılamıyor.");
                } else if (result.error === "recovery_email_invalid") {
                    setError("Geçerli bir kurtarma e-posta adresi girin.");
                } else {
                    setError("İşlem tamamlanamadı. Kısa bir süre sonra yeniden deneyin.");
                }
                return;
            }
            setState("password_changed");
            setPassword("");
            setConfirmPassword("");
        } catch {
            setError("İşlem tamamlanamadı. Kısa bir süre sonra yeniden deneyin.");
        } finally {
            setPending(false);
        }
    }

    return (
        <main className={`${fontClassName} min-h-screen bg-zinc-950 px-4 py-8 text-zinc-100 sm:flex sm:items-center sm:py-12`}>
            <div className="mx-auto w-full max-w-[460px]">
                <header className="mb-5 flex items-center justify-between border-b border-white/10 pb-4">
                    <div className="flex items-center gap-2.5">
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-sm bg-amber-400 text-zinc-950">
                            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <div>
                            <p className="text-sm font-semibold text-zinc-100">Tık Profil</p>
                            <p className="max-w-[280px] truncate text-xs text-zinc-500">{businessName}</p>
                        </div>
                    </div>
                    <span className="text-xs font-medium text-zinc-500">Güvenli aktivasyon</span>
                </header>

                {state === "password_changed" ? <SentState businessName={businessName} /> : (
                    <section className="border-t-2 border-amber-400 bg-zinc-900 p-6 sm:p-7" aria-labelledby="activation-title">
                        <div className="flex h-10 w-10 items-center justify-center rounded-sm border border-amber-400/30 bg-amber-400/10 text-amber-400">
                            <KeyRound className="h-5 w-5" aria-hidden="true" />
                        </div>
                        <p className="mt-5 text-xs font-semibold uppercase text-amber-400">İlk giriş</p>
                        <h1 id="activation-title" className="mt-2 text-2xl font-semibold text-zinc-50">Hesabınızı güvene alın</h1>
                        <p className="mt-2 text-sm leading-6 text-zinc-400">Yeni şifrenizi ve hesap kurtarma adresinizi belirleyin.</p>

                        <form className="mt-6 space-y-4" onSubmit={submit} noValidate>
                            <PasswordField id={passwordId} name="newPassword" label="Yeni şifre" autoComplete="new-password" value={password} onChange={setPassword} />
                            <PasswordField id={confirmId} name="confirmPassword" label="Yeni şifre tekrar" autoComplete="new-password" value={confirmPassword} onChange={setConfirmPassword} />
                            <div>
                                <label htmlFor={emailId} className="mb-1.5 block text-sm font-medium text-zinc-200">Kurtarma e-postası</label>
                                <input
                                    id={emailId}
                                    name="recoveryEmail"
                                    type="email"
                                    inputMode="email"
                                    autoComplete="email"
                                    required
                                    value={recoveryEmail}
                                    onChange={(event) => setRecoveryEmail(event.target.value)}
                                    className="h-11 w-full rounded-md border border-white/10 bg-zinc-950 px-3 text-[15px] text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/25"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-x-3 gap-y-2 border-l-2 border-amber-400/50 pl-3 text-xs text-zinc-400" aria-label="Şifre koşulları">
                                <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-amber-400" />12-128 karakter</span>
                                <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-amber-400" />Büyük ve küçük harf</span>
                                <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-amber-400" />Rakam</span>
                                <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-amber-400" />Sembol</span>
                            </div>

                            <div aria-live="polite" className="min-h-6">
                                {error && <p className="flex items-start gap-2 text-sm text-red-300" role="alert"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{error}</p>}
                            </div>

                            <button
                                type="submit"
                                disabled={pending}
                                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-amber-400 px-4 text-sm font-bold text-zinc-950 outline-none transition-colors hover:bg-amber-300 focus:ring-2 focus:ring-amber-200 focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:cursor-wait disabled:bg-zinc-700 disabled:text-zinc-400"
                            >
                                {pending ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ShieldCheck className="h-4 w-4" aria-hidden="true" />}
                                {pending ? "Güvenli şekilde kaydediliyor" : "Şifreyi değiştir ve e-posta gönder"}
                            </button>
                        </form>
                    </section>
                )}
            </div>
        </main>
    );
}
