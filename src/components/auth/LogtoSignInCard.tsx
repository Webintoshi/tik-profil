"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle, Loader2, Shield, Sparkles } from "lucide-react";
import { normalizeLogtoRedirectPath } from "@/server/auth/logto/helpers";

type LogtoActorHint = "business" | "platform_admin";

const LOGTO_ERROR_MESSAGES: Record<string, string> = {
    logto_access_denied: "Bu hesap icin uygun TIk Profil yetkisi bulunamadi.",
    logto_callback_failed: "Logto girisi tamamlanamadi. Lutfen tekrar deneyin.",
    logto_config_missing: "Logto kurulumu eksik. Lutfen yoneticiyle gorusun.",
    logto_mapping_not_found: "Bu Logto hesabi PostgreSQL uyeligi ile eslesmedi.",
    logto_state_invalid: "Giris istegi dogrulanamadi. Lutfen yeniden deneyin.",
    logto_state_missing: "Giris oturumu zaman asimina ugradi. Lutfen yeniden deneyin.",
};

interface LogtoSignInCardProps {
    actorHint: LogtoActorHint;
    brand: string;
    defaultCallbackPath: string;
    loginPath: string;
    subtitle: string;
    title: string;
}

export function LogtoSignInCard({
    actorHint,
    brand,
    defaultCallbackPath,
    loginPath,
    subtitle,
    title,
}: LogtoSignInCardProps) {
    const searchParams = useSearchParams();
    const [showLogoutToast, setShowLogoutToast] = useState(false);
    const authError = searchParams.get("authError");
    const callbackUrl = normalizeLogtoRedirectPath(
        searchParams.get("callbackUrl"),
        defaultCallbackPath,
    );
    const signInHref = useMemo(() => {
        const params = new URLSearchParams({
            actor: actorHint,
            callbackUrl,
        });

        return `/api/auth/logto/sign-in?${params.toString()}`;
    }, [actorHint, callbackUrl]);

    useEffect(() => {
        if (searchParams.get("logout") === "success") {
            setShowLogoutToast(true);
            window.history.replaceState({}, "", loginPath);
            const timeout = window.setTimeout(() => setShowLogoutToast(false), 3000);
            return () => window.clearTimeout(timeout);
        }

        return undefined;
    }, [loginPath, searchParams]);

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <AnimatePresence>
                {showLogoutToast ? (
                    <motion.div
                        initial={{ opacity: 0, y: -40 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -40 }}
                        className="fixed top-6 left-1/2 -translate-x-1/2 z-50"
                    >
                        <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-white/90 px-5 py-3 shadow-lg backdrop-blur-xl">
                            <CheckCircle className="h-5 w-5 text-green-500" />
                            <span className="text-sm font-medium text-gray-800">Oturum kapatildi</span>
                        </div>
                    </motion.div>
                ) : null}
            </AnimatePresence>

            <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="w-full max-w-md"
            >
                <div className="mb-8 text-center">
                    <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 shadow-lg shadow-sky-500/25">
                        {actorHint === "platform_admin" ? (
                            <Shield className="h-8 w-8 text-white" />
                        ) : (
                            <Sparkles className="h-8 w-8 text-white" />
                        )}
                    </div>
                    <h1 className="text-2xl font-semibold tracking-tight text-gray-900">{brand}</h1>
                    <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
                </div>

                <div className="rounded-3xl border border-white/50 bg-white/75 p-8 shadow-2xl shadow-gray-200/50 backdrop-blur-2xl">
                    <div className="space-y-5">
                        <div className="space-y-2 text-center">
                            <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
                            <p className="text-sm leading-6 text-gray-500">
                                Celebix merkezi Logto hesabi ile guvenli giris yapin.
                            </p>
                        </div>

                        {authError ? (
                            <motion.div
                                initial={{ opacity: 0, y: -8 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3"
                            >
                                <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-red-700">Logto girisi tamamlanamadi</p>
                                    <p className="text-sm text-red-600">
                                        {LOGTO_ERROR_MESSAGES[authError] ?? "Beklenmeyen bir Logto hatasi olustu."}
                                    </p>
                                </div>
                            </motion.div>
                        ) : null}

                        <Link
                            href={signInHref}
                            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-sky-600 to-indigo-600 px-5 py-4 text-base font-semibold text-white shadow-lg shadow-sky-500/25 transition-transform hover:scale-[1.01]"
                        >
                            <Sparkles className="h-5 w-5" />
                            Celebix ile devam et
                        </Link>

                        <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
                            Bu akista rol ve isletme uyeligi PostgreSQL tablolari uzerinden cozulur.
                        </div>
                    </div>
                </div>

                <p className="mt-6 text-center text-xs text-gray-400">
                    Eksik yetki veya eslesme durumunda giris canary modunda guvenli sekilde durdurulur.
                </p>
            </motion.div>
        </div>
    );
}

export function LogtoSignInFallback() {
    return (
        <div className="flex min-h-screen items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
    );
}
