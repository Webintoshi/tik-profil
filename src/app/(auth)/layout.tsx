"use client";

import { Toaster } from "sonner";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <Toaster
                position="top-center"
                richColors
                closeButton
                theme="light"
            />
            <main className="flex min-h-screen items-center justify-center bg-[#FAF8F4] px-4 py-8 font-sans text-[#211A12] selection:bg-[#FFE0AE] selection:text-[#211A12] sm:px-6">
                <div className="w-full max-w-[420px]">{children}</div>
            </main>
        </>
    );
}
