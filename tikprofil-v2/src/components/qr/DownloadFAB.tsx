"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, FileImage, FileText, Image as ImageIcon } from "lucide-react";
import clsx from "clsx";

interface DownloadFABProps {
    onDownloadSVG: () => void;
    onDownloadPNG: () => void;
    onDownloadPDF: () => void;
    isDownloading: { [key: string]: boolean };
}

export function DownloadFAB({
    onDownloadSVG,
    onDownloadPNG,
    onDownloadPDF,
    isDownloading
}: DownloadFABProps) {
    const [isOpen, setIsOpen] = useState(false);

    const actions = [
        {
            id: 'svg',
            label: 'SVG',
            icon: ImageIcon,
            color: 'bg-emerald-500',
            handler: onDownloadSVG,
            loading: isDownloading.svg
        },
        {
            id: 'png',
            label: 'PNG',
            icon: FileImage,
            color: 'bg-blue-500',
            handler: onDownloadPNG,
            loading: isDownloading.png
        },
        {
            id: 'pdf',
            label: 'PDF',
            icon: FileText,
            color: 'bg-red-500',
            handler: onDownloadPDF,
            loading: isDownloading.pdf
        },
    ];

    return (
        <div className="fixed bottom-24 right-4 z-50">
            {/* Action Buttons */}
            <AnimatePresence>
                {isOpen && actions.map((action, index) => (
                    <motion.button
                        key={action.id}
                        initial={{ scale: 0, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0, opacity: 0, y: 20 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => {
                            action.handler();
                            setIsOpen(false);
                        }}
                        disabled={action.loading}
                        className={clsx(
                            "flex items-center gap-3 mb-3 min-h-[44px] min-w-[44px] rounded-full shadow-lg",
                            action.color,
                            "text-white disabled:opacity-50"
                        )}
                    >
                        {action.loading ? (
                            <div className="animate-spin text-lg mx-auto">◌</div>
                        ) : (
                            <>
                                <span className="absolute right-full mr-3 whitespace-nowrap text-sm font-medium">
                                    {action.label}
                                </span>
                                <action.icon className="w-6 h-6" />
                            </>
                        )}
                    </motion.button>
                ))}
            </AnimatePresence>

            {/* Main FAB */}
            <motion.button
                animate={{ rotate: isOpen ? 45 : 0 }}
                onClick={() => setIsOpen(!isOpen)}
                className="w-14 h-14 rounded-full bg-blue-500 text-white shadow-2xl shadow-blue-500/40 flex items-center justify-center"
            >
                {isOpen ? <X className="w-8 h-8" /> : <Download className="w-8 h-8" />}
            </motion.button>
        </div>
    );
}
