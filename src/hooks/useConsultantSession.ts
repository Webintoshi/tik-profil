// Consultant Session Hook
// Danışman oturumu kontrolü için özel hook
"use client";

import { useState, useEffect, useCallback } from 'react';

interface ConsultantSession {
    consultantId: string;
    businessId: string;
    name: string;
    role: 'consultant';
}

interface ConsultantData {
    id: string;
    name: string;
    title?: string;
    email?: string;
    phone: string;
    whatsapp?: string;
    photoUrl?: string;
    slug?: string;
    bio?: string;
}

interface BusinessData {
    id: string;
    name: string;
    slug: string;
}

interface UseConsultantSessionReturn {
    session: ConsultantSession | null;
    consultant: ConsultantData | null;
    business: BusinessData | null;
    isLoading: boolean;
    error: string | null;
    logout: () => Promise<void>;
    refresh: () => Promise<void>;
}

export function useConsultantSession(): UseConsultantSessionReturn {
    const [session, setSession] = useState<ConsultantSession | null>(null);
    const [consultant, setConsultant] = useState<ConsultantData | null>(null);
    const [business, setBusiness] = useState<BusinessData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchSession = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            const res = await fetch('/api/auth/consultant-session');
            const data = await res.json();

            if (data.success) {
                setSession(data.session);
                setConsultant(data.consultant);
                setBusiness(data.business);
            } else {
                setSession(null);
                setConsultant(null);
                setBusiness(null);
                if (data.error !== 'No session') {
                    setError(data.error);
                }
            }
        } catch {
            setError('Oturum bilgisi alınamadı');
            setSession(null);
            setConsultant(null);
            setBusiness(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const logout = async () => {
        try {
            await fetch('/api/auth/consultant-logout', { method: 'POST' });
            setSession(null);
            setConsultant(null);
            setBusiness(null);
            window.location.href = '/danisman-giris';
        } catch {
            console.error('Logout error');
        }
    };

    useEffect(() => {
        fetchSession();
    }, [fetchSession]);

    return {
        session,
        consultant,
        business,
        isLoading,
        error,
        logout,
        refresh: fetchSession,
    };
}
