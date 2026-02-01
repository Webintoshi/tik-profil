"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X, Search, Calendar,
    Clock, MapPin, Users, Phone, User, MessageCircle,
    UtensilsCrossed, PartyPopper, CalendarCheck, ChevronDown
} from "lucide-react";
import clsx from "clsx";
import { toR2ProxyUrl } from "@/lib/publicImage";
import { useRestaurantMenuSubscription } from "@/hooks/useMenuRealtime";

// ============================================
// TYPES
// ============================================
interface Category {
    id: string;
    name: string;
    icon: string;
    image?: string;
    order: number;
}

interface Product {
    id: string;
    name: string;
    description: string;
    price: number;
    categoryId: string;
    image?: string;
    inStock: boolean;
}

interface Event {
    id: string;
    title: string;
    description?: string;
    image?: string;
    date: string;
    start_time: string;
    end_time?: string;
    location?: string;
}

interface RestaurantInlineMenuProps {
    isOpen: boolean;
    businessSlug: string;
    businessName: string;
    businessId?: string;
    whatsappNumber?: string;
    onClose: () => void;
}

type ActiveTab = 'menu' | 'events' | 'reservation';

// Time slots for picker
const TIME_SLOTS = [
    "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
    "18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30", "22:00"
];

// ============================================
// MAIN COMPONENT
// ============================================
export function RestaurantInlineMenu({
    isOpen,
    businessSlug,
    businessName,
    whatsappNumber,
    onClose
}: RestaurantInlineMenuProps) {
    const [activeTab, setActiveTab] = useState<ActiveTab>('menu');
    const [categories, setCategories] = useState<Category[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [events, setEvents] = useState<Event[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [businessId, setBusinessId] = useState<string | null>(null);

    // Reservation form state
    const [reservationForm, setReservationForm] = useState({
        name: '',
        phone: '',
        date: '',
        time: '',
        guests: 2,
        notes: ''
    });
    const [reservationSent, setReservationSent] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);

    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const dateInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { setMounted(true); }, []);

    const refreshMenu = useCallback(async (showLoading: boolean = false) => {
        if (showLoading) setLoading(true);
        try {
            const res = await fetch(`/api/restaurant/public-menu?businessSlug=${businessSlug}`);
            const data = await res.json();
            if (data.success && data.data) {
                setCategories(data.data.categories || []);
                setProducts(data.data.products || []);
                setBusinessId((data.data.businessId as string) || null);
            }
        } catch (error) {
            console.error("Failed to fetch menu:", error);
        }
        if (showLoading) setLoading(false);
    }, [businessSlug]);

    // Fetch menu data
    useEffect(() => {
        if (categories.length > 0) return;
        refreshMenu(true);
    }, [businessSlug, categories.length, refreshMenu]);

    useRestaurantMenuSubscription(isOpen ? businessId : null, () => refreshMenu(false));

    // Fetch events
    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const res = await fetch(`/api/restaurant/public-events?businessSlug=${businessSlug}`);
                const data = await res.json();
                if (data.success && data.data) {
                    setEvents(data.data.events || []);
                }
            } catch (error) {
                console.error("Failed to fetch events:", error);
            }
        };
        fetchEvents();
    }, [businessSlug]);

    // Filter products
    const filteredProducts = products.filter(p => {
        const matchesCategory = !selectedCategory || p.categoryId === selectedCategory;
        const matchesSearch = !searchQuery ||
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.description?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    // Group products by category for display
    const getProductsByCategory = () => {
        const grouped: { category: Category; products: Product[] }[] = [];
        categories.forEach(cat => {
            const catProducts = filteredProducts.filter(p => p.categoryId === cat.id);
            if (catProducts.length > 0) {
                grouped.push({ category: cat, products: catProducts });
            }
        });
        return grouped;
    };

    // Format date for display
    const formatEventDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return new Intl.DateTimeFormat('tr-TR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long'
        }).format(date);
    };

    // Format selected date for display
    const formatSelectedDate = (dateStr: string) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return new Intl.DateTimeFormat('tr-TR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        }).format(date);
    };

    // Generate next 30 days for date picker
    const getAvailableDates = () => {
        const dates = [];
        const today = new Date();
        for (let i = 0; i < 30; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            dates.push({
                value: date.toISOString().split('T')[0],
                day: date.getDate(),
                weekday: new Intl.DateTimeFormat('tr-TR', { weekday: 'short' }).format(date),
                month: new Intl.DateTimeFormat('tr-TR', { month: 'short' }).format(date),
                isToday: i === 0
            });
        }
        return dates;
    };

    // Handle reservation submit via WhatsApp
    const handleReservationSubmit = () => {
        if (!whatsappNumber || !reservationForm.name || !reservationForm.phone || !reservationForm.date || !reservationForm.time) {
            return;
        }

        const message = `📅 *Rezervasyon Talebi*\n\n` +
            `🏪 *${businessName}*\n\n` +
            `👤 İsim: ${reservationForm.name}\n` +
            `📱 Telefon: ${reservationForm.phone}\n` +
            `📅 Tarih: ${formatSelectedDate(reservationForm.date)}\n` +
            `🕐 Saat: ${reservationForm.time}\n` +
            `👥 Kişi Sayısı: ${reservationForm.guests}\n` +
            (reservationForm.notes ? `📝 Not: ${reservationForm.notes}\n\n` : '\n') +
            `_Tık Profil üzerinden gönderilmiştir_\nhttps://tikprofil.com`;

        const cleanNumber = whatsappNumber.replace(/[\s\-\(\)]/g, "");
        const url = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
        window.open(url, "_blank");
        setReservationSent(true);
    };

    if (!mounted) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="overflow-hidden w-full col-span-2 relative"
                    style={{ marginTop: '0.75rem' }}
                >
                    <div className="rounded-2xl overflow-hidden border border-gray-200 bg-white relative min-h-[600px]">

                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="absolute top-3 right-3 z-20 w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        {/* ============================================ */}
                        {/* TAB NAVIGATION - PURPLE THEME */}
                        {/* ============================================ */}
                        <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
                            <div className="flex">
                                <button
                                    onClick={() => setActiveTab('menu')}
                                    className={clsx(
                                        "flex-1 py-4 text-sm font-semibold transition-all flex items-center justify-center gap-2",
                                        activeTab === 'menu'
                                            ? "text-purple-600 border-b-2 border-purple-600"
                                            : "text-gray-500 hover:text-gray-700"
                                    )}
                                >
                                    <UtensilsCrossed className="w-4 h-4" />
                                    Menü
                                </button>
                                {events.length > 0 && (
                                    <button
                                        onClick={() => setActiveTab('events')}
                                        className={clsx(
                                            "flex-1 py-4 text-sm font-semibold transition-all flex items-center justify-center gap-2",
                                            activeTab === 'events'
                                                ? "text-purple-600 border-b-2 border-purple-600"
                                                : "text-gray-500 hover:text-gray-700"
                                        )}
                                    >
                                        <PartyPopper className="w-4 h-4" />
                                        Etkinlikler
                                    </button>
                                )}
                                <button
                                    onClick={() => setActiveTab('reservation')}
                                    className={clsx(
                                        "flex-1 py-4 text-sm font-semibold transition-all flex items-center justify-center gap-2",
                                        activeTab === 'reservation'
                                            ? "text-purple-600 border-b-2 border-purple-600"
                                            : "text-gray-500 hover:text-gray-700"
                                    )}
                                >
                                    <CalendarCheck className="w-4 h-4" />
                                    Rezervasyon
                                </button>
                            </div>
                        </div>

                        <div className="h-full overflow-y-auto" style={{ maxHeight: '600px' }} ref={scrollContainerRef}>

                            {/* ============================================ */}
                            {/* TAB: MENU (NO PRICES - LIST ONLY - NO EMOJIS) */}
                            {/* ============================================ */}
                            {activeTab === 'menu' && (
                                <>
                                    {/* Search Bar */}
                                    <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <input
                                                type="text"
                                                placeholder="Ara..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="w-full pl-10 pr-4 py-2.5 rounded-full bg-gray-100 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-gray-400"
                                            />
                                        </div>
                                    </div>

                                    {/* Category Pills */}
                                    {categories.length > 0 && (
                                        <div className="px-4 py-3 border-b border-gray-100">
                                            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                                                <button
                                                    onClick={() => setSelectedCategory(null)}
                                                    className={clsx(
                                                        "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                                                        !selectedCategory
                                                            ? "bg-purple-600 text-white"
                                                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                                    )}
                                                >
                                                    Tümü
                                                </button>
                                                {categories.map(cat => (
                                                    <button
                                                        key={cat.id}
                                                        onClick={() => setSelectedCategory(cat.id)}
                                                        className={clsx(
                                                            "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                                                            selectedCategory === cat.id
                                                                ? "bg-purple-600 text-white"
                                                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                                        )}
                                                    >
                                                        {cat.name}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Loading State */}
                                    {loading ? (
                                        <div className="flex items-center justify-center py-20">
                                            <div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin" />
                                        </div>
                                    ) : (
                                        <>
                                            {/* Product List by Category - NO PRICES, NO EMOJIS */}
                                            {selectedCategory ? (
                                                // Show filtered products
                                                <div className="divide-y divide-gray-100">
                                                    {filteredProducts.map(product => (
                                                        <div
                                                            key={product.id}
                                                            className="flex items-center gap-4 p-4"
                                                        >
                                                            {product.image && (
                                                                <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
                                                                    <img
                                                                        src={toR2ProxyUrl(product.image)}
                                                                        alt={product.name}
                                                                        className="w-full h-full object-cover"
                                                                    />
                                                                </div>
                                                            )}
                                                            <div className="flex-1 min-w-0">
                                                                <h3 className="font-semibold text-gray-900">{product.name}</h3>
                                                                {product.description && (
                                                                    <p className="text-sm text-gray-500 line-clamp-2 mt-1">{product.description}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                // Show all products grouped by category - NO EMOJIS
                                                <div className="divide-y divide-gray-200">
                                                    {getProductsByCategory().map(({ category, products: catProducts }) => (
                                                        <div key={category.id} className="py-4">
                                                            <h2 className="text-lg font-bold text-gray-900 px-4 mb-3">
                                                                {category.name}
                                                            </h2>
                                                            <div className="divide-y divide-gray-100">
                                                                {catProducts.map(product => (
                                                                    <div
                                                                        key={product.id}
                                                                        className="flex items-center gap-4 px-4 py-3"
                                                                    >
                                                                        {product.image && (
                                                                            <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                                                                                <img
                                                                                    src={toR2ProxyUrl(product.image)}
                                                                                    alt={product.name}
                                                                                    className="w-full h-full object-cover"
                                                                                />
                                                                            </div>
                                                                        )}
                                                                        <div className="flex-1 min-w-0">
                                                                            <h3 className="font-semibold text-gray-900">{product.name}</h3>
                                                                            {product.description && (
                                                                                <p className="text-sm text-gray-500 line-clamp-2 mt-0.5">{product.description}</p>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Empty State */}
                                            {filteredProducts.length === 0 && !loading && (
                                                <div className="text-center py-20 px-4">
                                                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                                        <Search className="w-8 h-8 text-gray-400" />
                                                    </div>
                                                    <p className="text-gray-500">Ürün bulunamadı</p>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </>
                            )}

                            {/* ============================================ */}
                            {/* TAB: EVENTS - PURPLE THEME */}
                            {/* ============================================ */}
                            {activeTab === 'events' && (
                                <div className="p-4">
                                    {events.length === 0 ? (
                                        <div className="text-center py-20">
                                            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <PartyPopper className="w-8 h-8 text-purple-500" />
                                            </div>
                                            <p className="text-gray-500">Henüz etkinlik yok</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {events.map(event => (
                                                <div
                                                    key={event.id}
                                                    className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                                                    onClick={() => setActiveTab('reservation')}
                                                >
                                                    {event.image && (
                                                        <div className="aspect-video overflow-hidden">
                                                            <img
                                                                src={toR2ProxyUrl(event.image)}
                                                                alt={event.title}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        </div>
                                                    )}
                                                    <div className="p-4">
                                                        <h3 className="font-bold text-lg text-gray-900">{event.title}</h3>
                                                        {event.description && (
                                                            <p className="text-gray-600 text-sm mt-1">{event.description}</p>
                                                        )}
                                                        <div className="flex flex-wrap gap-3 mt-3 text-sm text-purple-600">
                                                            <div className="flex items-center gap-1">
                                                                <Calendar className="w-4 h-4" />
                                                                {formatEventDate(event.date)}
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <Clock className="w-4 h-4" />
                                                                {event.start_time}{event.end_time && ` - ${event.end_time}`}
                                                            </div>
                                                            {event.location && (
                                                                <div className="flex items-center gap-1">
                                                                    <MapPin className="w-4 h-4" />
                                                                    {event.location}
                                                                </div>
                                                            )}
                                                        </div>
                                                        {/* CTA Button */}
                                                        <button
                                                            className="w-full mt-4 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setActiveTab('reservation');
                                                            }}
                                                        >
                                                            <CalendarCheck className="w-5 h-5" />
                                                            Rezervasyon Yap
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                            {/* ============================================ */}
                            {/* TAB: RESERVATION - PURPLE THEME + BETTER PICKERS */}
                            {/* ============================================ */}
                            {activeTab === 'reservation' && (
                                <div className="p-4">
                                    {reservationSent ? (
                                        <div className="text-center py-16">
                                            <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <CalendarCheck className="w-10 h-10 text-purple-600" />
                                            </div>
                                            <h3 className="text-xl font-bold text-gray-900 mb-2">Rezervasyon Talebiniz Gönderildi!</h3>
                                            <p className="text-gray-500">İşletme en kısa sürede sizinle iletişime geçecek.</p>
                                            <button
                                                onClick={() => {
                                                    setReservationSent(false);
                                                    setReservationForm({ name: '', phone: '', date: '', time: '', guests: 2, notes: '' });
                                                }}
                                                className="mt-6 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                                            >
                                                Yeni Rezervasyon
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="text-center mb-6">
                                                <h3 className="text-lg font-bold text-gray-900">Rezervasyon Yap</h3>
                                                <p className="text-gray-500 text-sm">Bilgilerinizi girin, WhatsApp ile onay alın</p>
                                            </div>

                                            {/* Name */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">İsim Soyisim</label>
                                                <div className="relative">
                                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                                    <input
                                                        type="text"
                                                        value={reservationForm.name}
                                                        onChange={(e) => setReservationForm({ ...reservationForm, name: e.target.value })}
                                                        placeholder="Adınız Soyadınız"
                                                        className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 placeholder-gray-400"
                                                    />
                                                </div>
                                            </div>

                                            {/* Phone */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                                                <div className="relative">
                                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                                    <input
                                                        type="tel"
                                                        value={reservationForm.phone}
                                                        onChange={(e) => setReservationForm({ ...reservationForm, phone: e.target.value })}
                                                        placeholder="05XX XXX XX XX"
                                                        className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 placeholder-gray-400"
                                                    />
                                                </div>
                                            </div>

                                            {/* Date Picker - Scrollable Cards */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Tarih Seçin</label>
                                                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                                    {getAvailableDates().slice(0, 14).map((date) => (
                                                        <button
                                                            key={date.value}
                                                            onClick={() => setReservationForm({ ...reservationForm, date: date.value })}
                                                            className={clsx(
                                                                "flex flex-col items-center min-w-[60px] py-3 px-3 rounded-xl border-2 transition-all",
                                                                reservationForm.date === date.value
                                                                    ? "border-purple-600 bg-purple-50 text-purple-600"
                                                                    : "border-gray-200 hover:border-purple-300"
                                                            )}
                                                        >
                                                            <span className="text-xs font-medium text-gray-500">{date.weekday}</span>
                                                            <span className="text-lg font-bold">{date.day}</span>
                                                            <span className="text-xs text-gray-400">{date.month}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Time Picker - Grid of buttons */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Saat Seçin</label>
                                                <div className="grid grid-cols-5 gap-2">
                                                    {TIME_SLOTS.map((time) => (
                                                        <button
                                                            key={time}
                                                            onClick={() => setReservationForm({ ...reservationForm, time })}
                                                            className={clsx(
                                                                "py-2.5 px-1 rounded-lg border-2 text-sm font-medium transition-all",
                                                                reservationForm.time === time
                                                                    ? "border-purple-600 bg-purple-50 text-purple-600"
                                                                    : "border-gray-200 text-gray-700 hover:border-purple-300"
                                                            )}
                                                        >
                                                            {time}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Guest Count */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Kişi Sayısı</label>
                                                <div className="flex gap-2 flex-wrap">
                                                    {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                                                        <button
                                                            key={num}
                                                            onClick={() => setReservationForm({ ...reservationForm, guests: num })}
                                                            className={clsx(
                                                                "w-12 h-12 rounded-xl border-2 font-bold transition-all flex items-center justify-center",
                                                                reservationForm.guests === num
                                                                    ? "border-purple-600 bg-purple-50 text-purple-600"
                                                                    : "border-gray-200 text-gray-700 hover:border-purple-300"
                                                            )}
                                                        >
                                                            {num}
                                                        </button>
                                                    ))}
                                                    <button
                                                        onClick={() => setReservationForm({ ...reservationForm, guests: 10 })}
                                                        className={clsx(
                                                            "px-4 h-12 rounded-xl border-2 font-bold transition-all flex items-center justify-center",
                                                            reservationForm.guests >= 9
                                                                ? "border-purple-600 bg-purple-50 text-purple-600"
                                                                : "border-gray-200 text-gray-700 hover:border-purple-300"
                                                        )}
                                                    >
                                                        9+
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Notes */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Not (Opsiyonel)</label>
                                                <textarea
                                                    value={reservationForm.notes}
                                                    onChange={(e) => setReservationForm({ ...reservationForm, notes: e.target.value })}
                                                    placeholder="Özel istekleriniz..."
                                                    rows={3}
                                                    className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none placeholder-gray-400"
                                                />
                                            </div>

                                            {/* Submit Button - PURPLE */}
                                            <button
                                                onClick={handleReservationSubmit}
                                                disabled={!reservationForm.name || !reservationForm.phone || !reservationForm.date || !reservationForm.time}
                                                className={clsx(
                                                    "w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all",
                                                    reservationForm.name && reservationForm.phone && reservationForm.date && reservationForm.time
                                                        ? "bg-purple-600 text-white hover:bg-purple-700 shadow-lg shadow-purple-600/30"
                                                        : "bg-gray-200 text-gray-400 cursor-not-allowed"
                                                )}
                                            >
                                                <MessageCircle className="w-5 h-5" />
                                                WhatsApp ile Gönder
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            )
            }
        </AnimatePresence >
    );
}

