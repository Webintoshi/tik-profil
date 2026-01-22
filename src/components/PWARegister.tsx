"use client";

import { useEffect } from "react";

export function PWARegister() {
    useEffect(() => {
        if ("serviceWorker" in navigator) {
            navigator.serviceWorker
                .register("/sw.js")
                .then((registration) => {
                })
                .catch((error) => {
                    console.error("[PWA] Service Worker registration failed:", error);
                });
        }
    }, []);

    return null;
}
