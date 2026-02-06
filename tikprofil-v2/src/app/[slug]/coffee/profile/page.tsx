"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { 
    Coffee, MapPin, Phone, Clock, Wifi, Instagram, 
    Star, ChevronRight, Navigation
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface Business {
    id: string;
    name: string;
    slug: string;
    image_url: string;
    description: string;
    address: string;
    phone: string;
    working_hours: Record<string, { open: string; close: string; closed: boolean }>;
    instagram?: string;
    latitude?: number;
    longitude?: number;
}

interface Settings {
    wifi_name: string;
    wifi_password: string;
    loyalty_enabled: boolean;
    stamps_for_free_drink: number;
}

export default function CoffeeProfilePage() {
    const params = useParams();
    const slug = params.slug as string;
    
    const [business, setBusiness] = useState<Business | null>(null);
    const [settings, setSettings] = useState<Settings | null>(null);
    const [loading, setLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);

    const galleryImages = [
        "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800",
        "https://images.unsplash.com/photo-1511920170033-f8396924c348?w=800",
        "https://images.unsplash.com/photo-1442512595367-42736f9e51f9?w=800",
        "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800"
    ];

    useEffect(() => {
        fetchProfile();
    }, [slug]);

    const fetchProfile = async () => {
        try {
            const res = await fetch(`/api/coffee/public-menu?slug=${slug}`);
            if (res.ok) {
                const data = await res.json();
                setBusiness(data.data.business);
                setSettings(data.data.settings);
                checkIfOpen(data.data.business.working_hours);
            }
        } catch (error) {
            console.error("Error:", error);
        } finally {
            setLoading(false);
        }
    };

    const checkIfOpen = (hours: Record<string, { open: string; close: string; closed: boolean }>) => {
        const now = new Date();
        const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
        const day = days[now.getDay()];
        const todayHours = hours[day];
        
        if (!todayHours || todayHours.closed) {
            setIsOpen(false);
            return;
        }

        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentTime = currentHour * 60 + currentMinute;
        
        const [openHour, openMinute] = todayHours.open.split(":").map(Number);
        const [closeHour, closeMinute] = todayHours.close.split(":").map(Number);
        const openTime = openHour * 60 + openMinute;
        const closeTime = closeHour * 60 + closeMinute;

        setIsOpen(currentTime >= openTime && currentTime < closeTime);
    };

    const getTodayHours = () => {
        if (!business?.working_hours) return null;
        const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
        const today = days[new Date().getDay()];
        return business.working_hours[today];
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#07070a] flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-white/10 border-t-[#fe1e50] rounded-full animate-spin" />
            </div>
        );
    }

    if (!business) {
        return (
            <div className="min-h-screen bg-[#07070a] flex items-center justify-center text-white">
                İşletme bulunamadı
            </div>
        );
    }

    const todayHours = getTodayHours();

    return (
        <div className="min-h-screen bg-[#07070a] text-white">
            {/* Hero */}
            <div className="relative h-[50vh]">
                <Image
                    src={galleryImages[0]}
                    alt={business.name}
                    fill
                    className="object-cover"
                    priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#07070a] via-[#07070a]/50 to-transparent" />
                
                <Link 
                    href={`/${slug}`}
                    className="absolute top-4 left-4 z-20 p-3 bg-black/50 backdrop-blur rounded-full"
                >
                    <ChevronRight className="w-5 h-5 rotate-180" />
                </Link>

                <div className="absolute bottom-0 left-0 right-0 p-6">
                    <div className="max-w-3xl mx-auto">
                        <div className="flex items-center gap-3 mb-2">
                            <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                                isOpen ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                            }`}>
                                {isOpen ? '● Açık' : '● Kapalı'}
                            </span>
                            {settings?.loyalty_enabled && (
                                <span className="px-3 py-1 text-xs bg-[#fe1e50]/20 text-[#fe1e50] rounded-full">
                                    <Star className="w-3 h-3 inline mr-1" />
                                    {settings.stamps_for_free_drink} al 1 bedava
                                </span>
                            )}
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold mb-2">{business.name}</h1>
                        <p className="text-white/60">{business.description}</p>
                    </div>
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-4 -mt-4 relative z-10">
                {/* Actions */}
                <motion.div className="flex gap-3 mb-8">
                    <Link
                        href={`/${slug}/coffee`}
                        className="flex-1 bg-[#fe1e50] text-white py-4 rounded-2xl font-bold text-center"
                    >
                        <Coffee className="w-5 h-5 inline mr-2" />
                        Menüye Git
                    </Link>
                    <a href={`tel:${business.phone}`} className="p-4 bg-white/[0.05] rounded-2xl">
                        <Phone className="w-5 h-5" />
                    </a>
                </motion.div>

                {/* Info Cards */}
                <div className="space-y-4 mb-8">
                    {/* Address */}
                    <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5">
                        <div className="flex gap-4">
                            <div className="w-10 h-10 bg-[#fe1e50]/10 rounded-xl flex items-center justify-center">
                                <MapPin className="w-5 h-5 text-[#fe1e50]" />
                            </div>
                            <div>
                                <h3 className="font-semibold mb-1">Adres</h3>
                                <p className="text-white/60 text-sm">{business.address}</p>
                            </div>
                        </div>
                    </div>

                    {/* Working Hours */}
                    <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5">
                        <div className="flex gap-4">
                            <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center">
                                <Clock className="w-5 h-5 text-amber-400" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold mb-1">Çalışma Saatleri</h3>
                                {todayHours && (
                                    <p className="text-white/60 text-sm">
                                        Bugün: {todayHours.closed ? 'Kapalı' : `${todayHours.open} - ${todayHours.close}`}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* WiFi */}
                    {settings?.wifi_name && (
                        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5">
                            <div className="flex gap-4">
                                <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                                    <Wifi className="w-5 h-5 text-emerald-400" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold mb-1">WiFi</h3>
                                    <div className="flex justify-between mt-2 p-3 bg-white/[0.03] rounded-xl">
                                        <span>{settings.wifi_name}</span>
                                        <span className="font-medium">{settings.wifi_password}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Gallery */}
                <div className="mb-8">
                    <h2 className="text-xl font-bold mb-4">Galeri</h2>
                    <div className="grid grid-cols-2 gap-3">
                        {galleryImages.map((img, index) => (
                            <div key={index} className={`relative rounded-2xl overflow-hidden ${index === 0 ? 'col-span-2 aspect-video' : 'aspect-square'}`}>
                                <Image src={img} alt={`Gallery ${index + 1}`} fill className="object-cover" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* CTA */}
                <Link
                    href={`/${slug}/coffee`}
                    className="block w-full py-4 bg-[#fe1e50] text-white rounded-2xl font-bold text-center mb-8"
                >
                    <Coffee className="w-5 h-5 inline mr-2" />
                    Sipariş Ver
                </Link>
            </div>
        </div>
    );
}
