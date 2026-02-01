"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    CheckCircle,
    Loader2,
    ArrowLeft,
    Globe,
} from "lucide-react";
import Link from "next/link";

// Supported languages
type Language = "tr" | "en" | "de" | "ru";

const LANGUAGES: { code: Language; label: string; flag: string }[] = [
    { code: "tr", label: "Türkçe", flag: "🇹🇷" },
    { code: "en", label: "English", flag: "🇬🇧" },
    { code: "de", label: "Deutsch", flag: "🇩🇪" },
    { code: "ru", label: "Русский", flag: "🇷🇺" },
];

// Translations
const TRANSLATIONS: Record<Language, {
    pageTitle: string;
    roomLabel: string;
    helpQuestion: string;
    notePlaceholder: string;
    submitButton: string;
    successTitle: string;
    successMessage: string;
    newRequestButton: string;
    requestTypes: {
        towels: { label: string; desc: string };
        cleaning: { label: string; desc: string };
        toiletries: { label: string; desc: string };
        pillows: { label: string; desc: string };
        maintenance: { label: string; desc: string };
        roomservice: { label: string; desc: string };
        other: { label: string; desc: string };
    };
}> = {
    tr: {
        pageTitle: "Oda Servisi",
        roomLabel: "Oda",
        helpQuestion: "Ne tür bir yardıma ihtiyacınız var?",
        notePlaceholder: "Eklemek istediğiniz bir not var mı? (opsiyonel)",
        submitButton: "Talep Gönder",
        successTitle: "Talebiniz Alındı!",
        successMessage: "Ekibimiz en kısa sürede odanıza gelecektir.",
        newRequestButton: "Yeni Talep Oluştur",
        requestTypes: {
            towels: { label: "Temiz Havlu", desc: "Odanıza temiz havlu gönderilsin" },
            cleaning: { label: "Oda Temizliği", desc: "Odanızın temizlenmesini isteyin" },
            toiletries: { label: "Banyo Malzemesi", desc: "Şampuan, sabun vb." },
            pillows: { label: "Ekstra Yastık", desc: "Ek yastık veya battaniye" },
            maintenance: { label: "Teknik Destek", desc: "Arıza, tamir talebi" },
            roomservice: { label: "Oda Servisi", desc: "Yiyecek-içecek siparişi" },
            other: { label: "Diğer Talepler", desc: "Özel istekleriniz" },
        },
    },
    en: {
        pageTitle: "Room Service",
        roomLabel: "Room",
        helpQuestion: "What kind of help do you need?",
        notePlaceholder: "Any additional notes? (optional)",
        submitButton: "Send Request",
        successTitle: "Request Received!",
        successMessage: "Our team will arrive at your room shortly.",
        newRequestButton: "Create New Request",
        requestTypes: {
            towels: { label: "Fresh Towels", desc: "Get fresh towels delivered" },
            cleaning: { label: "Room Cleaning", desc: "Request room cleaning" },
            toiletries: { label: "Toiletries", desc: "Shampoo, soap, etc." },
            pillows: { label: "Extra Pillows", desc: "Extra pillows or blankets" },
            maintenance: { label: "Maintenance", desc: "Technical support" },
            roomservice: { label: "Room Service", desc: "Food & beverage order" },
            other: { label: "Other Requests", desc: "Special requests" },
        },
    },
    de: {
        pageTitle: "Zimmerservice",
        roomLabel: "Zimmer",
        helpQuestion: "Wie können wir Ihnen helfen?",
        notePlaceholder: "Haben Sie noch Anmerkungen? (optional)",
        submitButton: "Anfrage senden",
        successTitle: "Anfrage erhalten!",
        successMessage: "Unser Team wird in Kürze bei Ihnen sein.",
        newRequestButton: "Neue Anfrage erstellen",
        requestTypes: {
            towels: { label: "Frische Handtücher", desc: "Frische Handtücher liefern" },
            cleaning: { label: "Zimmerreinigung", desc: "Zimmerreinigung anfordern" },
            toiletries: { label: "Toilettenartikel", desc: "Shampoo, Seife usw." },
            pillows: { label: "Extra Kissen", desc: "Zusätzliche Kissen oder Decken" },
            maintenance: { label: "Wartung", desc: "Technische Unterstützung" },
            roomservice: { label: "Zimmerservice", desc: "Speisen & Getränke" },
            other: { label: "Sonstiges", desc: "Besondere Wünsche" },
        },
    },
    ru: {
        pageTitle: "Обслуживание номеров",
        roomLabel: "Номер",
        helpQuestion: "Чем мы можем помочь?",
        notePlaceholder: "Дополнительные пожелания? (необязательно)",
        submitButton: "Отправить запрос",
        successTitle: "Запрос получен!",
        successMessage: "Наша команда скоро будет у вас.",
        newRequestButton: "Новый запрос",
        requestTypes: {
            towels: { label: "Свежие полотенца", desc: "Доставка чистых полотенец" },
            cleaning: { label: "Уборка номера", desc: "Запросить уборку" },
            toiletries: { label: "Туалетные принадлежности", desc: "Шампунь, мыло и т.д." },
            pillows: { label: "Дополнительные подушки", desc: "Подушки или одеяла" },
            maintenance: { label: "Техподдержка", desc: "Техническая помощь" },
            roomservice: { label: "Обслуживание номеров", desc: "Еда и напитки" },
            other: { label: "Другое", desc: "Особые пожелания" },
        },
    },
};

// Request type IDs with icons
const REQUEST_TYPE_IDS = [
    { id: "towels", icon: "🧺" },
    { id: "cleaning", icon: "🧹" },
    { id: "toiletries", icon: "🧴" },
    { id: "pillows", icon: "🛏️" },
    { id: "maintenance", icon: "🔧" },
    { id: "roomservice", icon: "🍽️" },
    { id: "other", icon: "💬" },
] as const;

interface Props {
    params: Promise<{ businessId: string; roomNumber: string }>;
}

export default function GuestRoomRequestPage({ params }: Props) {
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [selectedType, setSelectedType] = useState<string | null>(null);
    const [message, setMessage] = useState("");
    const [businessId, setBusinessId] = useState<string>("");
    const [roomNumber, setRoomNumber] = useState<string>("");
    const [paramsLoaded, setParamsLoaded] = useState(false);
    const [lang, setLang] = useState<Language>("tr");
    const [showLangMenu, setShowLangMenu] = useState(false);

    // Get translations
    const t = TRANSLATIONS[lang];

    // Detect browser language on mount
    useEffect(() => {
        const browserLang = navigator.language.split("-")[0] as Language;
        if (LANGUAGES.some(l => l.code === browserLang)) {
            setLang(browserLang);
        }
    }, []);

    // Load params
    useEffect(() => {
        params.then(p => {
            setBusinessId(p.businessId);
            setRoomNumber(p.roomNumber);
            setParamsLoaded(true);
        });
    }, [params]);

    const handleSubmit = async () => {
        if (!selectedType) return;

        setLoading(true);
        try {
            const res = await fetch("/api/hotel/requests", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    businessId,
                    roomNumber,
                    requestType: selectedType,
                    message: message.trim() || null,
                    language: lang,
                }),
            });

            const data = await res.json();

            if (data.success) {
                setSent(true);
            }
        } catch (error) {
            console.error("Submit error:", error);
        } finally {
            setLoading(false);
        }
    };

    if (!paramsLoaded) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    if (sent) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-white rounded-3xl p-8 text-center max-w-sm w-full shadow-xl"
                >
                    <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-6">
                        <CheckCircle className="w-10 h-10 text-green-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                        {t.successTitle}
                    </h1>
                    <p className="text-gray-500 mb-6">
                        {t.successMessage}
                    </p>
                    <button
                        onClick={() => {
                            setSent(false);
                            setSelectedType(null);
                            setMessage("");
                        }}
                        className="w-full py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition-colors"
                    >
                        {t.newRequestButton}
                    </button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
                <div className="max-w-md mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href="/" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </Link>
                        <div>
                            <h1 className="font-semibold text-gray-900">{t.pageTitle}</h1>
                            <p className="text-sm text-gray-500">{t.roomLabel} {roomNumber}</p>
                        </div>
                    </div>

                    {/* Language Selector */}
                    <div className="relative">
                        <button
                            onClick={() => setShowLangMenu(!showLangMenu)}
                            className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                        >
                            <Globe className="w-4 h-4 text-gray-600" />
                            <span className="text-lg">{LANGUAGES.find(l => l.code === lang)?.flag}</span>
                        </button>

                        <AnimatePresence>
                            {showLangMenu && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-20"
                                >
                                    {LANGUAGES.map((language) => (
                                        <button
                                            key={language.code}
                                            onClick={() => {
                                                setLang(language.code);
                                                setShowLangMenu(false);
                                            }}
                                            className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${lang === language.code ? "bg-blue-50" : ""
                                                }`}
                                        >
                                            <span className="text-xl">{language.flag}</span>
                                            <span className="text-gray-900">{language.label}</span>
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-md mx-auto p-4 space-y-4">
                <p className="text-gray-600 text-center py-2">
                    {t.helpQuestion}
                </p>

                {/* Request Type Cards */}
                <div className="space-y-3">
                    {REQUEST_TYPE_IDS.map((type) => {
                        const typeTranslation = t.requestTypes[type.id as keyof typeof t.requestTypes];

                        // Room service links to menu page
                        if (type.id === "roomservice") {
                            return (
                                <Link
                                    key={type.id}
                                    href={`/r/${businessId}/room/${roomNumber}/menu`}
                                    className="w-full p-4 rounded-2xl border-2 border-orange-200 bg-orange-50 hover:border-orange-300 transition-all flex items-center gap-4"
                                >
                                    <span className="text-3xl">{type.icon}</span>
                                    <div className="flex-1">
                                        <p className="font-semibold text-orange-700">
                                            {typeTranslation.label}
                                        </p>
                                        <p className="text-sm text-orange-600/70">{typeTranslation.desc}</p>
                                    </div>
                                    <ArrowLeft className="w-5 h-5 text-orange-500 rotate-180" />
                                </Link>
                            );
                        }

                        return (
                            <motion.button
                                key={type.id}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setSelectedType(selectedType === type.id ? null : type.id)}
                                className={`w-full p-4 rounded-2xl border-2 transition-all text-left flex items-center gap-4 ${selectedType === type.id
                                    ? "border-blue-500 bg-blue-50"
                                    : "border-gray-200 bg-white hover:border-gray-300"
                                    }`}
                            >
                                <span className="text-3xl">{type.icon}</span>
                                <div className="flex-1">
                                    <p className={`font-semibold ${selectedType === type.id ? "text-blue-700" : "text-gray-900"
                                        }`}>
                                        {typeTranslation.label}
                                    </p>
                                    <p className="text-sm text-gray-500">{typeTranslation.desc}</p>
                                </div>
                                {selectedType === type.id && (
                                    <CheckCircle className="w-6 h-6 text-blue-500" />
                                )}
                            </motion.button>
                        );
                    })}
                </div>

                {/* Message input (shown when type selected) */}
                {selectedType && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="space-y-3"
                    >
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder={t.notePlaceholder}
                            rows={3}
                            className="w-full p-4 rounded-2xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none text-gray-900 placeholder-gray-400"
                        />

                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="w-full py-4 bg-blue-500 text-white rounded-2xl font-semibold hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                t.submitButton
                            )}
                        </button>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
