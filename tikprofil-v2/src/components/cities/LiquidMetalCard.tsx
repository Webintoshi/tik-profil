"use client";

import { motion } from "framer-motion";

interface LiquidMetalCardProps {
    children: React.ReactNode;
    className?: string;
    delay?: number;
}

export function LiquidMetalCard({ children, className = "", delay = 0 }: LiquidMetalCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay, ease: [0.23, 1, 0.32, 1] }}
            className={`
                relative overflow-hidden rounded-3xl
                bg-gradient-to-br from-[#1a1a2e]/90 via-[#16162a]/90 to-[#0f0f1a]/90
                border border-white/[0.08]
                backdrop-blur-xl
                shadow-2xl shadow-black/50
                ${className}
            `}
        >
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.08] via-transparent to-transparent pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-transparent to-white/[0.03] pointer-events-none" />
            <div className="relative z-10">{children}</div>
        </motion.div>
    );
}
