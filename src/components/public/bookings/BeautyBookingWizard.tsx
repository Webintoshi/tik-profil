"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X, ChevronLeft, ChevronRight, Calendar, Clock,
    User, Check, Loader2, Phone, FileText, Sparkles, AlertCircle
} from "lucide-react";
import { Service, formatDuration, formatPrice, Staff } from "@/types/beauty";
import { toast } from "sonner";
import clsx from "clsx";
import Image from "next/image";
import { toR2ProxyUrl } from "@/lib/publicImage";

interface BeautyBookingWizardProps {
    service: Service;
    onClose: () => void;
    businessName: string;
}

type Step = 'staff' | 'datetime' | 'info' | 'success';

interface BookingData {
    staffId: string;
    staffName: string;
    date: Date | null;
    time: string | null;
    customerName: string;
    customerPhone: string;
    note: string;
}

export default function BeautyBookingWizard({ service, onClose, businessName }: BeautyBookingWizardProps) {
    const [step, setStep] = useState<Step>('staff');
    const [loading, setLoading] = useState(false);
    const [staffList, setStaffList] = useState<Staff[]>([]);
    const [slots, setSlots] = useState<string[]>([]);
    const [slotsLoading, setSlotsLoading] = useState(false);

    // Booking Data
    const [bookingData, setBookingData] = useState<BookingData>({
        staffId: 'any',
        staffName: 'Herhangi bir uzman',
        date: null,
        time: null,
        customerName: '',
        customerPhone: '',
        note: ''
    });

    // Load Staff on mount
    useEffect(() => {
        loadStaff();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Load slots when date/staff changes
    useEffect(() => {
        if (bookingData.date && step === 'datetime') {
            loadSlots();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [bookingData.date, bookingData.staffId, step]);

    const loadStaff = async () => {
        try {
            const res = await fetch(`/api/beauty/staff?businessId=${service.businessId}`);
            const data = await res.json();
            if (data.success) {
                setStaffList(data.staff || []);
            }
        } catch (error) {
            console.error("Staff load error:", error);
            toast.error("Personel listesi yüklenemedi");
        }
    };

    const loadSlots = async () => {
        if (!bookingData.date) return;

        setSlotsLoading(true);
        const dateStr = bookingData.date.toISOString().split('T')[0];

        try {
            const res = await fetch(
                `/api/beauty/availability?businessId=${service.businessId}&date=${dateStr}&serviceDuration=${service.duration}&staffId=${bookingData.staffId}`
            );
            const data = await res.json();

            if (data.success) {
                setSlots(data.slots || []);
            } else {
                setSlots([]);
                if (data.message !== "Closed on this day") {
                    toast.error(data.error || "Saatler yüklenemedi");
                }
            }
        } catch (error) {
            console.error("Slots load error:", error);
            toast.error("Müsaitlik durumu alınamadı");
        } finally {
            setSlotsLoading(false);
        }
    };

    const handleCreateAppointment = async () => {
        console.log("=== handleCreateAppointment CALLED ===");
        console.log("bookingData:", bookingData);

        if (!bookingData.date || !bookingData.time) {
            console.error("Missing date or time", { date: bookingData.date, time: bookingData.time });
            toast.error("Tarih ve saat seçmelisiniz");
            return;
        }

        if (!bookingData.customerName || !bookingData.customerPhone) {
            console.error("Missing customer info", { name: bookingData.customerName, phone: bookingData.customerPhone });
            toast.error("Ad ve telefon bilgisi gerekli");
            return;
        }

        setLoading(true);
        try {
            const dateStr = bookingData.date.toISOString().split('T')[0];

            const payload = {
                businessId: service.businessId,
                serviceId: service.id,
                staffId: bookingData.staffId,
                date: dateStr,
                startTime: bookingData.time,
                customerName: bookingData.customerName,
                customerPhone: bookingData.customerPhone,
                note: bookingData.note || ""
            };

            console.log("Sending payload:", payload);

            const res = await fetch('/api/beauty/appointments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            console.log("API Response:", data);

            if (data.success) {
                setStep('success');
                toast.success("Randevunuz başarıyla oluşturuldu!");
            } else {
                console.error("API Error:", data.error);
                toast.error(data.error || "Randevu oluşturulamadı");
            }
        } catch (error) {
            console.error("Booking error:", error);
            toast.error("Bir hata oluştu");
        } finally {
            setLoading(false);
        }
    };

    // Helper to generate dates for horizontal picker
    const generateDates = () => {
        const dates: Date[] = [];
        const today = new Date();
        for (let i = 0; i < 14; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            dates.push(date);
        }
        return dates;
    };

    const formatDateShort = (date: Date) => {
        const days = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
        return {
            day: days[date.getDay()],
            date: date.getDate(),
            month: date.toLocaleDateString('tr-TR', { month: 'short' }),
        };
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10001] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
        >
            <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                className="w-full max-w-md bg-white rounded-t-[2.5rem] sm:rounded-3xl overflow-hidden shadow-2xl h-[90vh] flex flex-col"
            >
                {/* Header */}
                <div className="flex items-center gap-3 px-6 py-4 border-b border-rose-100 bg-white/80 backdrop-blur-md relative z-10 shrink-0">
                    <button
                        onClick={step === 'staff' ? onClose : () => {
                            if (step === 'datetime') setStep('staff');
                            if (step === 'info') setStep('datetime');
                            if (step === 'success') onClose();
                        }}
                        className="w-9 h-9 flex items-center justify-center rounded-full bg-rose-100 hover:bg-rose-200 transition-colors"
                    >
                        {step === 'success' ? <X className="w-5 h-5 text-rose-600" /> : <ChevronLeft className="w-5 h-5 text-rose-600" />}
                    </button>
                    <div className="flex-1">
                        <h2 className="text-lg font-bold text-gray-900">
                            {step === 'staff' && 'Personel Seçimi'}
                            {step === 'datetime' && 'Tarih ve Saat'}
                            {step === 'info' && 'Bilgileriniz'}
                            {step === 'success' && 'Tebrikler!'}
                        </h2>
                        <div className="flex gap-1 mt-1">
                            {['staff', 'datetime', 'info'].map((s, i) => {
                                const stepIndex = ['staff', 'datetime', 'info', 'success'].indexOf(step);
                                const myIndex = ['staff', 'datetime', 'info'].indexOf(s);
                                return (
                                    <div
                                        key={s}
                                        className={clsx(
                                            "h-1 rounded-full flex-1 transition-all",
                                            myIndex <= stepIndex ? "bg-rose-500" : "bg-gray-200"
                                        )}
                                    />
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto relative">
                    {/* Background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-rose-50/50 via-white to-pink-50/30 -z-10" />

                    {/* Step 1: Staff Selection */}
                    {step === 'staff' && (
                        <div className="p-6 space-y-3">
                            {/* Any Staff Option */}
                            <button
                                onClick={() => {
                                    setBookingData(prev => ({ ...prev, staffId: 'any', staffName: 'Herhangi bir uzman' }));
                                    setStep('datetime');
                                }}
                                className={clsx(
                                    "w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all hover:bg-white text-left group",
                                    bookingData.staffId === 'any'
                                        ? "border-rose-500 bg-white shadow-lg shadow-rose-100"
                                        : "border-transparent bg-white/60 hover:border-rose-200"
                                )}
                            >
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-white shadow-md">
                                    <Sparkles className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">Fark Etmez</h3>
                                    <p className="text-xs text-gray-500">Müsait olan herhangi bir uzman</p>
                                </div>
                                <ChevronRight className="w-5 h-5 text-gray-300 ml-auto group-hover:text-rose-500 transition-colors" />
                            </button>

                            {/* Staff List */}
                            {staffList.map(staff => (
                                <button
                                    key={staff.id}
                                    onClick={() => {
                                        setBookingData(prev => ({ ...prev, staffId: staff.id, staffName: staff.name }));
                                        setStep('datetime');
                                    }}
                                    className={clsx(
                                        "w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all hover:bg-white text-left group",
                                        bookingData.staffId === staff.id
                                            ? "border-rose-500 bg-white shadow-lg shadow-rose-100"
                                            : "border-transparent bg-white/60 hover:border-rose-200"
                                    )}
                                >
                                    <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gray-100 shadow-md">
                                        {staff.photoUrl ? (
                                            <Image src={toR2ProxyUrl(staff.photoUrl)} alt={staff.name} fill className="object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-rose-100 text-rose-500">
                                                <User className="w-6 h-6" />
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900">{staff.name}</h3>
                                        <p className="text-xs text-gray-500">{staff.title || 'Uzman'}</p>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-gray-300 ml-auto group-hover:text-rose-500 transition-colors" />
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Step 2: Date & Time */}
                    {step === 'datetime' && (
                        <div className="pb-24">
                            {/* Dates */}
                            <div className="p-6 border-b border-rose-100 bg-white/50 backdrop-blur-sm sticky top-0 z-10">
                                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-rose-500" />
                                    Tarih Seçin
                                </h3>
                                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-2 px-2">
                                    {generateDates().map((date, index) => {
                                        const formatted = formatDateShort(date);
                                        const isSelected = bookingData.date?.toDateString() === date.toDateString();
                                        return (
                                            <button
                                                key={index}
                                                onClick={() => setBookingData(prev => ({ ...prev, date, time: null }))}
                                                className={clsx(
                                                    "flex flex-col items-center min-w-[64px] p-2.5 rounded-2xl transition-all border",
                                                    isSelected
                                                        ? "bg-gradient-to-br from-rose-500 to-pink-500 text-white border-transparent shadow-lg shadow-rose-200 scale-105"
                                                        : "bg-white text-gray-500 border-rose-200 hover:border-rose-300 hover:bg-rose-50"
                                                )}
                                            >
                                                <span className={`text-[10px] font-medium mb-0.5 ${isSelected ? "text-rose-100" : "text-gray-400"}`}>{formatted.day}</span>
                                                <span className="text-lg font-bold mb-0.5">{formatted.date}</span>
                                                <span className="text-[10px] font-medium">{formatted.month}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Slots */}
                            <div className="p-6">
                                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-rose-500" />
                                    Saat Seçin
                                </h3>

                                {slotsLoading ? (
                                    <div className="py-12 flex flex-col items-center justify-center text-rose-400">
                                        <Loader2 className="w-8 h-8 animate-spin mb-2" />
                                        <span className="text-sm">Saatler kontrol ediliyor...</span>
                                    </div>
                                ) : !bookingData.date ? (
                                    <div className="text-center py-10 text-gray-400 text-sm">
                                        Lütfen önce tarih seçin
                                    </div>
                                ) : slots.length === 0 ? (
                                    <div className="text-center py-10">
                                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <AlertCircle className="w-6 h-6 text-gray-400" />
                                        </div>
                                        <p className="text-gray-900 font-medium">Bu tarihte boş saat yok</p>
                                        <p className="text-gray-500 text-sm mt-1">Lütfen başka bir tarih seçin</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-4 gap-2">
                                        {slots.map((time) => {
                                            const isSelected = bookingData.time === time;
                                            return (
                                                <button
                                                    key={time}
                                                    onClick={() => setBookingData(prev => ({ ...prev, time }))}
                                                    className={clsx(
                                                        "py-2.5 rounded-xl text-xs font-bold transition-all border",
                                                        isSelected
                                                            ? "bg-gradient-to-br from-rose-500 to-pink-500 text-white border-transparent shadow-lg shadow-rose-200"
                                                            : "bg-white text-gray-600 border-rose-200 hover:border-rose-300 hover:bg-rose-50"
                                                    )}
                                                >
                                                    {time}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Step 3: Info Form */}
                    {step === 'info' && (
                        <div className="p-6 space-y-4">
                            {/* Summary Card */}
                            <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100 mb-6">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shadow-sm">
                                        <Calendar className="w-5 h-5 text-rose-500" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-gray-900">
                                            {bookingData.date?.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                                        </div>
                                        <div className="text-sm text-gray-500 flex items-center gap-2">
                                            <span>{bookingData.time}</span>
                                            <span className="w-1 h-1 rounded-full bg-gray-300" />
                                            <span>{service.name}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-xs text-rose-500 font-medium ml-13 flex items-center gap-1">
                                    <User className="w-3 h-3" />
                                    {bookingData.staffName}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <label className="block text-sm font-bold text-gray-900 mb-1.5 ml-1">Ad Soyad</label>
                                    <div className="relative">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                            <User className="w-5 h-5" />
                                        </div>
                                        <input
                                            type="text"
                                            value={bookingData.customerName}
                                            onChange={e => setBookingData(p => ({ ...p, customerName: e.target.value }))}
                                            placeholder="Adınız Soyadınız"
                                            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 transition-all"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-900 mb-1.5 ml-1">Telefon Numarası</label>
                                    <div className="relative">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                            <Phone className="w-5 h-5" />
                                        </div>
                                        <input
                                            type="tel"
                                            value={bookingData.customerPhone}
                                            onChange={e => setBookingData(p => ({ ...p, customerPhone: e.target.value }))}
                                            placeholder="05XX XXX XX XX"
                                            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 transition-all"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-900 mb-1.5 ml-1">Not (Opsiyonel)</label>
                                    <div className="relative">
                                        <div className="absolute left-3 top-3 text-gray-400">
                                            <FileText className="w-5 h-5" />
                                        </div>
                                        <textarea
                                            value={bookingData.note}
                                            onChange={e => setBookingData(p => ({ ...p, note: e.target.value }))}
                                            placeholder="Eklemek istediğiniz notlar..."
                                            rows={3}
                                            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 transition-all resize-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Success */}
                    {step === 'success' && (
                        <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-white">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                                className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6"
                            >
                                <Check className="w-12 h-12 text-green-600" />
                            </motion.div>

                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Randevunuz Alındı!</h2>
                            <p className="text-gray-500 mb-8 max-w-[250px]">
                                {businessName} tarafından onaylandığında size bilgi verilecektir.
                            </p>

                            <div className="w-full max-w-xs space-y-3">
                                <div className="p-4 bg-gray-50 rounded-2xl flex items-center justify-between">
                                    <span className="text-gray-500 text-sm">Tarih</span>
                                    <span className="font-bold text-gray-900">
                                        {bookingData.date?.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                                    </span>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-2xl flex items-center justify-between">
                                    <span className="text-gray-500 text-sm">Saat</span>
                                    <span className="font-bold text-gray-900">{bookingData.time}</span>
                                </div>
                            </div>

                            <button
                                onClick={onClose}
                                className="w-full max-w-xs mt-8 py-4 bg-gray-900 text-white font-bold rounded-2xl hover:bg-gray-800 transition-colors"
                            >
                                Tamam
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer Buttons */}
                {step !== 'success' && (
                    <div className="p-6 border-t border-rose-100 bg-white relative z-10 shrink-0">
                        {step === 'datetime' ? (
                            <button
                                onClick={() => setStep('info')}
                                disabled={!bookingData.time}
                                className="w-full py-4 bg-gradient-to-r from-rose-500 to-pink-600 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-rose-500/25 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-rose-500/40 transition-all active:scale-[0.98]"
                            >
                                Devam Et
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        ) : step === 'info' ? (
                            <button
                                onClick={handleCreateAppointment}
                                disabled={loading || !bookingData.customerName || !bookingData.customerPhone}
                                className="w-full py-4 bg-gradient-to-r from-rose-500 to-pink-600 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-rose-500/25 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-rose-500/40 transition-all active:scale-[0.98]"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                                Randevuyu Tamamla
                            </button>
                        ) : null}
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
}

