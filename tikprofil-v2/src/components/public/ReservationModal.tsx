"use client";

import { useState } from "react";
import { X, Calendar, Clock, Users, User, Phone, MessageCircle, Check, ChevronLeft } from "lucide-react";
import clsx from "clsx";

interface ReservationModalProps {
    isOpen: boolean;
    onClose: () => void;
    businessName: string;
    whatsappNumber?: string;
}

export function ReservationModal({ isOpen, onClose, businessName, whatsappNumber }: ReservationModalProps) {
    const [formData, setFormData] = useState({
        name: "",
        phone: "",
        date: "",
        time: "",
        guests: "2",
        notes: "",
    });
    const [step, setStep] = useState(1);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const isStep1Valid = formData.name.trim().length >= 2 && formData.phone.replace(/\D/g, '').length >= 10;
    const isStep2Valid = formData.date && formData.time && formData.guests;

    const formatWhatsAppMessage = () => {
        const formattedDate = formData.date ? new Date(formData.date).toLocaleDateString('tr-TR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }) : '';

        const message = `🍽️ *REZERVASYON TALEBİ*

📍 *${businessName}*

👤 *Misafir:* ${formData.name}
📱 *Telefon:* ${formData.phone}
📅 *Tarih:* ${formattedDate}
⏰ *Saat:* ${formData.time}
👥 *Kişi:* ${formData.guests}
${formData.notes ? `\n📝 *Not:* ${formData.notes}` : ""}

_TikProfil Rezervasyon Sistemi_`;

        return encodeURIComponent(message);
    };

    const handleSubmit = () => {
        if (!whatsappNumber) {
            alert("İşletmenin WhatsApp numarası tanımlı değil.");
            return;
        }

        const cleanNumber = whatsappNumber.replace(/[\s\-\(\)]/g, "");
        const whatsappUrl = `https://wa.me/${cleanNumber}?text=${formatWhatsAppMessage()}`;

        window.open(whatsappUrl, "_blank");
        onClose();

        setFormData({ name: "", phone: "", date: "", time: "", guests: "2", notes: "" });
        setStep(1);
    };

    const today = new Date().toISOString().split("T")[0];
    const maxDate = new Date();
    maxDate.setMonth(maxDate.getMonth() + 2);
    const maxDateStr = maxDate.toISOString().split("T")[0];

    // Generate time slots
    const timeSlots: string[] = [];
    for (let h = 10; h <= 23; h++) {
        timeSlots.push(`${h.toString().padStart(2, '0')}:00`);
        timeSlots.push(`${h.toString().padStart(2, '0')}:30`);
    }

    const guestOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, "10+"];

    return (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative w-full max-w-lg bg-white rounded-t-3xl md:rounded-3xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden animate-slide-up">
                {/* Header */}
                <div className="flex-shrink-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between z-10">
                    <div className="flex items-center gap-3">
                        {step > 1 && (
                            <button
                                onClick={() => setStep(step - 1)}
                                className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
                            >
                                <ChevronLeft className="w-5 h-5 text-gray-500" />
                            </button>
                        )}
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">
                                {step === 1 ? "Bilgileriniz" : step === 2 ? "Tarih & Saat" : "Onay"}
                            </h2>
                            <p className="text-xs text-gray-500 truncate max-w-[200px]">{businessName}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 -mr-2 rounded-full hover:bg-gray-100 transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Progress Steps */}
                <div className="flex-shrink-0 px-4 py-3 bg-gray-50 border-b border-gray-100/50">
                    <div className="flex items-center justify-center gap-2">
                        {[1, 2, 3].map((s) => (
                            <div key={s} className="flex items-center">
                                <div className={clsx(
                                    "flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-colors",
                                    step >= s ? "bg-purple-600 text-white" : "bg-gray-200 text-gray-500"
                                )}>
                                    {step > s ? <Check className="w-3.5 h-3.5" /> : s}
                                </div>
                                {s < 3 && (
                                    <div className={clsx(
                                        "w-10 h-1 rounded mx-1 transition-colors",
                                        step > s ? "bg-purple-600" : "bg-gray-200"
                                    )} />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {/* Step 1: Personal Info */}
                    {step === 1 && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-900 mb-1.5">
                                    Ad Soyad <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        placeholder="Örn: Ahmet Yılmaz"
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 outline-none transition-all"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-900 mb-1.5">
                                    Telefon <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        placeholder="05XX XXX XX XX"
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 outline-none transition-all"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Date & Time */}
                    {step === 2 && (
                        <div className="space-y-4">
                            {/* Date */}
                            <div>
                                <label className="block text-sm font-medium text-gray-900 mb-1.5">
                                    <Calendar className="inline w-4 h-4 mr-1" /> Tarih <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    name="date"
                                    value={formData.date}
                                    onChange={handleChange}
                                    min={today}
                                    max={maxDateStr}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 outline-none transition-all"
                                />
                            </div>

                            {/* Time Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-900 mb-2">
                                    <Clock className="inline w-4 h-4 mr-1" /> Saat <span className="text-red-500">*</span>
                                </label>
                                <div className="grid grid-cols-4 gap-2">
                                    {timeSlots.slice(0, 12).map((time) => (
                                        <button
                                            key={time}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, time })}
                                            className={clsx(
                                                "py-2.5 rounded-xl font-medium text-sm transition-all",
                                                formData.time === time
                                                    ? "bg-purple-600 text-white shadow-md"
                                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                            )}
                                        >
                                            {time}
                                        </button>
                                    ))}
                                </div>
                                {timeSlots.length > 12 && (
                                    <details className="mt-2">
                                        <summary className="text-xs text-purple-600 font-medium cursor-pointer">
                                            Daha fazla saat...
                                        </summary>
                                        <div className="grid grid-cols-4 gap-2 mt-2">
                                            {timeSlots.slice(12).map((time) => (
                                                <button
                                                    key={time}
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, time })}
                                                    className={clsx(
                                                        "py-2.5 rounded-xl font-medium text-sm transition-all",
                                                        formData.time === time
                                                            ? "bg-purple-600 text-white shadow-md"
                                                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                                    )}
                                                >
                                                    {time}
                                                </button>
                                            ))}
                                        </div>
                                    </details>
                                )}
                            </div>

                            {/* Guest Count */}
                            <div>
                                <label className="block text-sm font-medium text-gray-900 mb-2">
                                    <Users className="inline w-4 h-4 mr-1" /> Kişi Sayısı <span className="text-red-500">*</span>
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {guestOptions.map((n) => (
                                        <button
                                            key={n}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, guests: String(n) })}
                                            className={clsx(
                                                "w-10 h-10 rounded-xl font-bold text-sm transition-all",
                                                formData.guests === String(n)
                                                    ? "bg-purple-600 text-white shadow-md"
                                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                            )}
                                        >
                                            {n}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-sm font-medium text-gray-900 mb-1.5">
                                    Not <span className="text-gray-400 font-normal">(opsiyonel)</span>
                                </label>
                                <textarea
                                    name="notes"
                                    value={formData.notes}
                                    onChange={handleChange}
                                    placeholder="Doğum günü, alerjenler..."
                                    rows={2}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 outline-none transition-all resize-none"
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 3: Confirmation */}
                    {step === 3 && (
                        <div className="space-y-4">
                            {/* Summary Card */}
                            <div className="bg-purple-50 rounded-2xl p-4 border border-purple-100">
                                <h3 className="font-bold text-purple-900 mb-3 flex items-center gap-2">
                                    <Check className="w-5 h-5 bg-purple-200 rounded-full p-1" />
                                    Rezervasyon Özeti
                                </h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between py-1.5 border-b border-purple-100/50">
                                        <span className="text-gray-600 flex items-center gap-1.5">
                                            <User className="w-4 h-4" /> Misafir
                                        </span>
                                        <span className="font-semibold text-gray-900">{formData.name}</span>
                                    </div>
                                    <div className="flex justify-between py-1.5 border-b border-purple-100/50">
                                        <span className="text-gray-600 flex items-center gap-1.5">
                                            <Phone className="w-4 h-4" /> Telefon
                                        </span>
                                        <span className="font-semibold text-gray-900">{formData.phone}</span>
                                    </div>
                                    <div className="flex justify-between py-1.5 border-b border-purple-100/50">
                                        <span className="text-gray-600 flex items-center gap-1.5">
                                            <Calendar className="w-4 h-4" /> Tarih
                                        </span>
                                        <span className="font-semibold text-gray-900">
                                            {formData.date && new Date(formData.date).toLocaleDateString('tr-TR', {
                                                day: 'numeric',
                                                month: 'long',
                                                weekday: 'short'
                                            })}
                                        </span>
                                    </div>
                                    <div className="flex justify-between py-1.5 border-b border-purple-100/50">
                                        <span className="text-gray-600 flex items-center gap-1.5">
                                            <Clock className="w-4 h-4" /> Saat
                                        </span>
                                        <span className="font-semibold text-purple-600">{formData.time}</span>
                                    </div>
                                    <div className="flex justify-between py-1.5">
                                        <span className="text-gray-600 flex items-center gap-1.5">
                                            <Users className="w-4 h-4" /> Kişi
                                        </span>
                                        <span className="font-semibold text-gray-900">{formData.guests} kişi</span>
                                    </div>
                                    {formData.notes && (
                                        <div className="pt-2 mt-2 border-t border-purple-100">
                                            <span className="text-gray-500 text-xs block mb-1">Notunuz:</span>
                                            <p className="font-medium text-gray-900 bg-white/50 p-2 rounded-lg text-xs border border-purple-100">
                                                {formData.notes}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* WhatsApp Info */}
                            <div className="bg-green-50 rounded-2xl p-4 border border-green-100">
                                <p className="text-sm text-green-700">
                                    <span className="font-semibold">💬 WhatsApp ile Onay</span><br />
                                    Rezervasyon talebiniz WhatsApp üzerinden işletmeye iletilecektir.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Buttons */}
                <div className="flex-shrink-0 bg-white border-t border-gray-100 px-4 py-3 flex gap-3 z-10">
                    {step < 3 ? (
                        <button
                            onClick={() => setStep(step + 1)}
                            disabled={(step === 1 && !isStep1Valid) || (step === 2 && !isStep2Valid)}
                            className="flex-1 py-3.5 rounded-xl bg-purple-600 text-white font-bold hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-200 active:scale-95"
                        >
                            Devam Et
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={() => setStep(2)}
                                className="flex-1 py-3.5 rounded-xl bg-gray-100 text-gray-700 font-bold hover:bg-gray-200 active:scale-95 transition-all"
                            >
                                Geri
                            </button>
                            <button
                                onClick={handleSubmit}
                                className="flex-1 py-3.5 rounded-xl bg-green-500 text-white font-bold flex items-center justify-center gap-2 hover:bg-green-600 shadow-lg shadow-green-200 active:scale-95 transition-all"
                            >
                                <MessageCircle className="w-5 h-5" />
                                WhatsApp
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

