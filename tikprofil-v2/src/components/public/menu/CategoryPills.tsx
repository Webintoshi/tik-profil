"use client";

import { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import clsx from "clsx";

interface Category {
    id: string;
    name: string;
    icon: string;
}

interface CategoryPillsProps {
    categories: Category[];
    activeId: string;
    onSelect: (id: string) => void;
    theme?: "modern" | "classic";
}

export function CategoryPills({ categories, activeId, onSelect, theme = "modern" }: CategoryPillsProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const pillRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

    // Auto-scroll to active pill
    useEffect(() => {
        const activePill = pillRefs.current.get(activeId);
        if (activePill && scrollRef.current) {
            const container = scrollRef.current;
            const pillRect = activePill.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();

            const isOutOfView =
                pillRect.left < containerRect.left ||
                pillRect.right > containerRect.right;

            if (isOutOfView) {
                activePill.scrollIntoView({
                    behavior: "smooth",
                    inline: "center",
                    block: "nearest"
                });
            }
        }
    }, [activeId]);

    return (
        <div className="sticky top-[52px] z-40 backdrop-blur-md border-b bg-white/95 border-gray-100">
            <div
                ref={scrollRef}
                className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
                {categories.map((category) => {
                    const isActive = activeId === category.id;
                    return (
                        <motion.button
                            key={category.id}
                            ref={(el) => {
                                if (el) pillRefs.current.set(category.id, el);
                            }}
                            onClick={() => onSelect(category.id)}
                            whileTap={{ scale: 0.95 }}
                            className={clsx(
                                "flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-300 border",
                                isActive
                                    ? "bg-[#fe1e50] text-white shadow-lg shadow-[#fe1e50]/25 border-transparent"
                                    : "bg-white border-gray-200 text-gray-600 hover:border-[#fe1e50]/50 hover:bg-[#fe1e50]/5 active:bg-[#fe1e50]/10"
                            )}
                        >
                            <span className="text-base">{category.icon}</span>
                            <span>{category.name}</span>
                        </motion.button>
                    );
                })}
            </div>
        </div>
    );
}

