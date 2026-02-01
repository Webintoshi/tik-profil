"use client";

import { cn } from "@/lib/utils";

// Apple-style typography components matching iOS Human Interface Guidelines
// Using Inter as a proxy for San Francisco

export function LargeTitle({ children, className }: { children: React.ReactNode, className?: string }) {
    return (
        <h1 className={cn("text-[34px] font-bold leading-[41px] tracking-tight text-[#1D1D1F]", className)}>
            {children}
        </h1>
    );
}

export function Title1({ children, className }: { children: React.ReactNode, className?: string }) {
    return (
        <h2 className={cn("text-[28px] font-bold leading-[34px] tracking-tight text-[#1D1D1F]", className)}>
            {children}
        </h2>
    );
}

export function Title2({ children, className }: { children: React.ReactNode, className?: string }) {
    return (
        <h3 className={cn("text-[22px] font-semibold leading-[28px] tracking-tight text-[#1D1D1F]", className)}>
            {children}
        </h3>
    );
}

export function Title3({ children, className }: { children: React.ReactNode, className?: string }) {
    return (
        <h4 className={cn("text-[20px] font-semibold leading-[25px] tracking-tight text-[#1D1D1F]", className)}>
            {children}
        </h4>
    );
}

export function Headline({ children, className }: { children: React.ReactNode, className?: string }) {
    return (
        <p className={cn("text-[17px] font-semibold leading-[22px] tracking-tight text-[#1D1D1F]", className)}>
            {children}
        </p>
    );
}

export function Body({ children, className }: { children: React.ReactNode, className?: string }) {
    return (
        <p className={cn("text-[17px] font-normal leading-[22px] tracking-tight text-[#1D1D1F]", className)}>
            {children}
        </p>
    );
}

export function Callout({ children, className }: { children: React.ReactNode, className?: string }) {
    return (
        <p className={cn("text-[16px] font-normal leading-[21px] tracking-tight text-[#1D1D1F]", className)}>
            {children}
        </p>
    );
}

export function Subhead({ children, className }: { children: React.ReactNode, className?: string }) {
    return (
        <p className={cn("text-[15px] font-normal leading-[20px] tracking-tight text-[#86868B]", className)}>
            {children}
        </p>
    );
}

export function Footnote({ children, className }: { children: React.ReactNode, className?: string }) {
    return (
        <p className={cn("text-[13px] font-normal leading-[18px] tracking-tight text-[#86868B]", className)}>
            {children}
        </p>
    );
}

export function Caption1({ children, className }: { children: React.ReactNode, className?: string }) {
    return (
        <p className={cn("text-[12px] font-normal leading-[16px] tracking-tight text-[#86868B]", className)}>
            {children}
        </p>
    );
}

export function Caption2({ children, className }: { children: React.ReactNode, className?: string }) {
    return (
        <p className={cn("text-[11px] font-normal leading-[13px] tracking-tight text-[#86868B]", className)}>
            {children}
        </p>
    );
}
