"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type PermissionStatus = "granted" | "denied" | "prompt" | "unsupported";

interface LocationContextType {
    lat: number | null;
    lng: number | null;
    city: string | null;
    district: string | null;
    country: string | null;
    permissionStatus: PermissionStatus;
    loading: boolean;
    error: string | null;
    requestPermission: () => Promise<void>;
    clearLocation: () => void;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export function LocationProvider({ children }: { children: ReactNode }) {
    const [lat, setLat] = useState<number | null>(null);
    const [lng, setLng] = useState<number | null>(null);
    const [city, setCity] = useState<string | null>(null);
    const [district, setDistrict] = useState<string | null>(null);
    const [country, setCountry] = useState<string | null>(null);
    const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>("prompt");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const getLocationName = async (latitude: number, longitude: number) => {
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
            const data = await response.json();

            if (data.address) {
                setCity(data.address.city || data.address.town || data.address.village || null);
                setDistrict(data.address.suburb || data.address.district || data.address.city_district || null);
                setCountry(data.address.country || null);
            }
        } catch (err) {
            console.error("Reverse geocoding failed:", err);
        }
    };

    const requestPermission = async () => {
        if (!("geolocation" in navigator)) {
            setPermissionStatus("unsupported");
            setError("Tarayıcınız konum servisini desteklemiyor");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(
                    resolve,
                    reject,
                    {
                        enableHighAccuracy: true,
                        timeout: 10000,
                        maximumAge: 0,
                    }
                );
            });

            setLat(position.coords.latitude);
            setLng(position.coords.longitude);
            setPermissionStatus("granted");
            await getLocationName(position.coords.latitude, position.coords.longitude);
        } catch (err) {
            const error = err as GeolocationPositionError;
            if (error.code === 1) {
                setPermissionStatus("denied");
                setError("Konum izni reddedildi");
            } else if (error.code === 2) {
                setPermissionStatus("denied");
                setError("Konum alınamadı");
            } else if (error.code === 3) {
                setPermissionStatus("denied");
                setError("Konum isteği zaman aşımına uğradı");
            } else {
                setPermissionStatus("denied");
                setError("Bilinmeyen bir hata oluştu");
            }
        } finally {
            setLoading(false);
        }
    };

    const clearLocation = () => {
        setLat(null);
        setLng(null);
        setCity(null);
        setDistrict(null);
        setCountry(null);
        setPermissionStatus("prompt");
        setError(null);
    };

    useEffect(() => {
        if ("geolocation" in navigator) {
            setPermissionStatus("prompt");
        } else {
            setPermissionStatus("unsupported");
        }
    }, []);

    return (
        <LocationContext.Provider
            value={{
                lat,
                lng,
                city,
                district,
                country,
                permissionStatus,
                loading,
                error,
                requestPermission,
                clearLocation,
            }}
        >
            {children}
        </LocationContext.Provider>
    );
}

export function useLocation() {
    const context = useContext(LocationContext);
    if (context === undefined) {
        throw new Error("useLocation must be used within a LocationProvider");
    }
    return context;
}
