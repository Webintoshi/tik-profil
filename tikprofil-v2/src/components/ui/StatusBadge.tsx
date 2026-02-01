"use client";

import clsx from "clsx";
import { motion } from "framer-motion";

type BadgeVariant = "active" | "pending" | "inactive";

interface StatusBadgeProps {
    variant: BadgeVariant;
    children: React.ReactNode;
    withDot?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
    active: "bg-accent-green/15 text-accent-green",
    pending: "bg-accent-orange/15 text-accent-orange",
    inactive: "bg-dark-700/50 text-dark-400",
};

const dotColors: Record<BadgeVariant, string> = {
    active: "bg-accent-green",
    pending: "bg-accent-orange",
    inactive: "bg-dark-500",
};

export function StatusBadge({ variant, children, withDot = true }: StatusBadgeProps) {
    return (
        <motion.span
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={clsx(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                variantStyles[variant]
            )}
        >
            {withDot && (
                <span className={clsx("h-1.5 w-1.5 rounded-full", dotColors[variant])} />
            )}
            {children}
        </motion.span>
    );
}
