"use client";

import clsx from "clsx";
import { motion } from "framer-motion";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps {
    children: React.ReactNode;
    variant?: ButtonVariant;
    size?: ButtonSize;
    isLoading?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    className?: string;
    disabled?: boolean;
    onClick?: () => void;
    type?: "button" | "submit" | "reset";
}

const variantStyles: Record<ButtonVariant, string> = {
    primary: "bg-accent-blue text-white hover:bg-accent-blue/90 shadow-glow",
    secondary: "bg-dark-800 text-dark-200 border border-dark-700 hover:bg-dark-700 hover:border-dark-600",
    ghost: "text-dark-400 hover:text-dark-200 hover:bg-dark-800/50",
    danger: "bg-accent-red/15 text-accent-red hover:bg-accent-red/25",
};

const sizeStyles: Record<ButtonSize, string> = {
    sm: "px-3 py-1.5 text-xs rounded-lg",
    md: "px-4 py-2.5 text-sm rounded-xl",
    lg: "px-6 py-3 text-base rounded-xl",
};

export function Button({
    children,
    variant = "primary",
    size = "md",
    isLoading,
    leftIcon,
    rightIcon,
    className,
    disabled,
    onClick,
    type = "button",
}: ButtonProps) {
    return (
        <motion.button
            type={type}
            whileTap={{ scale: 0.98 }}
            whileHover={{ scale: 1.01 }}
            transition={{ duration: 0.1 }}
            disabled={disabled || isLoading}
            onClick={onClick}
            className={clsx(
                "inline-flex items-center justify-center gap-2 font-medium transition-all duration-200",
                "disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none",
                variantStyles[variant],
                sizeStyles[size],
                className
            )}
        >
            {isLoading ? (
                <svg
                    className="animate-spin h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                >
                    <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                    />
                    <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                </svg>
            ) : (
                leftIcon
            )}
            {children}
            {rightIcon}
        </motion.button>
    );
}

