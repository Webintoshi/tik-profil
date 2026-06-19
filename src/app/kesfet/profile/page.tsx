"use client";

import { useEffect, useState } from "react";
import {
    Bell,
    ChevronRight,
    CreditCard,
    Crown,
    Gift,
    HelpCircle,
    Loader2,
    LogOut,
    MapPin,
    Phone,
    Settings,
    Shield,
    Star,
    User,
} from "lucide-react";
import { CustomerPhoneOtpCard } from "@/components/kesfet/CustomerPhoneOtpCard";

interface CustomerAccount {
    actorType: "customer";
    appUserId: string;
    displayName: string;
    email: string;
    phone?: string;
    provider: "google" | "logto" | "native_otp";
    role: "customer";
    wallet?: {
        balance: number;
        points: number;
    };
}

interface AccountResponse {
    data?: CustomerAccount;
    success?: boolean;
}

const MENU_SECTIONS = [
    {
        items: [
            { badge: null, icon: User, label: "Profil Bilgileri" },
            { badge: "Yakında", icon: MapPin, label: "Adreslerim" },
            { badge: null, icon: CreditCard, label: "Ödeme Yöntemlerim" },
            { badge: null, icon: Bell, label: "Bildirim Ayarları" },
        ],
        title: "Hesap",
    },
    {
        items: [
            { badge: "Yakında", badgeColor: "amber", icon: Crown, label: "Tık Profil Prime" },
            { badge: null, icon: Gift, label: "Davet Et, Kazan" },
            { badge: "0", icon: Star, label: "Sadakat Puanları" },
        ],
        title: "Avantajlar",
    },
    {
        items: [
            { badge: null, icon: HelpCircle, label: "Yardım Merkezi" },
            { badge: null, icon: Shield, label: "Gizlilik ve Güvenlik" },
            { badge: null, icon: Settings, label: "Uygulama Ayarları" },
        ],
        title: "Destek",
    },
];

async function fetchCustomerAccount(): Promise<CustomerAccount | null> {
    const response = await fetch("/api/account", {
        credentials: "include",
    });

    if (response.status === 401) {
        return null;
    }

    const payload = await response.json() as AccountResponse;
    if (!response.ok || !payload.success || !payload.data) {
        throw new Error("Profil bilgileri alınamadı.");
    }

    return payload.data;
}

function getInitial(account: CustomerAccount): string {
    const value = account.displayName || account.phone || account.email || "T";

    return value.trim().charAt(0).toLocaleUpperCase("tr-TR") || "T";
}

function getDisplayName(account: CustomerAccount): string {
    if (account.displayName && account.displayName !== account.phone) {
        return account.displayName;
    }

    return account.phone || account.email || "Tık Profil kullanıcısı";
}

function formatProvider(provider: CustomerAccount["provider"]): string {
    if (provider === "native_otp") {
        return "Telefon";
    }

    if (provider === "google") {
        return "Google";
    }

    return "Logto";
}

export default function ProfilePage() {
    const [account, setAccount] = useState<CustomerAccount | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    async function loadAccount() {
        setIsLoading(true);
        setErrorMessage(null);

        try {
            setAccount(await fetchCustomerAccount());
        } catch {
            setErrorMessage("Profil şu anda yüklenemedi. Lütfen tekrar deneyin.");
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        let isMounted = true;

        async function loadInitialAccount() {
            try {
                const nextAccount = await fetchCustomerAccount();
                if (isMounted) {
                    setAccount(nextAccount);
                }
            } catch {
                if (isMounted) {
                    setErrorMessage("Profil şu anda yüklenemedi. Lütfen tekrar deneyin.");
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        }

        void loadInitialAccount();

        return () => {
            isMounted = false;
        };
    }, []);

    async function handleLogout() {
        setIsLoggingOut(true);

        try {
            const response = await fetch("/api/auth/logout", {
                body: JSON.stringify({ postLogoutRedirect: "/kesfet/profile" }),
                credentials: "include",
                headers: {
                    "content-type": "application/json",
                },
                method: "POST",
            });
            const payload = await response.json().catch(() => null) as { redirectUrl?: null | string } | null;

            setAccount(null);

            if (payload?.redirectUrl) {
                window.location.href = payload.redirectUrl;
                return;
            }

            await loadAccount();
        } finally {
            setIsLoggingOut(false);
        }
    }

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#F3F6F4]">
                <div className="flex items-center gap-3 rounded-3xl bg-white px-5 py-4 text-sm font-black text-slate-700 shadow-xl shadow-slate-200">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Profil hazırlanıyor
                </div>
            </div>
        );
    }

    if (!account) {
        return (
            <div className="min-h-screen bg-[#F3F6F4] px-4 py-6 pb-28">
                <div className="mx-auto max-w-md">
                    <header className="mb-5">
                        <h1 className="text-3xl font-black tracking-tight text-slate-950">
                            Profil
                        </h1>
                        <p className="mt-2 text-base font-medium text-slate-600">
                            Tık Profil'i kullanmak için telefon numaranla giriş yap veya yeni hesap oluştur.
                        </p>
                    </header>

                    {errorMessage && (
                        <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                            {errorMessage}
                        </div>
                    )}

                    <CustomerPhoneOtpCard onAuthenticated={loadAccount} />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-28 transition-colors duration-300">
            <header className="bg-white px-4 py-6">
                <div className="relative overflow-hidden rounded-3xl border border-gray-100 bg-gradient-to-br from-gray-50 to-white p-5 shadow-lg">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-2xl font-black text-white ring-4 ring-emerald-100">
                                {getInitial(account)}
                            </div>
                            <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white">
                                <Crown className="h-3.5 w-3.5" />
                            </div>
                        </div>
                        <div className="flex-1">
                            <h2 className="text-xl font-bold text-gray-900">
                                {getDisplayName(account)}
                            </h2>
                            <p className="text-sm text-gray-500">
                                {account.phone || account.email || "Telefonla giriş yapıldı"}
                            </p>
                            <div className="mt-2 flex items-center gap-2">
                                <span className="rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                                    {formatProvider(account.provider)} girişi
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-5 flex items-center justify-around border-t border-gray-100 pt-5">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-gray-900">0</div>
                            <div className="text-xs text-gray-500">Sipariş</div>
                        </div>
                        <div className="h-8 w-px bg-gray-200" />
                        <div className="text-center">
                            <div className="text-2xl font-bold text-gray-900">0</div>
                            <div className="text-xs text-gray-500">Favori</div>
                        </div>
                        <div className="h-8 w-px bg-gray-200" />
                        <div className="text-center">
                            <div className="text-2xl font-bold text-amber-500">
                                {(account.wallet?.points ?? 0).toLocaleString("tr-TR")}
                            </div>
                            <div className="text-xs text-gray-500">Puan</div>
                        </div>
                    </div>
                </div>
            </header>

            <div className="space-y-4 px-4">
                {MENU_SECTIONS.map((section) => (
                    <div key={section.title}>
                        <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
                            {section.title}
                        </h3>
                        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                            {section.items.map((item, index) => {
                                const Icon = item.icon;

                                return (
                                    <button
                                        className={`flex w-full items-center gap-3 p-4 transition-colors hover:bg-gray-50 ${index !== section.items.length - 1 ? "border-b border-gray-100" : ""}`}
                                        key={item.label}
                                        type="button"
                                    >
                                        <div className="rounded-xl bg-gray-100 p-2">
                                            <Icon className="h-5 w-5 text-gray-600" />
                                        </div>
                                        <span className="flex-1 text-left font-medium text-gray-900">
                                            {item.label}
                                        </span>
                                        {item.badge && (
                                            <span className={`rounded-full px-2 py-1 text-xs font-semibold ${item.badgeColor === "amber"
                                                ? "bg-amber-500/20 text-amber-600"
                                                : "bg-gray-100 text-gray-600"
                                                }`}>
                                                {item.badge}
                                            </span>
                                        )}
                                        <ChevronRight className="h-5 w-5 text-gray-400" />
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}

                <div className="rounded-2xl border border-gray-100 bg-white p-4 text-sm font-medium text-gray-600 shadow-sm">
                    <div className="flex items-center gap-2 font-bold text-gray-900">
                        <Phone className="h-4 w-4 text-emerald-600" />
                        Müşteri hesabı
                    </div>
                    <p className="mt-2">
                        Bu oturum yalnızca müşteri profilin içindir. İşletme paneli, personel ve yönetici yetkisi vermez.
                    </p>
                </div>

                <button
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-50 p-4 font-semibold text-red-500 transition-colors hover:bg-red-100 disabled:opacity-60"
                    disabled={isLoggingOut}
                    onClick={handleLogout}
                    type="button"
                >
                    {isLoggingOut ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                        <LogOut className="h-5 w-5" />
                    )}
                    Çıkış Yap
                </button>

                <p className="text-center text-xs text-gray-400">
                    TikProfil v2.0.0 • Keşfet PWA
                </p>
            </div>
        </div>
    );
}
