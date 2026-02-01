"use client";

import clsx from "clsx";
import { motion } from "framer-motion";
import { CSSProperties, MouseEventHandler } from "react";

interface GlassCardProps {
    children: React.ReactNode;
    className?: string;
    hover?: boolean;
    padding?: "none" | "sm" | "md" | "lg";
    style?: CSSProperties;
    onClick?: MouseEventHandler<HTMLDivElement>;
}

const paddingStyles = {
    none: "",
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
};

export function GlassCard({
    children,
    className,
    hover = false,
    padding = "md",
    style,
    onClick,
}: GlassCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            whileHover={hover ? {
                y: -8,
                scale: 1.02,
                transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] }
            } : undefined}
            style={style}
            onClick={onClick}
            className={clsx(
                "glass-card",
                paddingStyles[padding],
                hover && "cursor-pointer card-hover",
                className
            )}
        >
            {children}
        </motion.div>
    );
}

