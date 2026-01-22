"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, Clock, MessageCircle, Calendar, ChevronRight, Sparkles, Heart, Star } from "lucide-react";
import { formatDuration, formatPrice, ServiceCategory, Service } from "@/types/beauty";
import { getCachedBeautyData } from "@/lib/beautyCache";
import Image from "next/image";
import clsx from "clsx";
import BeautyBookingWizard from "./bookings/BeautyBookingWizard";

interface BeautyServicesSheetProps {
    isOpen: boolean;
    onClose: () => void;
    businessSlug: string;
}


// ============================================
// SERVICE DETAIL MODAL
// ============================================
function ServiceDetailModal({
    service,
    isOpen,
    onClose,
    onBook,
    getCategoryName,
}: {
    service: Service | null;
    isOpen: boolean;
    onClose: () => void;
    onBook: (service: Service) => void;
    getCategoryName: (id: string) => string;
}) {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    if (!service) return null;

    const mainImage = service.images?.[0]?.url || service.images?.[0];

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        onClick={onClose}
                        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md"
                    />

                    {/* Sheet */}
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 32, stiffness: 380, mass: 0.8 }}
                        className="fixed inset-x-0 bottom-0 z-[100] h-[85vh] sm:h-auto sm:max-h-[80vh] flex flex-col"
                    >
                        <div className="bg-gradient-to-b from-white via-white to-rose-50/30 rounded-t-[2rem] shadow-[0_-20px_60px_-15px_rgba(0,0,0,0.3)] flex flex-col h-full overflow-hidden">
                            {/* Handle */}
                            <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
                                <div className="w-10 h-1 rounded-full bg-gray-300" />
                            </div>

                            {/* Close Button */}
                            <button
                                onClick={onClose}
                                className="absolute top-3 right-3 z-50 w-10 h-10 flex items-center justify-center rounded-full bg-gray-800/90 text-white shadow-lg"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto px-5 pb-4">
                                {/* Image */}
                                {mainImage && (
                                    <div className="relative w-full aspect-[4/3] mb-4 rounded-2xl overflow-hidden bg-gradient-to-br from-rose-100 to-pink-100">
                                        <Image
                                            src={typeof mainImage === 'string' ? mainImage : ''}
                                            alt={service.name}
                                            fill
                                            className="object-cover"
                                        />
                                        {/* Gradient overlay */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                                    </div>
                                )}

                                {/* Category Badge */}
                                <div className="mb-2">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-rose-100 to-pink-100 text-rose-600 text-xs font-bold rounded-full">
                                        <Sparkles className="w-3 h-3" />
                                        {getCategoryName(service.categoryId)}
                                    </span>
                                </div>

                                {/* Title & Price */}
                                <h2 className="text-2xl font-bold text-gray-900 mb-1">{service.name}</h2>
                                <div className="flex items-center gap-3 mb-4">
                                    <span className="text-2xl font-bold text-rose-600">
                                        {formatPrice(service.price, service.currency)}
                                    </span>
                                    <span className="flex items-center gap-1 text-gray-500 text-sm bg-gray-100 px-2 py-1 rounded-lg">
                                        <Clock className="w-4 h-4" />
                                        {formatDuration(service.duration)}
                                    </span>
                                </div>

                                {/* Description */}
                                {service.description && (
                                    <div className="mb-6">
                                        <h3 className="font-semibold text-gray-900 mb-2">Hizmet Detayı</h3>
                                        <p className="text-gray-600 text-sm leading-relaxed">{service.description}</p>
                                    </div>
                                )}

                                {/* Features */}
                                <div className="grid grid-cols-3 gap-2 mb-4">
                                    <div className="p-3 bg-rose-50 rounded-xl text-center">
                                        <Clock className="w-5 h-5 text-rose-500 mx-auto mb-1" />
                                        <div className="text-xs text-gray-600">Süre</div>
                                        <div className="text-sm font-bold text-gray-900">{formatDuration(service.duration)}</div>
                                    </div>
                                    <div className="p-3 bg-pink-50 rounded-xl text-center">
                                        <Heart className="w-5 h-5 text-pink-500 mx-auto mb-1" />
                                        <div className="text-xs text-gray-600">Kategori</div>
                                        <div className="text-sm font-bold text-gray-900 truncate">{getCategoryName(service.categoryId)}</div>
                                    </div>
                                    <div className="p-3 bg-purple-50 rounded-xl text-center">
                                        <Star className="w-5 h-5 text-purple-500 mx-auto mb-1" />
                                        <div className="text-xs text-gray-600">Premium</div>
                                        <div className="text-sm font-bold text-gray-900">Hizmet</div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="border-t border-gray-100 p-4 bg-white/80 backdrop-blur-xl">
                                <button
                                    onClick={() => onBook(service)}
                                    className="w-full py-4 bg-gradient-to-r from-rose-500 to-pink-600 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-rose-500/25 hover:shadow-rose-500/40 transition-all active:scale-[0.98]"
                                >
                                    <MessageCircle className="w-5 h-5" />
                                    WhatsApp ile Bilgi Al
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

// ============================================
// MAIN COMPONENT
// ============================================
export default function BeautyServicesSheet({ isOpen, onClose, businessSlug }: BeautyServicesSheetProps) {
    const [loading, setLoading] = useState(true);
    const [categories, setCategories] = useState<ServiceCategory[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [businessName, setBusinessName] = useState("");
    const [whatsappNumber, setWhatsappNumber] = useState("");
    const [activeCategory, setActiveCategory] = useState<string>("all");

    const [showDetail, setShowDetail] = useState(false);
    const [detailService, setDetailService] = useState<Service | null>(null);
    const [showBookingWizard, setShowBookingWizard] = useState(false);
    const [bookingService, setBookingService] = useState<Service | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Fetch data immediately on mount (prefetch for instant UX)
    useEffect(() => {
        if (services.length > 0) return; // Already loaded
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [businessSlug]);

    const loadData = async () => {
        setLoading(true);

        // === CACHE-FIRST: Check if data was prefetched ===
        const cached = getCachedBeautyData(businessSlug);
        if (cached) {
            // Use cached data - INSTANT loading!
            setCategories(cached.categories || []);
            setServices(cached.services || []);
            setBusinessName(cached.businessName || "");
            setWhatsappNumber(cached.whatsappNumber || "");
            setLoading(false);
            return; // Done - no API call needed!
        }

        // === FALLBACK: Fetch from API if not cached ===
        try {
            const res = await fetch(`/api/beauty/public-services?businessSlug=${businessSlug}`);
            const data = await res.json();

            if (data.success) {
                setCategories(data.data.categories || []);
                setServices(data.data.services || []);
                setBusinessName(data.data.businessName || "");
                setWhatsappNumber(data.data.whatsappNumber || "");
            }
        } catch (error) {
            console.error("Load error:", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredServices = activeCategory === "all"
        ? services
        : services.filter(s => s.categoryId === activeCategory);

    const getCategoryName = (categoryId: string) => {
        return categories.find(c => c.id === categoryId)?.name || "";
    };

    const openDetail = (service: Service) => {
        setDetailService(service);
        setShowDetail(true);
    };

    const handleBookAppointment = (service: Service) => {
        setShowDetail(false);
        // Open WhatsApp with service info
        const message = `Merhaba! ${service.name} hizmeti hakkında bilgi almak istiyorum.

📋 *Hizmet:* ${service.name}
⏱️ *Süre:* ${formatDuration(service.duration)}
💰 *Fiyat:* ${formatPrice(service.price, service.currency)}

Müsaitlik durumunuz hakkında bilgi alabilir miyim?

_Tık Profil tarafından yönlendirilmiştir_`;
        const phone = whatsappNumber?.replace(/\D/g, '') || '';
        const url = `https://wa.me/${phone.startsWith('90') ? phone : '90' + phone}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    };



    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
                    className="overflow-hidden w-full col-span-2"
                    style={{ marginTop: '1rem' }}
                >
                    {/* Inline Container */}
                    <div ref={containerRef} className="relative rounded-2xl overflow-hidden border border-rose-200/60 bg-white shadow-xl">
                        {/* Background - Feminine gradient */}
                        <div className="absolute inset-0 bg-gradient-to-br from-rose-50/50 via-white to-pink-50/30" />

                        {/* Header - Rose themed */}
                        <div className="relative px-5 py-4 flex items-center justify-between border-b border-rose-100">
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-rose-200">
                                    <Sparkles className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 text-lg">Hizmetlerimiz</h3>
                                    <p className="text-xs text-rose-500 font-medium">{businessName}</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:bg-rose-100 hover:text-rose-500 transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="relative p-4">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-16">
                                    <div className="w-10 h-10 border-3 border-rose-500 border-t-transparent rounded-full animate-spin mb-3" />
                                    <p className="text-sm text-rose-400 font-medium">Hizmetler yükleniyor...</p>
                                </div>
                            ) : filteredServices.length === 0 ? (
                                <div className="text-center py-16 min-h-[250px] flex flex-col items-center justify-center">
                                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-rose-100 to-pink-100 flex items-center justify-center mb-4">
                                        <Sparkles className="w-10 h-10 text-rose-400" />
                                    </div>
                                    <p className="text-gray-600 font-semibold text-lg">Henüz hizmet eklenmemiş</p>
                                    <p className="text-gray-400 text-sm mt-1">Hizmetler eklendiğinde burada görünecek</p>
                                </div>
                            ) : (
                                <>
                                    {/* RANDEVU AL CARD - Premium Booking Card */}
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="mb-4 p-4 bg-gradient-to-r from-rose-500 via-pink-500 to-purple-500 rounded-2xl shadow-xl shadow-rose-200 relative overflow-hidden"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-white/5" />
                                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                                        <div className="relative flex items-center justify-between">
                                            <div>
                                                <h3 className="text-white font-bold text-lg">Online Randevu Al</h3>
                                                <p className="text-white/80 text-sm">Hızlı ve kolay randevu sistemi</p>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    if (filteredServices.length > 0) {
                                                        setBookingService(filteredServices[0]);
                                                        setShowBookingWizard(true);
                                                    }
                                                }}
                                                className="px-5 py-3 bg-white text-rose-600 font-bold rounded-xl shadow-lg hover:bg-rose-50 transition-all active:scale-95 flex items-center gap-2"
                                            >
                                                <Calendar className="w-5 h-5" />
                                                Randevu Al
                                            </button>
                                        </div>
                                    </motion.div>
                                    {/* Category Pills - Rose themed */}
                                    <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide mb-2">
                                        <button
                                            onClick={() => setActiveCategory("all")}
                                            className={clsx(
                                                "flex-shrink-0 px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all",
                                                activeCategory === "all"
                                                    ? "bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-200"
                                                    : "bg-white border border-rose-200 text-gray-600 hover:border-rose-300 hover:bg-rose-50"
                                            )}
                                        >
                                            ✨ Tümü
                                        </button>
                                        {categories.map(cat => (
                                            <button
                                                key={cat.id}
                                                onClick={() => setActiveCategory(cat.id)}
                                                className={clsx(
                                                    "flex-shrink-0 px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2",
                                                    activeCategory === cat.id
                                                        ? "bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-200"
                                                        : "bg-white border border-rose-200 text-gray-600 hover:border-rose-300 hover:bg-rose-50"
                                                )}
                                            >
                                                <span>{cat.icon || '💅'}</span>
                                                {cat.name}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Services Grid - 2 columns like Emlak */}
                                    <div className="grid grid-cols-2 gap-3">
                                        {filteredServices.map((service, index) => {
                                            const mainImage = service.images?.[0]?.url || service.images?.[0];
                                            const hasImage = !!mainImage;

                                            return (
                                                <motion.div
                                                    key={service.id}
                                                    initial={{ opacity: 0, y: 15 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: index * 0.05 }}
                                                    onClick={() => openDetail(service)}
                                                    className="group bg-white rounded-2xl border border-rose-100 hover:border-rose-300 hover:shadow-xl hover:shadow-rose-100/50 cursor-pointer transition-all overflow-hidden"
                                                >
                                                    {/* Image Container */}
                                                    <div className="relative h-32 bg-gradient-to-br from-rose-100 via-pink-50 to-purple-100 overflow-hidden">
                                                        {hasImage ? (
                                                            <Image
                                                                src={typeof mainImage === 'string' ? mainImage : ''}
                                                                alt={service.name}
                                                                fill
                                                                className="object-cover transition-transform duration-500 group-hover:scale-110"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center">
                                                                <div className="text-4xl opacity-50">
                                                                    {categories.find(c => c.id === service.categoryId)?.icon || '💅'}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Gradient overlay */}
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

                                                        {/* Duration badge - Top right */}
                                                        <div className="absolute top-2 right-2 px-2 py-1 bg-white/90 backdrop-blur-sm rounded-lg flex items-center gap-1 text-xs font-bold text-gray-700">
                                                            <Clock className="w-3 h-3" />
                                                            {formatDuration(service.duration)}
                                                        </div>

                                                        {/* Category badge - Bottom */}
                                                        <div className="absolute bottom-0 left-0 right-0 p-2">
                                                            <span className="inline-block px-2 py-0.5 bg-rose-500/90 backdrop-blur-sm text-white text-[10px] font-bold rounded-full">
                                                                {getCategoryName(service.categoryId)}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Content */}
                                                    <div className="p-3">
                                                        {/* Title */}
                                                        <h4 className="font-bold text-gray-900 text-sm line-clamp-1 mb-1">
                                                            {service.name}
                                                        </h4>

                                                        {/* Description */}
                                                        {service.description && (
                                                            <p className="text-gray-500 text-[11px] line-clamp-2 mb-2">
                                                                {service.description}
                                                            </p>
                                                        )}

                                                        {/* Price & Book button */}
                                                        <div className="flex items-center justify-between mt-auto pt-2 border-t border-rose-50">
                                                            <span className="font-bold text-rose-600 text-base">
                                                                {formatPrice(service.price, service.currency)}
                                                            </span>
                                                            <span className="px-3 py-1.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white text-[10px] font-bold rounded-full">
                                                                Detay
                                                            </span>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Service Detail Modal (Portal) */}
                    {mounted && showDetail && (
                        createPortal(
                            <ServiceDetailModal
                                service={detailService}
                                isOpen={showDetail}
                                onClose={() => {
                                    setShowDetail(false);
                                    setDetailService(null);
                                }}
                                onBook={handleBookAppointment}
                                getCategoryName={getCategoryName}
                            />,
                            document.body
                        )
                    )}

                    {/* Booking Wizard (Portal) */}
                    {mounted && showBookingWizard && bookingService && (
                        createPortal(
                            <BeautyBookingWizard
                                service={bookingService}
                                businessName={businessName}
                                onClose={() => {
                                    setShowBookingWizard(false);
                                    setBookingService(null);
                                }}
                            />,
                            document.body
                        )
                    )}

                </motion.div>
            )}
        </AnimatePresence>
    );
}

