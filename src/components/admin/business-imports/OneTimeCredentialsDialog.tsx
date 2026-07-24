"use client";

import { Check, Clipboard, KeyRound, LoaderCircle, ShieldAlert, X } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import type { ImmediateBusinessCredential } from "@/server/business-imports/provisioning";

import {
    CredentialDeliveryHttpError,
    createCredentialDeliveryAction,
    selectPostRemovalFocusTarget,
} from "./business-import-ui-state";

interface OneTimeCredentialsDialogProps {
    credentials: readonly ImmediateBusinessCredential[];
    notice: string | null;
    onCredentialRemoved: (deliveryGeneration: string, notice: string) => void;
    onClose: () => void;
}

const CREDENTIAL_ERROR_MESSAGES: Record<number, string> = {
    401: "Oturumunuz sona erdi. Yeniden giriş yapın.",
    403: "Bu işlem için platform yöneticisi yetkisi gerekiyor.",
    404: "İşletme hesabı bulunamadı.",
    429: "Çok fazla istek gönderildi. Kısa süre sonra yeniden deneyin.",
    502: "Hesap hizmeti geçici olarak yanıt vermiyor.",
};

export function OneTimeCredentialsDialog({ credentials, notice, onCredentialRemoved, onClose }: OneTimeCredentialsDialogProps) {
    const dialogRef = useRef<HTMLDivElement>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const onCloseRef = useRef(onClose);
    const deliveryButtonRefs = useRef(new Map<string, HTMLButtonElement>());
    const previousGenerationsRef = useRef(credentials.map((credential) => credential.deliveryGeneration));
    const pendingRemovedGenerationRef = useRef<string | null>(null);
    const [copiedKey, setCopiedKey] = useState<string | null>(null);
    const [acknowledging, setAcknowledging] = useState<string | null>(null);
    const [errorByGeneration, setErrorByGeneration] = useState<Record<string, string>>({});

    onCloseRef.current = onClose;

    const deliverCredential = useMemo(() => createCredentialDeliveryAction<ImmediateBusinessCredential>({
        request: async (credential) => {
            const response = await fetch(
                `/api/admin/businesses/${encodeURIComponent(credential.businessId)}/credentials/acknowledge`,
                {
                    method: "POST",
                    cache: "no-store",
                    credentials: "same-origin",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ deliveryGeneration: credential.deliveryGeneration }),
                },
            );
            return response.status;
        },
        onRemove: (deliveryGeneration, nextNotice) => {
            pendingRemovedGenerationRef.current = deliveryGeneration;
            onCredentialRemoved(deliveryGeneration, nextNotice);
        },
    }), [onCredentialRemoved]);

    useLayoutEffect(() => {
        const previous = previousGenerationsRef.current;
        const current = credentials.map((credential) => credential.deliveryGeneration);
        const removed = pendingRemovedGenerationRef.current;
        previousGenerationsRef.current = current;

        if (!removed || current.includes(removed)) return;
        pendingRemovedGenerationRef.current = null;
        deliveryButtonRefs.current.delete(removed);
        const targetGeneration = selectPostRemovalFocusTarget(previous, current, removed);
        const target = targetGeneration
            ? deliveryButtonRefs.current.get(targetGeneration)
            : closeButtonRef.current;
        (target ?? closeButtonRef.current)?.focus();
    }, [credentials]);

    useEffect(() => {
        const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        closeButtonRef.current?.focus();

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                event.preventDefault();
                onCloseRef.current();
                return;
            }
            if (event.key === "Tab") {
                const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
                    "button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])",
                );
                if (!focusable?.length) return;
                const first = focusable[0];
                const last = focusable[focusable.length - 1];
                if (event.shiftKey && document.activeElement === first) {
                    event.preventDefault();
                    last.focus();
                } else if (!event.shiftKey && document.activeElement === last) {
                    event.preventDefault();
                    first.focus();
                }
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            if (previouslyFocused) previouslyFocused.focus();
        };
    }, []);

    const copyValue = async (key: string, value: string) => {
        try {
            await navigator.clipboard.writeText(value);
            setCopiedKey(key);
            window.setTimeout(() => setCopiedKey((current) => current === key ? null : current), 1600);
        } catch {
            setCopiedKey(null);
        }
    };

    async function acknowledgeCredential(credential: ImmediateBusinessCredential) {
        setAcknowledging(credential.deliveryGeneration);
        setErrorByGeneration((current) => ({ ...current, [credential.deliveryGeneration]: "" }));
        try {
            await deliverCredential(credential);
        } catch (error) {
            const message = error instanceof CredentialDeliveryHttpError
                ? CREDENTIAL_ERROR_MESSAGES[error.status] ?? "Teslimat onayı tamamlanamadı."
                : "Teslimat onayı tamamlanamadı.";
            setErrorByGeneration((current) => ({
                ...current,
                [credential.deliveryGeneration]: message,
            }));
        } finally {
            setAcknowledging(null);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose();
        }}>
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="credential-dialog-title"
                aria-describedby="credential-dialog-description"
                className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-md border border-white/10 bg-zinc-950 shadow-2xl sm:rounded-md"
            >
                <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-white/10 bg-zinc-950/95 px-4 py-4 backdrop-blur sm:px-5">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 text-amber-400">
                            <KeyRound className="h-4 w-4 shrink-0" aria-hidden="true" />
                            <p className="text-[11px] font-semibold uppercase">Yalnızca bu oturumda görünür</p>
                        </div>
                        <h2 id="credential-dialog-title" className="mt-1 text-lg font-semibold text-zinc-100">Tek kullanımlık işletme giriş bilgileri</h2>
                        <p id="credential-dialog-description" className="mt-1 max-w-2xl text-sm leading-5 text-zinc-400">
                            Bilgileri güvenli kanaldan işletme sahibine iletin. Pencere kapatıldığında kalan düz metin bilgiler silinir.
                        </p>
                    </div>
                    <button ref={closeButtonRef} type="button" onClick={onClose} aria-label="Giriş bilgileri penceresini kapat" className="grid h-9 w-9 shrink-0 place-items-center rounded-sm text-zinc-400 outline-none hover:bg-white/5 hover:text-zinc-100 focus:ring-2 focus:ring-amber-400">
                        <X className="h-5 w-5" aria-hidden="true" />
                    </button>
                </header>

                <div className="border-b border-amber-400/20 bg-amber-400/5 px-4 py-3 sm:px-5">
                    <p className="flex items-start gap-2 text-sm text-amber-100">
                        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
                        <span><strong>Logto hesabı teslimat onaylanana kadar askıda kalır.</strong> Yalnızca bilgileri gerçekten teslim ettikten sonra ilgili satırda “Teslim edildi” seçin.</span>
                    </p>
                </div>

                {notice && (
                    <p className="border-b border-white/10 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200 sm:px-5" role="status" aria-live="polite">
                        {notice}
                    </p>
                )}

                <div className="divide-y divide-white/10" aria-live="polite">
                    {credentials.map((credential) => {
                        const loginCopyKey = `${credential.deliveryGeneration}-login`;
                        const passwordCopyKey = `${credential.deliveryGeneration}-password`;
                        const isAcknowledging = acknowledging === credential.deliveryGeneration;
                        return (
                            <section key={credential.deliveryGeneration} className="px-4 py-5 sm:px-5" aria-labelledby={`credential-${credential.deliveryGeneration}`}>
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                    <h3 id={`credential-${credential.deliveryGeneration}`} className="font-semibold text-zinc-100">{credential.businessName}</h3>
                                    <span className="text-xs text-zinc-500">İşletme: {credential.businessId}</span>
                                </div>

                                <dl className="mt-4 grid gap-3 md:grid-cols-2">
                                    <div className="min-w-0 border-l-2 border-zinc-700 pl-3">
                                        <dt className="text-[11px] font-medium uppercase text-zinc-500">Giriş adresi</dt>
                                        <dd className="mt-1 flex min-w-0 items-center justify-between gap-2">
                                            <code className="truncate text-sm text-zinc-200">{credential.loginEmail}</code>
                                            <button type="button" onClick={() => void copyValue(loginCopyKey, credential.loginEmail)} aria-label={`${credential.businessName} giriş adresini kopyala`} className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-sm px-2 text-xs font-semibold text-zinc-300 outline-none hover:bg-white/5 focus:ring-2 focus:ring-amber-400">
                                                {copiedKey === loginCopyKey ? <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" /> : <Clipboard className="h-3.5 w-3.5" aria-hidden="true" />}
                                                Giriş adresini kopyala
                                            </button>
                                        </dd>
                                    </div>
                                    <div className="min-w-0 border-l-2 border-amber-500 pl-3">
                                        <dt className="text-[11px] font-medium uppercase text-zinc-500">İlk şifre</dt>
                                        <dd className="mt-1 flex min-w-0 items-center justify-between gap-2">
                                            <code className="truncate text-sm text-amber-100">{credential.initialPassword}</code>
                                            <button type="button" onClick={() => void copyValue(passwordCopyKey, credential.initialPassword)} aria-label={`${credential.businessName} şifresini kopyala`} className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-sm px-2 text-xs font-semibold text-zinc-300 outline-none hover:bg-white/5 focus:ring-2 focus:ring-amber-400">
                                                {copiedKey === passwordCopyKey ? <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" /> : <Clipboard className="h-3.5 w-3.5" aria-hidden="true" />}
                                                Şifreyi kopyala
                                            </button>
                                        </dd>
                                    </div>
                                </dl>

                                {errorByGeneration[credential.deliveryGeneration] && (
                                    <p className="mt-3 text-sm text-red-300" role="alert">{errorByGeneration[credential.deliveryGeneration]}</p>
                                )}

                                <div className="mt-4 flex justify-end">
                                    <button
                                        ref={(element) => {
                                            if (element) deliveryButtonRefs.current.set(credential.deliveryGeneration, element);
                                            else deliveryButtonRefs.current.delete(credential.deliveryGeneration);
                                        }}
                                        type="button"
                                        disabled={isAcknowledging}
                                        onClick={() => void acknowledgeCredential(credential)}
                                        aria-label={`${credential.businessName} giriş bilgilerini teslim edildi olarak işaretle`}
                                        className="inline-flex h-9 items-center gap-2 rounded-sm bg-amber-400 px-3 text-xs font-bold text-zinc-950 outline-none hover:bg-amber-300 focus:ring-2 focus:ring-amber-200 focus:ring-offset-2 focus:ring-offset-zinc-950 disabled:opacity-50"
                                    >
                                        {isAcknowledging ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}
                                        Teslim edildi
                                    </button>
                                </div>
                            </section>
                        );
                    })}
                    {credentials.length === 0 && (
                        <p className="px-4 py-8 text-center text-sm text-zinc-400 sm:px-5">
                            Gösterilecek aktif giriş bilgisi kalmadı.
                        </p>
                    )}
                </div>

                <footer className="sticky bottom-0 flex justify-end border-t border-white/10 bg-zinc-950/95 px-4 py-3 backdrop-blur sm:px-5">
                    <button type="button" onClick={onClose} className="h-9 rounded-sm border border-white/10 px-3 text-xs font-semibold text-zinc-300 outline-none hover:bg-white/5 focus:ring-2 focus:ring-amber-400">
                        Kapat ve kalan bilgileri sil
                    </button>
                </footer>
            </div>
        </div>
    );
}
