"use client";

import { ThemeProvider } from "@/components/explore/ThemeProvider";
import { LocationProvider } from "@/components/explore/LocationProvider";

export default function KesfetLayout({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider defaultTheme="dark">
            <LocationProvider>
                {children}
            </LocationProvider>
        </ThemeProvider>
    );
}
