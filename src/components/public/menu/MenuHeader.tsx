"use client";

import { motion } from "framer-motion";
import { ChevronLeft, X } from "lucide-react";
import Link from "next/link";

interface MenuHeaderProps {
    businessSlug: string;
    title?: string;
    onClose?: () => void;
}

export function MenuHeader({ businessSlug, title = "Menü", onClose }: MenuHeaderProps) {
    return (
        <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 border-b border-gray-100/50">
            <div className="flex items-center justify-between px-4 py-3 max-w-2xl mx-auto">
                <Link
                    href={`/${businessSlug}`}
                    className="p-2 -ml-2 rounded-full hover:bg-gray-100/80 active:bg-gray-200/80 transition-colors"
                >
                    <ChevronLeft className="w-6 h-6 text-gray-700" />
                </Link>

                <motion.h1
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-lg font-semibold text-gray-900"
                >
                    {title}
                </motion.h1>

                {onClose ? (
                    <button
                        onClick={onClose}
                        className="p-2 -mr-2 rounded-full hover:bg-gray-100/80 active:bg-gray-200/80 transition-colors"
                    >
                        <X className="w-6 h-6 text-gray-700" />
                    </button>
                ) : (
                    <div className="w-10" /> // Spacer for alignment
                )}
            </div>
        </header>
    );
}

