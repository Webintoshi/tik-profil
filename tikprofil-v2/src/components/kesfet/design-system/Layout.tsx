"use client";

import { cn } from "@/lib/utils";

interface GlassProps {
    children: React.ReactNode;
    className?: string;
    intensity?: "light" | "medium" | "heavy";
}

export function Glass({ children, className, intensity = "medium" }: GlassProps) {
    const blurMap = {
        light: "backdrop-blur-sm bg-white/70",
        medium: "backdrop-blur-md bg-white/80",
        heavy: "backdrop-blur-xl bg-white/90",
    };

    return (
        <div className={cn(blurMap[intensity], "border-b border-white/20 shadow-sm", className)}>
            {children}
        </div>
    );
}

export function GlassCard({ children, className }: { children: React.ReactNode, className?: string }) {
    return (
        <div className={cn(
            "relative overflow-hidden rounded-[24px] bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-black/5 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]",
            className
        )}>
            {children}
        </div>
    );
}

export function Container({ children, className }: { children: React.ReactNode, className?: string }) {
    return (
        <div className={cn("px-5 mx-auto max-w-md w-full", className)}>
            {children}
        </div>
    );
}
