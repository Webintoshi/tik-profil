"use client";

import { Suspense, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { RestaurantMenuClient } from "./RestaurantMenuClient";

interface PublicProfileWrapperProps {
    business: {
        id?: string;
        slug: string;
        name: string;
        logo?: string;
        whatsapp?: string;
        phone?: string;
        industry: string;
        hasRestaurantModule?: boolean;
        cartEnabled?: boolean;
    };
    children: React.ReactNode;
}

function ProfileContent({ business, children }: PublicProfileWrapperProps) {
    const searchParams = useSearchParams();
    const tableId = searchParams.get("table");
    const hasLoggedRef = useRef(false);

    // Log QR scan on mount (once per session per business)
    useEffect(() => {
        if (hasLoggedRef.current) return;

        // Check session storage to avoid duplicate logs
        const storageKey = `qr_logged_${business.slug}`;
        const lastLogged = sessionStorage.getItem(storageKey);
        const now = Date.now();

        // Only log if not logged in last 60 seconds
        if (lastLogged && now - parseInt(lastLogged) < 60000) {
            return;
        }

        hasLoggedRef.current = true;
        sessionStorage.setItem(storageKey, now.toString());

        // Fire and forget - don't block rendering
        fetch("/api/qr-scan", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                businessId: business.id || business.slug,
                businessSlug: business.slug,
            }),
        }).catch(() => {
            // Silently fail - logging is not critical
        });
    }, [business.id, business.slug]);

    // Show restaurant menu if:
    // 1. Business has restaurant module (or is restaurant industry)
    // 2. URL has ?table= parameter
    const showRestaurantMenu =
        (business.hasRestaurantModule ||
            business.industry === "restaurant" ||
            business.industry === "cafe" ||
            business.industry === "fastfood") &&
        tableId;

    if (showRestaurantMenu) {
        return (
            <RestaurantMenuClient
                businessSlug={business.slug}
                businessId={business.id || business.slug}
                businessName={business.name}
                businessLogo={business.logo}
                businessWhatsapp={business.whatsapp}
                businessPhone={business.phone}
            />
        );
    }

    // Show normal profile
    return <>{children}</>;
}

export function PublicProfileWrapper(props: PublicProfileWrapperProps) {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>}>
            <ProfileContent {...props} />
        </Suspense>
    );
}


