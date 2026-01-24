"use client";

import { useEffect } from "react";

export function PWARegister() {
    useEffect(() => {
        const registerServiceWorker = () => {
            if ("serviceWorker" in navigator && document.readyState === "complete") {
                navigator.serviceWorker
                    .register("/sw.js")
                    .then((registration) => {
                    })
                    .catch((error) => {
                    });
            }
        };

        if (document.readyState === "complete") {
            registerServiceWorker();
        } else {
            window.addEventListener("load", registerServiceWorker);
        }

        return () => {
            window.removeEventListener("load", registerServiceWorker);
        };
    }, []);

    return null;
}
