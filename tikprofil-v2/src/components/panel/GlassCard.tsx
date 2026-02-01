"use client";

import clsx from "clsx";

interface GlassCardProps {
    children: React.ReactNode;
    className?: string;
    isDark?: boolean;
}

export function GlassCard({
    children,
    className = "",
    isDark = false
}: GlassCardProps) {
    return (
        <div
            className={clsx(
                "rounded-[18px] border overflow-hidden transition-all duration-300",
                isDark
                    ? "bg-white/[0.03] border-white/[0.08] backdrop-blur-xl shadow-2xl"
                    : "bg-white/80 border-white/50 backdrop-blur-xl shadow-xl shadow-black/5",
                className
            )}
        >
            {children}
        </div>
    );
}
