"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Wifi, Check, Utensils, Sparkles } from "lucide-react";
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
        if (!wifiPassword) return;
        navigator.clipboard.writeText(wifiPassword);
        setCopied(true);
        toast.success("WiFi şifresi kopyalandı!");
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <header className="sticky top-0 z-50 bg-gradient-to-b from-white to-gray-50/95 backdrop-blur-sm border-b border-gray-100/70 shadow-lg shadow-gray-200/50 transition-all duration-300">
            <div className="grid grid-cols-[1fr_auto_1fr] items-center px-4 py-4 max-w-2xl mx-auto min-h-[90px]">
                {/* Left: Back Button */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex justify-start"
                >
                    <Link
                        href={`/${businessSlug}`}
                        className="flex items-center justify-center w-11 h-11 rounded-2xl bg-white shadow-md shadow-gray-200/50 border border-gray-100 transition-all duration-300 hover:shadow-lg hover:shadow-[#fe1e50]/10 hover:scale-105 active:scale-95 text-gray-700 hover:text-[#fe1e50]"
                    >
                        <motion.div whileHover={{ x: -2 }} transition={{ duration: 0.2 }}>
                            <ChevronLeft className="w-6 h-6" />
                        </motion.div>
                    </Link>
                </motion.div>

                {/* Center: Logo & Table Name */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="flex flex-col items-center justify-center gap-2 w-full"
                >
                    <AnimatePresence mode="wait">
                        {logoUrl ? (
                            <motion.div
                                key="logo"
                                initial={{ opacity: 0, rotate: -10 }}
                                animate={{ opacity: 1, rotate: 0 }}
                                exit={{ opacity: 0, rotate: 10 }}
                                transition={{ duration: 0.4 }}
                                className="relative w-20 h-20 rounded-2xl overflow-hidden shadow-xl shadow-[#fe1e50]/20 border-2 border-white group"
                            >
                                <motion.div
                                    className="absolute inset-0 bg-gradient-to-tr from-[#fe1e50]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                />
                                <Image
                                    src={toR2ProxyUrl(logoUrl)}
                                    alt="Logo"
                                    fill
                                    className="object-cover transition-transform duration-500 group-hover:scale-110 group-hover:rotate-2"
                                />
                                <motion.div
                                    animate={{ rotate: [0, 360] }}
                                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                                    className="absolute -top-6 -right-6 w-8 h-8 rounded-full bg-gradient-to-br from-[#fe1e50]/30 to-transparent blur-md"
                                />
                            </motion.div>
                        ) : (
                            <motion.div
                                key="fallback"
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#fe1e50] via-[#fe1e50] to-rose-600 flex items-center justify-center text-white text-2xl font-bold shadow-xl shadow-[#fe1e50]/30 border-2 border-white"
                            >
                                <motion.span
                                    animate={{ scale: [1, 1.1, 1] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                >
                                    {title ? title.substring(0, 2).toUpperCase() : "M"}
                                </motion.span>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* Right: Table Name & WiFi Button */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex flex-col items-end gap-2"
                >
                    {/* Table Name */}
                    <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 }}
                        className="flex flex-col items-end gap-0.5"
                    >
                        <span className="text-[9px] font-semibold text-gray-400 tracking-wider uppercase">Masa Adı</span>
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 shadow-sm">
                            <Utensils className="w-3 h-3 text-[#fe1e50]" />
                            <span className="text-xs font-bold text-gray-700 tracking-wide uppercase truncate max-w-[120px]">
                                {tableName || "Masa 1"}
                            </span>
                        </div>
                    </motion.div>

                    {/* WiFi Button */}
                    <AnimatePresence>
                        {wifiPassword && (
                            <motion.button
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0 }}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={handleCopyWifi}
                                className={`flex items-center justify-center w-11 h-11 rounded-2xl shadow-md shadow-gray-200/50 border transition-all duration-300 ${
                                    copied 
                                        ? 'bg-green-50 border-green-200 text-green-600' 
                                        : 'bg-white border-gray-100 text-gray-700 hover:shadow-lg hover:shadow-[#fe1e50]/10 hover:text-[#fe1e50]'
                                }`}
                            >
                                <AnimatePresence mode="wait">
                                    {copied ? (
                                        <motion.div
                                            key="check"
                                            initial={{ scale: 0, rotate: -180 }}
                                            animate={{ scale: 1, rotate: 0 }}
                                            exit={{ scale: 0, rotate: 180 }}
                                        >
                                            <Check className="w-5 h-5" />
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="wifi"
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            exit={{ scale: 0 }}
                                        >
                                            <motion.div
                                                animate={{ 
                                                    scale: [1, 1.1, 1],
                                                    opacity: [0.7, 1, 0.7]
                                                }}
                                                transition={{ duration: 1.5, repeat: Infinity }}
                                            >
                                                <Wifi className="w-5 h-5" />
                                            </motion.div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.button>
                        )}
                    </AnimatePresence>
                    {wifiPassword && (
                        <span className="text-[9px] font-semibold text-gray-400 tracking-wider uppercase">WiFi Şifresi</span>
                    )}
                </motion.div>
            </div>
        </header>
    );
}

