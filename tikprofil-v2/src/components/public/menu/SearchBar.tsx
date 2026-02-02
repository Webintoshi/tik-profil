"use client";

import { Search, X } from "lucide-react";
import { motion } from "framer-motion";

interface SearchBarProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

export function SearchBar({ value, onChange, placeholder = "Ürün ara..." }: SearchBarProps) {
    return (
        <div className="sticky top-[56px] z-30 px-4 py-2 bg-gray-50/80 backdrop-blur-sm">
            <div className="relative max-w-2xl mx-auto">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className="w-full pl-12 pr-10 py-3.5 bg-white rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#fe1e50] focus:border-transparent shadow-sm transition-all"
                />
                {value && (
                    <motion.button
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => onChange("")}
                        className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors"
                        aria-label="Aramayı temizle"
                    >
                        <X className="w-4 h-4" />
                    </motion.button>
                )}
            </div>
        </div>
    );
}
