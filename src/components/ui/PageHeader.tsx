"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface PageHeaderProps {
    title: string;
    description?: string;
    action?: ReactNode;
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
    return (
        <motion.div
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 lg:mb-8"
        >
            <div>
                <h1 className="text-xl sm:text-2xl font-semibold text-dark-100">{title}</h1>
                {description && (
                    <p className="mt-1 text-xs sm:text-sm text-dark-400">{description}</p>
                )}
            </div>
            {action && (
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1, duration: 0.2 }}
                    className="flex-shrink-0"
                >
                    {action}
                </motion.div>
            )}
        </motion.div>
    );
}
