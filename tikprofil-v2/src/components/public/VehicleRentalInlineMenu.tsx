"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X, Car, Calendar, User, Phone, MessageCircle, ChevronRight, Check, Loader2,
    Fuel, Users, Settings, ChevronLeft, Plus, Minus
} from "lucide-react";

// Settings2 yerine Settings kullanıyoruz, aynı ikon
import clsx from "clsx";
import { toR2ProxyUrl } from "@/lib/publicImage";
import { createPortal } from "react-dom";

// ============================================
// TYPES
// ============================================
interface Vehicle {
    id: string;
    brand: string;
    model: string;
    year: number;
    daily_price: number;
    deposit_amount?: number;
    fuel_type: string;
    transmission: string;
    seats: number;
    color?: string;
    plate?: string;
    description?: string;
    images?: { url: string; is_primary: boolean }[];
    category?: { id: string; name: string };
}

interface VehicleRentalInlineMenuProps {
    isOpen: boolean;
    businessSlug: string;
    businessName: string;
    whatsappNumber?: string;
    onClose: () => void;
    businessLogo?: string;
    primaryColor?: string;
}

// ============================================
// VEHICLE DETAIL MODAL
// ============================================
function VehicleDetailModal({
    vehicle,
    isOpen,
    onClose,
    onRent,
}: {
    vehicle: Vehicle | null;
    isOpen: boolean;
    onClose: () => void;
    onRent: (vehicle: Vehicle) => void;
}) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    if (!mounted || !vehicle) return null;

    const primaryImage = vehicle.images?.find(img => img.is_primary)?.url || vehicle.images?.[0]?.url;
    const formatPrice = (price: number) => new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(price);

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Premium Backdrop with blur */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-[100] bg-gradient-to-t from-black/80 via-black/40 to-black/60 backdrop-blur-md"
                    />
                    
                    <motion.div
                        initial={{ y: "100%", opacity: 0.8 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: "100%", opacity: 0.8 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="fixed inset-x-0 bottom-0 z-[100] max-h-[92vh]"
                    >
                        {/* Glassmorphism Container */}
                        <div className="relative bg-white/95 backdrop-blur-2xl rounded-t-[2.5rem] shadow-[0_-20px_60px_-15px_rgba(0,0,0,0.3)] flex flex-col max-h-[92vh] overflow-hidden border-t border-white/50">
                            {/* Decorative gradient line */}
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500" />
                            
                            {/* Drag Handle */}
                            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-gray-300/80 rounded-full" />

                            {/* Vehicle Image - Premium Header - Responsive */}
                            <div className="relative w-full h-48 sm:h-56 md:h-64 flex-shrink-0 mt-4">
                                {primaryImage ? (
                                    <motion.div
                                        initial={{ scale: 1.1 }}
                                        animate={{ scale: 1 }}
                                        transition={{ duration: 0.5 }}
                                        className="relative w-full h-full"
                                    >
                                        <img
                                            src={toR2ProxyUrl(primaryImage)}
                                            alt={`${vehicle.brand} ${vehicle.model}`}
                                            className="w-full h-full object-cover rounded-t-[1.5rem] sm:rounded-t-[2rem]"
                                        />
                                        {/* Gradient overlay */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-purple-900/60 via-transparent to-transparent rounded-t-[1.5rem] sm:rounded-t-[2rem]" />
                                    </motion.div>
                                ) : (
                                    <div className="w-full h-full bg-purple-600 flex items-center justify-center rounded-t-[1.5rem] sm:rounded-t-[2rem] relative overflow-hidden">
                                        <motion.div
                                            animate={{ y: [0, -8, 0] }}
                                            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                        >
                                            <Car className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 text-white/90 drop-shadow-lg" />
                                        </motion.div>
                                    </div>
                                )}
                                
                                {/* Close Button - Glassmorphism */}
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={onClose}
                                    className="absolute top-3 right-3 sm:top-4 sm:right-4 w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-xl border border-white/30 text-white shadow-lg hover:bg-white/30 transition-all"
                                >
                                    <X className="w-4 h-4 sm:w-5 sm:h-5" />
                                </motion.button>
                                
                                {/* Price Badge - Premium Glass */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                    className="absolute bottom-3 left-3 sm:bottom-4 sm:left-5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl sm:rounded-2xl bg-white/20 backdrop-blur-xl border border-white/30 shadow-xl"
                                >
                                    <span className="text-base sm:text-lg font-bold text-white drop-shadow-md">{formatPrice(vehicle.daily_price)}</span>
                                    <span className="text-xs sm:text-sm text-white/80 ml-1">/gün</span>
                                </motion.div>
                                
                                {/* Year Badge - Purple */}
                                <motion.div
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.3 }}
                                    className="absolute bottom-3 right-3 sm:bottom-4 sm:right-5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl bg-purple-600 text-white text-xs sm:text-sm font-bold shadow-lg"
                                >
                                    {vehicle.year}
                                </motion.div>
                            </div>

                            {/* Scrollable Content */}
                            <div className="flex-1 overflow-y-auto px-6 pb-6">
                                {/* Vehicle Info - Premium Typography */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1 }}
                                    className="pt-6 pb-5 border-b border-gray-100/80"
                                >
                                    <h3 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent">
                                        {vehicle.brand} {vehicle.model}
                                    </h3>
                                    <div className="flex items-center gap-3 mt-3">
                                        {vehicle.category && (
                                            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-purple-50 text-purple-700 text-sm font-semibold border border-purple-100">
                                                <Car className="w-3.5 h-3.5" />
                                                {vehicle.category.name}
                                            </span>
                                        )}
                                        {vehicle.color && (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-50 text-gray-600 text-sm">
                                                <span
                                                    className="w-3 h-3 rounded-full border border-gray-200"
                                                    style={{ backgroundColor: vehicle.color.toLowerCase() }}
                                                />
                                                {vehicle.color}
                                            </span>
                                        )}
                                    </div>
                                </motion.div>

                                {/* Specs Grid - Responsive Premium Cards */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                    className="grid grid-cols-3 gap-2 sm:gap-3 py-4 sm:py-5 border-b border-gray-100/80"
                                >
                                    {[
                                        { icon: Fuel, label: 'Yakıt', value: vehicle.fuel_type },
                                        { icon: Settings, label: 'Vites', value: vehicle.transmission },
                                        { icon: Users, label: 'Koltuk', value: `${vehicle.seats} Kişi` },
                                    ].map((spec, idx) => (
                                        <motion.div
                                            key={spec.label}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.2 + idx * 0.1 }}
                                            className="text-center p-2 sm:p-4 bg-purple-50/50 rounded-xl sm:rounded-2xl border border-purple-100 hover:border-purple-300 hover:shadow-md transition-all group"
                                        >
                                            <div className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-1 sm:mb-2 rounded-lg sm:rounded-xl bg-purple-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                <spec.icon className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                                            </div>
                                            <p className="text-[10px] sm:text-xs text-purple-400 font-medium uppercase tracking-wide">{spec.label}</p>
                                            <p className="text-xs sm:text-sm font-bold text-gray-800 capitalize mt-0.5">{spec.value}</p>
                                        </motion.div>
                                    ))}
                                </motion.div>

                                {/* Description - Premium Card */}
                                {vehicle.description && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.3 }}
                                        className="py-5 border-b border-gray-100/80"
                                    >
                                        <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                                            <span className="w-1 h-5 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full" />
                                            Araç Özellikleri
                                        </h4>
                                        <p className="text-sm text-gray-600 leading-relaxed bg-gray-50/50 p-4 rounded-xl">
                                            {vehicle.description}
                                        </p>
                                    </motion.div>
                                )}

                                {/* Deposit Info - Premium Alert */}
                                {vehicle.deposit_amount && vehicle.deposit_amount > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 0.4 }}
                                        className="py-4"
                                    >
                                        <div className="flex items-start gap-3 text-amber-700 bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-2xl border border-amber-100">
                                            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                                                <AlertTriangle className="w-5 h-5 text-amber-600" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-sm">Depozito Bilgisi</p>
                                                <p className="text-sm text-amber-600/80 mt-0.5">
                                                    {formatPrice(vehicle.deposit_amount)} depozito tahsil edilecektir.
                                                </p>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </div>

                            {/* Premium Bottom Bar - Responsive */}
                            <motion.div
                                initial={{ y: 100 }}
                                animate={{ y: 0 }}
                                transition={{ delay: 0.3, type: "spring", stiffness: 300 }}
                                className="p-3 sm:p-5 bg-white border-t border-gray-100 safe-bottom flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4"
                            >
                                <div className="flex-1 text-center sm:text-left">
                                    <p className="text-[10px] sm:text-xs text-gray-400 font-medium uppercase tracking-wide">Günlük Fiyat</p>
                                    <p className="text-xl sm:text-2xl font-bold text-purple-600">
                                        {formatPrice(vehicle.daily_price)}
                                    </p>
                                </div>
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => { onRent(vehicle); onClose(); }}
                                    className="w-full sm:w-auto sm:flex-1 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all bg-purple-600 text-white shadow-xl shadow-purple-500/25 hover:bg-purple-700 hover:shadow-purple-500/40"
                                >
                                    Hemen Kirala
                                    <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                                </motion.button>
                            </motion.div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>,
        document.body
    );
}

// AlertTriangle icon component (missing import)
function AlertTriangle({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
    );
}

// ============================================
// RENTAL FORM MODAL
// ============================================
function RentalFormModal({
    vehicle,
    isOpen,
    onClose,
    businessName,
    whatsappNumber,
}: {
    vehicle: Vehicle | null;
    isOpen: boolean;
    onClose: () => void;
    businessName: string;
    whatsappNumber?: string;
}) {
    const [mounted, setMounted] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [days, setDays] = useState(1);
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        setMounted(true);
        // Set default date to tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        setStartDate(tomorrow.toISOString().split('T')[0]);
    }, []);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    if (!mounted || !vehicle) return null;

    const formatPrice = (price: number) => new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(price);
    const totalPrice = days * vehicle.daily_price;

    const handleSubmit = () => {
        if (!name || !phone || !startDate || !whatsappNumber) return;

        setSubmitting(true);

        const start = new Date(startDate);
        const end = new Date(start);
        end.setDate(start.getDate() + days - 1);

        const message = `Merhaba ${businessName}! 👋

Araç kiralama talebim var:

🚗 Araç: ${vehicle.brand} ${vehicle.model} (${vehicle.year})
📅 Başlangıç: ${startDate}
📅 Bitiş: ${end.toISOString().split('T')[0]}
⏱️ Süre: ${days} gün
💰 Tahmini Tutar: ${formatPrice(totalPrice)}

👤 Müşteri: ${name}
📱 Telefon: ${phone}

Onayınızı bekliyorum.`;

        const cleanPhone = whatsappNumber.replace(/\D/g, '');
        const phoneWithCountry = cleanPhone.startsWith('90') ? cleanPhone : '90' + cleanPhone;
        const url = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');

        setSubmitting(false);
        onClose();
    };

    const isValid = name.trim().length >= 2 && phone.trim().length >= 10 && startDate;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-[101] bg-black/60 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 30, stiffness: 350 }}
                        className="fixed inset-x-0 bottom-0 z-[101] max-h-[90vh] sm:max-w-lg sm:left-1/2 sm:-translate-x-1/2 sm:rounded-t-3xl"
                    >
                        <div className="bg-white rounded-t-3xl shadow-2xl flex flex-col max-h-[90vh] sm:rounded-2xl sm:max-h-[85vh]">
                            {/* Header */}
                            <div className="flex items-center gap-3 px-4 sm:px-5 py-3 sm:py-4 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-pink-50">
                                <button onClick={onClose} className="p-2 -ml-2 rounded-full hover:bg-white/80 transition-colors">
                                    <ChevronLeft className="w-5 h-5 text-purple-700" />
                                </button>
                                <h2 className="text-base sm:text-lg font-bold text-gray-900">Kiralama Bilgileri</h2>
                            </div>

                            {/* Scrollable Content */}
                            <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-3 sm:py-4 space-y-4 sm:space-y-5">
                                {/* Vehicle Summary */}
                                <div className="flex items-center gap-3 p-2.5 sm:p-3 bg-purple-50 rounded-xl border border-purple-100">
                                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
                                        <Car className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-gray-900 truncate text-sm sm:text-base">{vehicle.brand} {vehicle.model}</p>
                                        <p className="text-xs sm:text-sm text-purple-600 font-medium">{formatPrice(vehicle.daily_price)}/gün</p>
                                    </div>
                                </div>

                                {/* Date Selection */}
                                <div>
                                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                                        <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 inline mr-1 text-purple-600" />
                                        Başlangıç Tarihi
                                    </label>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        min={new Date().toISOString().split('T')[0]}
                                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none transition-all text-gray-900 text-sm sm:text-base"
                                    />
                                </div>

                                {/* Days Selection */}
                                <div>
                                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                                        Kiralama Süresi <span className="text-purple-600 font-bold">({days} Gün)</span>
                                    </label>
                                    <div className="flex items-center gap-2 sm:gap-3">
                                        <button
                                            onClick={() => setDays(Math.max(1, days - 1))}
                                            className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                                        >
                                            <Minus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                        </button>
                                        <span className="flex-1 text-center text-lg sm:text-xl font-bold text-purple-600">{days}</span>
                                        <button
                                            onClick={() => setDays(days + 1)}
                                            className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-purple-600 text-white flex items-center justify-center hover:bg-purple-700 transition-all shadow-lg shadow-purple-500/25"
                                        >
                                            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Total */}
                                <div className="p-3 sm:p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg sm:rounded-xl border border-purple-100">
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600 font-medium text-sm sm:text-base">Toplam Tutar</span>
                                        <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">{formatPrice(totalPrice)}</span>
                                    </div>
                                </div>

                                {/* Customer Info */}
                                <div className="space-y-2.5 sm:space-y-3">
                                    <div>
                                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                                            <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 inline mr-1 text-purple-600" />
                                            Ad Soyad
                                        </label>
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="Adınız ve soyadınız"
                                            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none transition-all text-sm sm:text-base"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                                            <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4 inline mr-1 text-purple-600" />
                                            Telefon
                                        </label>
                                        <input
                                            type="tel"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            placeholder="05XX XXX XX XX"
                                            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none transition-all text-sm sm:text-base"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="p-3 sm:p-4 bg-white border-t border-gray-100 safe-bottom">
                                <button
                                    onClick={handleSubmit}
                                    disabled={!isValid || submitting}
                                    className={clsx(
                                        "w-full py-3 sm:py-4 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all",
                                        isValid
                                            ? "bg-purple-600 text-white shadow-xl shadow-purple-500/25 hover:bg-purple-700 hover:shadow-purple-500/40 active:scale-[0.98]"
                                            : "bg-gray-200 text-gray-400 cursor-not-allowed"
                                    )}
                                >
                                    {submitting ? (
                                        <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                                    ) : (
                                        <>
                                            <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                                            WhatsApp ile Gönder
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>,
        document.body
    );
}

// ============================================
// MAIN COMPONENT
// ============================================
export function VehicleRentalInlineMenu({
    isOpen,
    businessSlug,
    businessName,
    whatsappNumber,
    onClose,
}: VehicleRentalInlineMenuProps) {
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);
    const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
    const [showDetail, setShowDetail] = useState(false);
    const [showForm, setShowForm] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (isOpen) {
            loadVehicles();
        }
    }, [isOpen, businessSlug]);

    const loadVehicles = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/vehicle-rental/public-vehicles?businessSlug=${businessSlug}`);
            const data = await res.json();
            if (data.success) {
                setVehicles(data.vehicles || []);
            }
        } catch (error) {
            console.error('Load vehicles error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleVehicleClick = (vehicle: Vehicle) => {
        setSelectedVehicle(vehicle);
        setShowDetail(true);
    };

    const handleRentClick = (vehicle: Vehicle) => {
        setSelectedVehicle(vehicle);
        setShowForm(true);
    };

    const formatPrice = (price: number) => new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(price);

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
                    <div className="relative rounded-2xl overflow-hidden border border-gray-200/60 bg-white shadow-elevated">
                        {/* Background */}
                        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-gray-100" />

                        {/* Header */}
                        <div className="relative px-6 py-5 flex items-center justify-between border-b border-gray-100">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                                    <Car className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">Araç Kiralama</h3>
                                    <p className="text-xs text-gray-500 font-medium">{vehicles.length} araç müsait</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-12">
                                    <Loader2 className="w-8 h-8 animate-spin text-purple-500 mb-2" />
                                    <p className="text-sm text-gray-400 font-medium">Araçlar yükleniyor...</p>
                                </div>
                            ) : vehicles.length === 0 ? (
                                <div className="text-center py-16 min-h-[200px] flex flex-col items-center justify-center">
                                    <div className="w-16 h-16 rounded-full bg-purple-50 flex items-center justify-center mb-4">
                                        <Car className="w-8 h-8 text-purple-400" />
                                    </div>
                                    <p className="text-gray-500 font-medium">Henüz araç eklenmemiş</p>
                                    <p className="text-gray-400 text-sm mt-1">Araçlar eklendiğinde burada görünecek</p>
                                </div>
                            ) : (
                                <>
                                {/* Responsive Grid - 1 col mobile, 2 col tablet+ */}
                                <div className="grid grid-cols-1 gap-4">
                                    {vehicles.map((vehicle, index) => {
                                        const primaryImage = vehicle.images?.find(img => img.is_primary)?.url || vehicle.images?.[0]?.url;
                                        
                                        return (
                                            <motion.div
                                                key={vehicle.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: index * 0.05 }}
                                                className="group relative bg-white rounded-2xl border border-gray-200 hover:border-purple-300 hover:shadow-lg transition-all duration-200 overflow-hidden"
                                            >
                                                {/* Image Area - Responsive height */}
                                                <div 
                                                    onClick={() => handleVehicleClick(vehicle)}
                                                    className="relative w-full h-40 sm:h-44 cursor-pointer overflow-hidden"
                                                >
                                                    {primaryImage ? (
                                                        <img 
                                                            src={toR2ProxyUrl(primaryImage)} 
                                                            alt={`${vehicle.brand || ''} ${vehicle.model || ''}`}
                                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center bg-purple-100">
                                                            <Car className="w-12 h-12 sm:w-16 sm:h-16 text-purple-400" />
                                                        </div>
                                                    )}
                                                    {/* Year Badge - Purple gradient */}
                                                    <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-purple-600 text-white text-xs font-bold shadow-lg">
                                                        {vehicle.year || '-'}
                                                    </div>
                                                    {/* Category Badge */}
                                                    {vehicle.category?.name && (
                                                        <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-white/90 backdrop-blur-sm text-purple-700 text-xs font-bold shadow-md border border-purple-100">
                                                            {vehicle.category.name}
                                                        </div>
                                                    )}
                                                    {/* Gradient Overlay */}
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </div>

                                                {/* Content Area */}
                                                <div className="p-3 sm:p-4">
                                                    {/* Title */}
                                                    <h4 
                                                        onClick={() => handleVehicleClick(vehicle)}
                                                        className="font-bold text-lg sm:text-xl text-gray-900 group-hover:text-purple-700 transition-colors cursor-pointer leading-tight truncate"
                                                    >
                                                        {vehicle.brand || 'Marka'} {vehicle.model || 'Model'}
                                                    </h4>
                                                    
                                                    {/* Specs Row - Responsive */}
                                                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-2 sm:mt-3">
                                                        <span className="inline-flex items-center gap-1 bg-purple-50 px-2 py-1 rounded-lg text-[10px] sm:text-xs font-medium text-purple-700 border border-purple-100">
                                                            <Settings className="w-3 h-3" />
                                                            {vehicle.transmission === 'otomatik' ? 'Otomatik' : vehicle.transmission === 'manuel' ? 'Manuel' : vehicle.transmission || 'Vites'}
                                                        </span>
                                                        <span className="inline-flex items-center gap-1 bg-purple-50 px-2 py-1 rounded-lg text-[10px] sm:text-xs font-medium text-purple-700 border border-purple-100">
                                                            <Fuel className="w-3 h-3" />
                                                            {vehicle.fuel_type === 'benzin' ? 'Benzin' : vehicle.fuel_type === 'dizel' ? 'Dizel' : vehicle.fuel_type === 'elektrik' ? 'Elektrik' : vehicle.fuel_type || 'Yakıt'}
                                                        </span>
                                                        <span className="inline-flex items-center gap-1 bg-purple-50 px-2 py-1 rounded-lg text-[10px] sm:text-xs font-medium text-purple-700 border border-purple-100">
                                                            <Users className="w-3 h-3" />
                                                            {vehicle.seats || '-'} Kişi
                                                        </span>
                                                    </div>

                                                    {/* Color if exists */}
                                                    {vehicle.color && (
                                                        <p className="text-xs sm:text-sm text-gray-500 mt-2">
                                                            <span className="font-medium">Renk:</span> {vehicle.color}
                                                        </p>
                                                    )}

                                                    {/* Price & Action Row - Responsive */}
                                                    <div className="flex items-center justify-between mt-3 sm:mt-4 pt-3 border-t border-gray-100">
                                                        <div className="flex flex-col">
                                                            <span className="text-xs text-gray-400 uppercase font-medium">Günlük</span>
                                                            <span className="text-lg sm:text-2xl font-bold text-purple-600">
                                                                {formatPrice(vehicle.daily_price || 0)}
                                                            </span>
                                                        </div>
                                                        <motion.button
                                                            whileHover={{ scale: 1.02 }}
                                                            whileTap={{ scale: 0.98 }}
                                                            onClick={() => handleRentClick(vehicle)}
                                                            className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-purple-600 text-white text-xs sm:text-sm font-bold hover:bg-purple-700 transition-all flex items-center gap-1 shadow-lg shadow-purple-500/25"
                                                        >
                                                            Hemen Kirala
                                                            <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
                                                        </motion.button>
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

                    {/* Modals */}
                    {mounted && (
                        <>
                            <VehicleDetailModal
                                vehicle={selectedVehicle}
                                isOpen={showDetail}
                                onClose={() => setShowDetail(false)}
                                onRent={handleRentClick}
                            />
                            <RentalFormModal
                                vehicle={selectedVehicle}
                                isOpen={showForm}
                                onClose={() => setShowForm(false)}
                                businessName={businessName}
                                whatsappNumber={whatsappNumber}
                            />
                        </>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
}
