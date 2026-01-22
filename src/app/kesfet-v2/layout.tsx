"use client";

import { ThemeProvider } from "@/components/explore/ThemeProvider";
import { LocationProvider } from "@/components/explore/LocationProvider";
import BottomNav from "@/components/explore/BottomNav";

export default function ExploreLayout({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider defaultTheme="dark">
            <LocationProvider>
                <LayoutContent>{children}</LayoutContent>
            </LocationProvider>
        </ThemeProvider>
    );
}

function LayoutContent({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen font-sans antialiased
                       dark:bg-gray-950 bg-[#F5F5F7]
                       dark:selection:bg-blue-500/30 dark:selection:text-white
                       selection:bg-emerald-100 selection:text-emerald-900
                       transition-colors duration-300">
            <main className="w-full max-w-2xl mx-auto min-h-screen relative
                           dark:bg-gray-950 bg-white
                           lg:shadow-2xl overflow-hidden
                           pb-20">
                {children}
            </main>
            <BottomNav />
        </div>
    );
}
