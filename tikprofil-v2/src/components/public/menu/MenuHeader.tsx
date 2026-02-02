"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Wifi, Check, Utensils, X } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { toR2ProxyUrl } from "@/lib/publicImage";
import { toast } from "sonner";

interface MenuHeaderProps {
    businessSlug: string;
    title?: string;
    logoUrl?: string;
    tableName?: string;
    wifiPassword?: string;
    onClose?: () => void;
}

export function MenuHeader({ businessSlug, title = "Menü", logoUrl, tableName, wifiPassword }: MenuHeaderProps) {
    const [copied, setCopied] = useState(false);

    const handleCopyWifi = () => {
        const password = wifiPassword || "Yok";
        if (!wifiPassword) {
            toast.error("WiFi şifresi bulunmuyor");
            return;
        }
        navigator.clipboard.writeText(wifiPassword);
        setCopied(true);
        toast.success("WiFi şifresi kopyalandı!");
        setTimeout(() => setCopied(false), 2000);
    };

    const hasWifi = !!wifiPassword && wifiPassword.length > 0;
    const displayTableName = tableName;

    return (
        <header className="sticky top-0 z-50 bg-gradient-to-b from-white via-white to-gray-50/50 backdrop-blur-md border-b-2 border-gray-200 shadow-sm">
            {/* Main Header */}
            <div className="max-w-2xl mx-auto px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                    {/* Left: Back Button */}
                    <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                    >
                        <Link
                            href={`/${businessSlug}`}
                            className="flex items-center justify-center w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 border border-gray-200 transition-all duration-200 active:scale-95"
                        >
                            <ChevronLeft className="w-5 h-5 text-gray-700" />
                        </Link>
                    </motion.div>

                    {/* Center: Logo */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex-1 flex justify-center"
                    >
                        <div className="relative">
                            {logoUrl ? (
                                <div className="w-24 h-24 rounded-2xl overflow-hidden shadow-lg border-2 border-white bg-white">
                                    <Image
                                        src={toR2ProxyUrl(logoUrl)}
                                        alt="Logo"
                                        width={96}
                                        height={96}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            ) : (
                                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#fe1e50] to-rose-500 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                                    {title ? title.substring(0, 2).toUpperCase() : "M"}
                                </div>
                            )}
                            {/* Pulsing indicator */}
                            <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
                        </div>
                    </motion.div>

                    {/* Right: Empty for balance */}
                    <div className="w-10" />
                </div>
            </div>

            {/* Info Bar - Table + WiFi */}
            <div className="max-w-2xl mx-auto px-4 pb-3">
                <div className={`flex items-center gap-3 p-2.5 bg-gray-50 rounded-2xl border border-gray-100 ${!tableName ? 'justify-end' : 'justify-between'}`}>
                    {/* Table Info - Only show if tableName exists */}
                    {tableName && (
                        <>
                            <div className="flex items-center gap-2.5">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#fe1e50] to-rose-500 flex items-center justify-center shadow-md">
                                    <Utensils className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Masa</p>
                                    <p className="text-base font-bold text-gray-900 leading-tight">
                                        {displayTableName}
                                    </p>
                                </div>
                            </div>

                            {/* Divider */}
                            <div className="w-px h-8 bg-gray-200" />
                        </>
                    )}

                    {/* WiFi - Always Show */}
                    <motion.button
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={handleCopyWifi}
                        className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl transition-all duration-200 ${
                            copied
                                ? 'bg-green-100 text-green-700 border border-green-200'
                                : hasWifi
                                    ? 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200'
                                    : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                        }`}
                    >
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                            copied ? 'bg-green-500' : hasWifi ? 'bg-gray-100' : 'bg-gray-200'
                        }`}>
                            <AnimatePresence mode="wait">
                                {copied ? (
                                    <motion.div
                                        key="check"
                                        initial={{ scale: 0, rotate: -180 }}
                                        animate={{ scale: 1, rotate: 0 }}
                                        exit={{ scale: 0, rotate: 180 }}
                                    >
                                        <Check className="w-4 h-4 text-white" />
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="wifi"
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        exit={{ scale: 0 }}
                                    >
                                        <Wifi className="w-4 h-4" />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                        <div className="text-left">
                            <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">WiFi</p>
                            <p className="text-sm font-bold leading-tight">
                                {copied ? 'Kopyalandı!' : hasWifi ? 'Şifre' : 'Yok'}
                            </p>
                        </div>
                    </motion.button>
                </div>
            </div>
        </header>
    );
}
