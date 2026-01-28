"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Clock, MessageCircle, Calendar, Stethoscope, Heart, Star, LayoutGrid, Building2, User, Phone, ChevronLeft, Check } from "lucide-react";
import Image from "next/image";
import clsx from "clsx";

// Clinic Service Types
interface ServiceCategory {
    id: string;
    name: string;
    nameEn?: string;
    icon?: string;
}

interface Service {
    id: string;
    name: string;
    nameEn?: string;
    description?: string;
    descriptionEn?: string;
    price: number;
    duration?: number;
    image?: string;
    categoryId: string;
}

interface WorkingHours {
    start: string;
    end: string;
    isActive: boolean;
}

interface ClinicSettings {
    workingHours: Record<string, WorkingHours>;
    requirePhone: boolean;
    requireEmail: boolean;
}

interface ClinicServicesSheetProps {
    isOpen: boolean;
    onClose: () => void;
    businessSlug: string;
}

type TabType = "services" | "appointment";

// Format price helper
const formatPrice = (price: number) => {
    if (!price || price === 0) return "Fiyat için arayın";
    return new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: 'TRY',
        minimumFractionDigits: 0,
    }).format(price);
};

// Format duration helper
const formatDuration = (minutes?: number) => {
    if (!minutes) return "-";
    if (minutes < 60) return `${minutes} dk`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) return `${hours} saat`;
    return `${hours} sa ${remainingMinutes} dk`;
};

// Get Turkish day name
const getDayName = (date: Date) => {
    const days = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
    return days[date.getDay() === 0 ? 6 : date.getDay() - 1];
};

// Get Turkish month name
const getMonthName = (date: Date) => {
    const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
    return months[date.getMonth()];
};

// Generate time slots based on working hours
const generateTimeSlots = (start: string, end: string): string[] => {
    const slots: string[] = [];
    const [startHour, startMin] = start.split(':').map(Number);
    const [endHour, endMin] = end.split(':').map(Number);
    
    let currentHour = startHour;
    let currentMin = startMin;
    
    while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
        slots.push(`${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`);
        currentMin += 30;
        if (currentMin >= 60) {
            currentMin = 0;
            currentHour++;
        }
    }
    
    return slots;
};

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
                        <div className="bg-white rounded-t-[2rem] shadow-[0_-20px_60px_-15px_rgba(0,0,0,0.3)] flex flex-col h-full overflow-hidden">
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
                                {service.image && (
                                    <div className="relative w-full aspect-[4/3] mb-4 rounded-2xl overflow-hidden bg-purple-50">
                                        <Image
                                            src={service.image}
                                            alt={service.name}
                                            fill
                                            className="object-cover"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                                    </div>
                                )}

                                {/* Category Badge */}
                                <div className="mb-2">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-100 text-purple-600 text-xs font-bold rounded-full">
                                        <Stethoscope className="w-3 h-3" />
                                        {getCategoryName(service.categoryId)}
                                    </span>
                                </div>

                                {/* Title & Price */}
                                <h2 className="text-2xl font-bold text-gray-900 mb-1">{service.name}</h2>
                                <div className="flex items-center gap-3 mb-4">
                                    <span className="text-2xl font-bold text-purple-600">
                                        {formatPrice(service.price)}
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
                                    <div className="p-3 bg-purple-50 rounded-xl text-center">
                                        <Clock className="w-5 h-5 text-purple-500 mx-auto mb-1" />
                                        <div className="text-xs text-gray-600">Süre</div>
                                        <div className="text-sm font-bold text-gray-900">{formatDuration(service.duration)}</div>
                                    </div>
                                    <div className="p-3 bg-purple-50 rounded-xl text-center">
                                        <Heart className="w-5 h-5 text-purple-500 mx-auto mb-1" />
                                        <div className="text-xs text-gray-600">Kategori</div>
                                        <div className="text-sm font-bold text-gray-900 truncate">{getCategoryName(service.categoryId)}</div>
                                    </div>
                                    <div className="p-3 bg-purple-50 rounded-xl text-center">
                                        <Star className="w-5 h-5 text-purple-500 mx-auto mb-1" />
                                        <div className="text-xs text-gray-600">Profesyonel</div>
                                        <div className="text-sm font-bold text-gray-900">Hizmet</div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="border-t border-gray-100 p-4 bg-white/80 backdrop-blur-xl">
                                <button
                                    onClick={() => onBook(service)}
                                    className="w-full py-4 bg-purple-600 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg hover:bg-purple-700 transition-all active:scale-[0.98]"
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
// APPOINTMENT TAB COMPONENT
// ============================================
function AppointmentTab({ 
    services, 
    categories,
    settings,
    businessName,
    whatsappNumber,
    onClose 
}: { 
    services: Service[];
    categories: ServiceCategory[];
    settings: ClinicSettings | null;
    businessName: string;
    whatsappNumber: string;
    onClose: () => void;
}) {
    const [step, setStep] = useState<'service' | 'form'>('service');
    const [selectedService, setSelectedService] = useState<Service | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedTime, setSelectedTime] = useState<string>('');
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        notes: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Generate next 14 days
    const dates = Array.from({ length: 14 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() + i);
        return date;
    });

    // Get today's working hours
    const getTodayWorkingHours = () => {
        if (!settings?.workingHours) return { start: '09:00', end: '18:00', isActive: true };
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const today = dayNames[new Date().getDay()];
        return settings.workingHours[today] || { start: '09:00', end: '18:00', isActive: true };
    };

    const workingHours = getTodayWorkingHours();
    const timeSlots = workingHours.isActive ? generateTimeSlots(workingHours.start, workingHours.end) : [];

    const handleServiceSelect = (service: Service) => {
        setSelectedService(service);
        setStep('form');
    };

    const handleSubmit = async () => {
        if (!selectedService || !selectedDate || !selectedTime || !formData.name || !formData.phone) return;

        setIsSubmitting(true);

        // Format date
        const dateStr = selectedDate.toLocaleDateString('tr-TR', { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
        });

        // Create WhatsApp message
        const message = `Merhaba ${businessName}! 👋

Randevu talebim var:

👤 *İsim:* ${formData.name}
📱 *Telefon:* ${formData.phone}
📋 *Hizmet:* ${selectedService.name}
📅 *Tarih:* ${dateStr}
🕐 *Saat:* ${selectedTime}
${formData.notes ? `📝 *Not:* ${formData.notes}` : ''}

Müsaitlik durumunuzu kontrol edip dönüş yapabilir misiniz?

_Tık Profil üzerinden gönderildi_`;

        const phone = whatsappNumber?.replace(/\D/g, '') || '';
        const url = `https://wa.me/${phone.startsWith('90') ? phone : '90' + phone}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');

        setIsSubmitting(false);
        onClose();
    };

    const isFormValid = () => {
        return formData.name.trim() && 
               formData.phone.trim() && 
               selectedDate && 
               selectedTime &&
               selectedService;
    };

    if (step === 'service') {
        return (
            <div className="space-y-4">
                <div className="text-center mb-4">
                    <h3 className="font-bold text-gray-900">Randevu Al</h3>
                    <p className="text-sm text-gray-500">Hizmet seçerek randevunuzu oluşturun</p>
                </div>

                {services.length === 0 ? (
                    <div className="text-center py-8">
                        <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-3">
                            <Stethoscope className="w-8 h-8 text-purple-400" />
                        </div>
                        <p className="text-gray-500">Henüz hizmet eklenmemiş</p>
                    </div>
                ) : (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                        {services.map((service) => (
                            <button
                                key={service.id}
                                onClick={() => handleServiceSelect(service)}
                                className="w-full p-4 bg-white border border-gray-200 rounded-xl flex items-center gap-3 hover:border-purple-400 hover:bg-purple-50/50 transition-all text-left"
                            >
                                <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                                    {service.image ? (
                                        <Image 
                                            src={service.image} 
                                            alt={service.name} 
                                            width={48} 
                                            height={48} 
                                            className="w-full h-full object-cover rounded-lg"
                                        />
                                    ) : (
                                        <Stethoscope className="w-6 h-6 text-purple-500" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold text-gray-900 truncate">{service.name}</h4>
                                    <p className="text-sm text-gray-500">
                                        {formatDuration(service.duration)} • {formatPrice(service.price)}
                                    </p>
                                </div>
                                <ChevronLeft className="w-5 h-5 text-gray-400 rotate-180" />
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Back Button */}
            <button
                onClick={() => setStep('service')}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-purple-600 transition-colors"
            >
                <ChevronLeft className="w-4 h-4" />
                Hizmet Seçimine Dön
            </button>

            {/* Selected Service */}
            {selectedService && (
                <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                            <Stethoscope className="w-5 h-5 text-purple-600" />
                        </div>
                        <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">{selectedService.name}</h4>
                            <p className="text-sm text-purple-600 font-medium">{formatPrice(selectedService.price)}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Name Input */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    İsim Soyisim
                </label>
                <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Adınız Soyadınız"
                        className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                </div>
            </div>

            {/* Phone Input */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Telefon
                </label>
                <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="05XX XXX XX XX"
                        className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                </div>
            </div>

            {/* Date Selection */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                    Tarih Seçin
                </label>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {dates.map((date, index) => {
                        const isSelected = selectedDate?.toDateString() === date.toDateString();
                        return (
                            <button
                                key={index}
                                onClick={() => setSelectedDate(date)}
                                className={clsx(
                                    "flex-shrink-0 w-16 py-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all",
                                    isSelected
                                        ? "border-purple-600 bg-purple-600 text-white"
                                        : "border-gray-200 bg-white text-gray-700 hover:border-purple-300"
                                )}
                            >
                                <span className="text-xs font-medium">{getDayName(date)}</span>
                                <span className="text-lg font-bold">{date.getDate()}</span>
                                <span className="text-[10px]">{getMonthName(date)}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Time Selection */}
            {selectedDate && (
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                        Saat Seçin
                    </label>
                    {timeSlots.length > 0 ? (
                        <div className="grid grid-cols-4 gap-2">
                            {timeSlots.map((time) => {
                                const isSelected = selectedTime === time;
                                return (
                                    <button
                                        key={time}
                                        onClick={() => setSelectedTime(time)}
                                        className={clsx(
                                            "py-2 px-1 rounded-lg border text-sm font-medium transition-all",
                                            isSelected
                                                ? "border-purple-600 bg-purple-600 text-white"
                                                : "border-gray-200 bg-white text-gray-700 hover:border-purple-300 hover:bg-purple-50"
                                        )}
                                    >
                                        {time}
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-4 bg-gray-50 rounded-xl">
                            <p className="text-sm text-gray-500">Bugün için müsait saat bulunmuyor</p>
                        </div>
                    )}
                </div>
            )}

            {/* Notes (Optional) */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Not <span className="text-gray-400 font-normal">(İsteğe bağlı)</span>
                </label>
                <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Eklemek istediğiniz bir not var mı?"
                    rows={3}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                />
            </div>

            {/* Submit Button */}
            <button
                onClick={handleSubmit}
                disabled={!isFormValid() || isSubmitting}
                className={clsx(
                    "w-full py-4 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all",
                    isFormValid() && !isSubmitting
                        ? "bg-purple-600 hover:bg-purple-700 shadow-lg"
                        : "bg-gray-300 cursor-not-allowed"
                )}
            >
                {isSubmitting ? (
                    <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Gönderiliyor...
                    </>
                ) : (
                    <>
                        <MessageCircle className="w-5 h-5" />
                        WhatsApp ile Randevu Oluştur
                    </>
                )}
            </button>

            <p className="text-xs text-center text-gray-400">
                Randevunuz WhatsApp üzerinden onaylanacaktır
            </p>
        </div>
    );
}

// ============================================
// MAIN COMPONENT
// ============================================
export default function ClinicServicesSheet({ isOpen, onClose, businessSlug }: ClinicServicesSheetProps) {
    const [loading, setLoading] = useState(true);
    const [categories, setCategories] = useState<ServiceCategory[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [settings, setSettings] = useState<ClinicSettings | null>(null);
    const [businessName, setBusinessName] = useState("");
    const [whatsappNumber, setWhatsappNumber] = useState("");
    const [activeCategory, setActiveCategory] = useState<string>("all");
    const [activeTab, setActiveTab] = useState<TabType>("services");

    const [showDetail, setShowDetail] = useState(false);
    const [detailService, setDetailService] = useState<Service | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Fetch data when opened
    useEffect(() => {
        if (isOpen && services.length === 0) {
            loadData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, businessSlug]);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/clinic/public-services?businessSlug=${businessSlug}`);
            const data = await res.json();

            if (data.success) {
                setCategories(data.data.categories || []);
                setServices(data.data.services || []);
                setBusinessName(data.data.businessName || "");
                setWhatsappNumber(data.data.whatsappNumber || "");
                setSettings(data.data.settings || null);
            }
        } catch (error) {
            console.error("[Clinic] Load error:", error);
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
        // Switch to appointment tab with pre-selected service
        setActiveTab("appointment");
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
                    <div ref={containerRef} className="relative rounded-2xl overflow-hidden border border-purple-200/60 bg-white shadow-xl">
                        {/* Header */}
                        <div className="relative px-5 py-4 flex items-center justify-between border-b border-purple-100">
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-full bg-purple-600 flex items-center justify-center text-white shadow-lg">
                                    <Stethoscope className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 text-lg">{businessName || 'Klinik'}</h3>
                                    <p className="text-xs text-purple-500 font-medium">Online Randevu</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:bg-purple-100 hover:text-purple-500 transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-gray-200">
                            <button
                                onClick={() => setActiveTab("services")}
                                className={clsx(
                                    "flex-1 py-3 px-4 flex items-center justify-center gap-2 text-sm font-medium transition-all",
                                    activeTab === "services"
                                        ? "text-purple-600 border-b-2 border-purple-600"
                                        : "text-gray-500 hover:text-gray-700"
                                )}
                            >
                                <LayoutGrid className="w-4 h-4" />
                                Hizmetler
                            </button>
                            <button
                                onClick={() => setActiveTab("appointment")}
                                className={clsx(
                                    "flex-1 py-3 px-4 flex items-center justify-center gap-2 text-sm font-medium transition-all",
                                    activeTab === "appointment"
                                        ? "text-purple-600 border-b-2 border-purple-600"
                                        : "text-gray-500 hover:text-gray-700"
                                )}
                            >
                                <Calendar className="w-4 h-4" />
                                Randevu Al
                            </button>
                        </div>

                        {/* Content */}
                        <div className="relative p-4">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-16">
                                    <div className="w-10 h-10 border-3 border-purple-500 border-t-transparent rounded-full animate-spin mb-3" />
                                    <p className="text-sm text-purple-400 font-medium">Yükleniyor...</p>
                                </div>
                            ) : activeTab === "services" ? (
                                <>
                                    {filteredServices.length === 0 ? (
                                        <div className="text-center py-16 min-h-[250px] flex flex-col items-center justify-center">
                                            <div className="w-20 h-20 rounded-full bg-purple-100 flex items-center justify-center mb-4">
                                                <Stethoscope className="w-10 h-10 text-purple-400" />
                                            </div>
                                            <p className="text-gray-600 font-semibold text-lg">Henüz hizmet eklenmemiş</p>
                                            <p className="text-gray-400 text-sm mt-1">Hizmetler eklendiğinde burada görünecek</p>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Category Pills - Purple themed */}
                                            <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide mb-2">
                                                <button
                                                    onClick={() => setActiveCategory("all")}
                                                    className={clsx(
                                                        "flex-shrink-0 px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2",
                                                        activeCategory === "all"
                                                            ? "bg-purple-600 text-white shadow-md"
                                                            : "bg-white border border-purple-200 text-gray-600 hover:border-purple-400 hover:bg-purple-50"
                                                    )}
                                                >
                                                    <LayoutGrid className="w-4 h-4" />
                                                    Tümü
                                                </button>
                                                {categories.map(cat => (
                                                    <button
                                                        key={cat.id}
                                                        onClick={() => setActiveCategory(cat.id)}
                                                        className={clsx(
                                                            "flex-shrink-0 px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2",
                                                            activeCategory === cat.id
                                                                ? "bg-purple-600 text-white shadow-md"
                                                                : "bg-white border border-purple-200 text-gray-600 hover:border-purple-400 hover:bg-purple-50"
                                                        )}
                                                    >
                                                        {cat.icon ? <span className="text-base">{cat.icon}</span> : <Building2 className="w-4 h-4" />}
                                                        {cat.name}
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Services Grid - 2 columns */}
                                            <div className="grid grid-cols-2 gap-3">
                                                {filteredServices.map((service, index) => {
                                                    return (
                                                        <motion.div
                                                            key={service.id}
                                                            initial={{ opacity: 0, y: 15 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            transition={{ delay: index * 0.05 }}
                                                            onClick={() => openDetail(service)}
                                                            className="group bg-white rounded-2xl border border-purple-100 hover:border-purple-300 hover:shadow-xl hover:shadow-purple-100/50 cursor-pointer transition-all overflow-hidden"
                                                        >
                                                            {/* Image Container */}
                                                            <div className="relative h-32 bg-purple-50 overflow-hidden">
                                                                {service.image ? (
                                                                    <Image
                                                                        src={service.image}
                                                                        alt={service.name}
                                                                        fill
                                                                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                                                                    />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center">
                                                                        <Building2 className="w-10 h-10 text-purple-300" />
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
                                                                    <span className="inline-block px-2 py-0.5 bg-purple-500/90 backdrop-blur-sm text-white text-[10px] font-bold rounded-full">
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
                                                                <div className="flex items-center justify-between mt-auto pt-2 border-t border-purple-50">
                                                                    <span className="font-bold text-purple-600 text-base">
                                                                        {formatPrice(service.price)}
                                                                    </span>
                                                                    <span className="px-3 py-1.5 bg-purple-600 text-white text-[10px] font-bold rounded-full">
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
                                </>
                            ) : (
                                <AppointmentTab
                                    services={services}
                                    categories={categories}
                                    settings={settings}
                                    businessName={businessName}
                                    whatsappNumber={whatsappNumber}
                                    onClose={onClose}
                                />
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
                </motion.div>
            )}
        </AnimatePresence>
    );
}
