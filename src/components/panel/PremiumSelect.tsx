"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check } from "lucide-react";
import clsx from "clsx";

interface SelectOption {
    value: string;
    label: string;
}

interface PremiumSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: SelectOption[];
    placeholder?: string;
    className?: string;
    isDark?: boolean;
    disabled?: boolean;
    name?: string;
}

export function PremiumSelect({
    value,
    onChange,
    options,
    placeholder = "Seçin",
    className = "",
    isDark = false,
    disabled = false,
    name
}: PremiumSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Close on escape
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") setIsOpen(false);
        };

        document.addEventListener("keydown", handleEscape);
        return () => document.removeEventListener("keydown", handleEscape);
    }, []);

    const selectedOption = options.find(opt => opt.value === value);

    const handleSelect = (optionValue: string) => {
        onChange(optionValue);
        setIsOpen(false);
    };

    return (
        <div ref={containerRef} className={clsx("relative", className)}>
            {/* Hidden native input for form submission */}
            {name && <input type="hidden" name={name} value={value} />}

            {/* Trigger Button */}
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={clsx(
                    "w-full px-4 py-3 rounded-xl border text-left flex items-center justify-between gap-2 transition-all",
                    isDark
                        ? "bg-gray-800 border-gray-700 text-white hover:border-gray-600"
                        : "bg-white border-gray-200 text-gray-900 hover:border-gray-300",
                    isOpen && "ring-2 ring-purple-500 border-transparent",
                    disabled && "opacity-50 cursor-not-allowed"
                )}
            >
                <span className={!selectedOption ? (isDark ? "text-gray-500" : "text-gray-400") : ""}>
                    {selectedOption?.label || placeholder}
                </span>
                <ChevronDown
                    className={clsx(
                        "w-5 h-5 transition-transform",
                        isDark ? "text-gray-400" : "text-gray-500",
                        isOpen && "rotate-180"
                    )}
                />
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.96 }}
                        transition={{ duration: 0.15 }}
                        className={clsx(
                            "absolute z-50 w-full mt-2 py-2 rounded-xl shadow-xl border overflow-hidden",
                            isDark
                                ? "bg-gray-800 border-gray-700"
                                : "bg-white border-gray-100"
                        )}
                        style={{
                            boxShadow: isDark
                                ? "0 10px 40px rgba(0, 0, 0, 0.5)"
                                : "0 10px 40px rgba(0, 0, 0, 0.15)"
                        }}
                    >
                        <div className="max-h-60 overflow-y-auto">
                            {options.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => handleSelect(option.value)}
                                    className={clsx(
                                        "w-full px-4 py-2.5 text-left flex items-center justify-between gap-2 transition-colors",
                                        option.value === value
                                            ? isDark
                                                ? "bg-purple-600/20 text-purple-400"
                                                : "bg-purple-50 text-purple-600"
                                            : isDark
                                                ? "text-gray-200 hover:bg-gray-700"
                                                : "text-gray-700 hover:bg-gray-50"
                                    )}
                                >
                                    <span>{option.label}</span>
                                    {option.value === value && (
                                        <Check className="w-4 h-4" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
