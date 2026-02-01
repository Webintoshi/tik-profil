"use client";

import { useState, useEffect, useCallback } from "react";

export interface UserLocation {
    lat: number;
    lng: number;
    city: string;
    district: string;
}

const CACHE_KEY = "tikprofil-user-location";
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

interface CachedLocation extends UserLocation {
    timestamp: number;
}

export function useGeolocation() {
    const [location, setLocation] = useState<UserLocation | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [permissionState, setPermissionState] = useState<PermissionState | null>(null);

    // Load from cache
    useEffect(() => {
        if (typeof window === "undefined") return;

        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            try {
                const parsed: CachedLocation = JSON.parse(cached);
                if (Date.now() - parsed.timestamp < CACHE_DURATION) {
                    setLocation({
                        lat: parsed.lat,
                        lng: parsed.lng,
                        city: parsed.city,
                        district: parsed.district,
                    });
                    setLoading(false);
                    return;
                }
            } catch { }
        }
        setLoading(false);
    }, []);

    // Check permission state
    useEffect(() => {
        if (typeof navigator === "undefined" || !navigator.permissions) return;

        navigator.permissions.query({ name: "geolocation" }).then((result) => {
            setPermissionState(result.state);
            result.onchange = () => setPermissionState(result.state);
        });
    }, []);

    // Reverse geocode
    const reverseGeocode = async (lat: number, lng: number): Promise<{ city: string; district: string }> => {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=tr`,
                { headers: { "User-Agent": "TikProfil/1.0" } }
            );
            const data = await response.json();
            const address = data.address || {};
            return {
                city: address.province || address.city || address.state || "Türkiye",
                district: address.suburb || address.district || address.town || address.county || "",
            };
        } catch {
            return { city: "Türkiye", district: "" };
        }
    };

    // Request location
    const requestLocation = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 300000,
                });
            });

            const { latitude: lat, longitude: lng } = position.coords;
            const { city, district } = await reverseGeocode(lat, lng);

            const loc: UserLocation = { lat, lng, city, district };
            setLocation(loc);

            // Cache
            const cached: CachedLocation = { ...loc, timestamp: Date.now() };
            localStorage.setItem(CACHE_KEY, JSON.stringify(cached));

            return loc;
        } catch (err: any) {
            const message = err.code === 1 ? "Konum izni reddedildi" : "Konum alınamadı";
            setError(message);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    // Set manual location
    const setManualLocation = useCallback((city: string, lat: number, lng: number) => {
        const loc: UserLocation = { lat, lng, city, district: "" };
        setLocation(loc);
        const cached: CachedLocation = { ...loc, timestamp: Date.now() };
        localStorage.setItem(CACHE_KEY, JSON.stringify(cached));
    }, []);

    // Clear location
    const clearLocation = useCallback(() => {
        localStorage.removeItem(CACHE_KEY);
        setLocation(null);
    }, []);

    return {
        location,
        loading,
        error,
        permissionState,
        requestLocation,
        setManualLocation,
        clearLocation,
    };
}
