"use client";

import {
    User, Settings, CreditCard, MapPin, Bell, HelpCircle,
    LogOut, ChevronRight, Shield, Gift, Star, Crown
} from "lucide-react";

const MENU_SECTIONS = [
    {
        title: "Hesap",
        items: [
            { icon: User, label: "Profil Bilgileri", badge: null },
            { icon: MapPin, label: "Adreslerim", badge: "3" },
            { icon: CreditCard, label: "Ödeme Yöntemlerim", badge: null },
            { icon: Bell, label: "Bildirim Ayarları", badge: null },
        ]
    },
    {
        title: "Avantajlar",
        items: [
            { icon: Crown, label: "TikProfil Prime", badge: "PRO", badgeColor: "amber" },
            { icon: Gift, label: "Davet Et, Kazan", badge: null },
            { icon: Star, label: "Sadakat Puanları", badge: "3,450" },
        ]
    },
    {
        title: "Destek",
        items: [
            { icon: HelpCircle, label: "Yardım Merkezi", badge: null },
            { icon: Shield, label: "Gizlilik & Güvenlik", badge: null },
            { icon: Settings, label: "Uygulama Ayarları", badge: null },
        ]
    },
];

export default function ProfilePage() {
    return (
        <div className="min-h-screen bg-gray-50 pb-6 transition-colors duration-300">
            <header className="px-4 py-6 bg-white">
                <div className="relative overflow-hidden rounded-2xl p-5
                               bg-gradient-to-br from-gray-50 to-white border border-gray-100 shadow-lg">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold
                                           bg-gradient-to-br from-emerald-500 to-teal-600 text-white
                                           ring-4 ring-emerald-100">
                                W
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 
                                          flex items-center justify-center text-white">
                                <Crown className="w-3.5 h-3.5" />
                            </div>
                        </div>
                        <div className="flex-1">
                            <h2 className="text-xl font-bold text-gray-900">
                                Webintoshi
                            </h2>
                            <p className="text-sm text-gray-500">
                                webintoshi@tikprofil.com
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider
                                               bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                                    Prime Üye
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-around mt-5 pt-5 border-t border-gray-100">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-gray-900">24</div>
                            <div className="text-xs text-gray-500">Sipariş</div>
                        </div>
                        <div className="w-px h-8 bg-gray-200" />
                        <div className="text-center">
                            <div className="text-2xl font-bold text-gray-900">12</div>
                            <div className="text-xs text-gray-500">Favori</div>
                        </div>
                        <div className="w-px h-8 bg-gray-200" />
                        <div className="text-center">
                            <div className="text-2xl font-bold text-amber-500">3,450</div>
                            <div className="text-xs text-gray-500">Puan</div>
                        </div>
                    </div>
                </div>
            </header>

            <div className="px-4 space-y-4">
                {MENU_SECTIONS.map((section) => (
                    <div key={section.title}>
                        <h3 className="text-xs font-semibold uppercase tracking-wider mb-2 px-1 text-gray-400">
                            {section.title}
                        </h3>
                        <div className="rounded-2xl overflow-hidden
                                        bg-white border border-gray-100 shadow-sm">
                            {section.items.map((item, index) => {
                                const Icon = item.icon;
                                return (
                                    <button
                                        key={item.label}
                                        className={`w-full flex items-center gap-3 p-4 transition-colors
                                                   hover:bg-gray-50
                                                   ${index !== section.items.length - 1
                                                ? `border-b border-gray-100`
                                                : ""}`}
                                    >
                                        <div className="p-2 rounded-xl bg-gray-100">
                                            <Icon className="w-5 h-5 text-gray-600" />
                                        </div>
                                        <span className="flex-1 text-left font-medium text-gray-900">
                                            {item.label}
                                        </span>
                                        {item.badge && (
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold
                                                            ${item.badgeColor === "amber"
                                                    ? "bg-amber-500/20 text-amber-500"
                                                    : "bg-gray-100 text-gray-600"
                                                }`}>
                                                {item.badge}
                                            </span>
                                        )}
                                        <ChevronRight className="w-5 h-5 text-gray-400" />
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}

                <button className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl
                                  text-red-500 font-semibold transition-colors
                                  bg-red-50 hover:bg-red-100">
                    <LogOut className="w-5 h-5" />
                    Çıkış Yap
                </button>

                <p className="text-center text-xs text-gray-400">
                    TikProfil v2.0.0 • Keşfet PWA
                </p>
            </div>
        </div>
    );
}
