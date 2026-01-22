"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Save, Loader2, Clock, Calendar, Settings2 } from "lucide-react";
import clsx from "clsx";
import { toast } from "sonner";
import { useTheme } from "@/components/panel/ThemeProvider";
import { WorkingHours, DayHours } from "@/types/beauty";

// Turkish day names
const DAYS = [
    { key: 'monday', label: 'Pazartesi' },
    { key: 'tuesday', label: 'Salı' },
    { key: 'wednesday', label: 'Çarşamba' },
    { key: 'thursday', label: 'Perşembe' },
    { key: 'friday', label: 'Cuma' },
    { key: 'saturday', label: 'Cumartesi' },
    { key: 'sunday', label: 'Pazar' },
] as const;

// Slot duration options
const SLOT_OPTIONS = [
    { value: 15, label: '15 dakika' },
    { value: 30, label: '30 dakika' },
    { value: 45, label: '45 dakika' },
    { value: 60, label: '1 saat' },
];

// Default working hours
const DEFAULT_HOURS: WorkingHours = {
    monday: { open: '09:00', close: '18:00', isOpen: true },
    tuesday: { open: '09:00', close: '18:00', isOpen: true },
    wednesday: { open: '09:00', close: '18:00', isOpen: true },
    thursday: { open: '09:00', close: '18:00', isOpen: true },
    friday: { open: '09:00', close: '18:00', isOpen: true },
    saturday: { open: '10:00', close: '16:00', isOpen: true },
    sunday: { open: '10:00', close: '16:00', isOpen: false },
};

export default function BeautySettingsPage() {
    const { isDark } = useTheme();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [workingHours, setWorkingHours] = useState<WorkingHours>(DEFAULT_HOURS);
    const [slotMinutes, setSlotMinutes] = useState(30);
    const [showDuration, setShowDuration] = useState(true);
    const [showStaff, setShowStaff] = useState(true);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const res = await fetch('/api/beauty/settings');
            const data = await res.json();

            if (data.success && data.settings) {
                if (data.settings.workingHours) {
                    setWorkingHours(data.settings.workingHours);
                }
                if (data.settings.appointmentSlotMinutes) {
                    setSlotMinutes(data.settings.appointmentSlotMinutes);
                }
                if (data.settings.appearance) {
                    setShowDuration(data.settings.appearance.showDuration ?? true);
                    setShowStaff(data.settings.appearance.showStaff ?? true);
                }
            }
        } catch (error) {
            console.error('Load settings error:', error);
            toast.error('Ayarlar yüklenirken hata oluştu');
        } finally {
            setLoading(false);
        }
    };

    const handleDayChange = (dayKey: string, field: keyof DayHours, value: string | boolean) => {
        setWorkingHours(prev => ({
            ...prev,
            [dayKey]: {
                ...prev[dayKey as keyof WorkingHours],
                [field]: value
            }
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/beauty/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    workingHours,
                    appointmentSlotMinutes: slotMinutes,
                    appearance: {
                        cardStyle: 'detailed',
                        showDuration,
                        showStaff
                    }
                })
            });

            const data = await res.json();

            if (data.success) {
                toast.success('Ayarlar kaydedildi!');
            } else {
                toast.error(data.error || 'Kaydetme hatası');
            }
        } catch (error) {
            console.error('Save error:', error);
            toast.error('Kaydetme sırasında hata oluştu');
        } finally {
            setSaving(false);
        }
    };

    const applyToAll = (field: 'open' | 'close', value: string) => {
        setWorkingHours(prev => {
            const newHours = { ...prev };
            DAYS.forEach(day => {
                newHours[day.key] = {
                    ...newHours[day.key],
                    [field]: value
                };
            });
            return newHours;
        });
        toast.success(`Tüm günlere ${field === 'open' ? 'açılış' : 'kapanış'} saati uygulandı`);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className={clsx(
                        "text-2xl font-bold",
                        isDark ? "text-white" : "text-gray-900"
                    )}>
                        <Settings2 className="inline-block w-6 h-6 mr-2 -mt-1" />
                        Ayarlar
                    </h1>
                    <p className={clsx(
                        "text-sm mt-1",
                        isDark ? "text-gray-400" : "text-gray-500"
                    )}>
                        Çalışma saatleri ve randevu ayarlarınızı yönetin
                    </p>
                </div>
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSave}
                    disabled={saving}
                    className={clsx(
                        "px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all",
                        "bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-lg shadow-rose-500/25",
                        "hover:shadow-rose-500/40 disabled:opacity-50"
                    )}
                >
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    Kaydet
                </motion.button>
            </div>

            {/* Working Hours Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={clsx(
                    "rounded-2xl border overflow-hidden",
                    isDark ? "bg-gray-800/50 border-gray-700" : "bg-white border-gray-200"
                )}
            >
                <div className={clsx(
                    "px-6 py-4 border-b",
                    isDark ? "border-gray-700 bg-gray-800/80" : "border-gray-100 bg-gray-50"
                )}>
                    <h2 className={clsx(
                        "font-bold flex items-center gap-2",
                        isDark ? "text-white" : "text-gray-900"
                    )}>
                        <Clock className="w-5 h-5 text-rose-500" />
                        Çalışma Saatleri
                    </h2>
                    <p className={clsx(
                        "text-sm mt-1",
                        isDark ? "text-gray-400" : "text-gray-500"
                    )}>
                        Haftalık çalışma saatlerinizi belirleyin
                    </p>
                </div>

                <div className="p-6 space-y-4">
                    {/* Quick Apply Buttons */}
                    <div className="flex flex-wrap gap-2 pb-4 border-b border-gray-200 dark:border-gray-700">
                        <span className={clsx("text-sm", isDark ? "text-gray-400" : "text-gray-500")}>
                            Hızlı Uygula:
                        </span>
                        <button
                            onClick={() => applyToAll('open', '09:00')}
                            className="px-3 py-1 text-xs font-medium rounded-lg bg-rose-100 text-rose-600 hover:bg-rose-200 transition-colors"
                        >
                            Tümüne 09:00 Açılış
                        </button>
                        <button
                            onClick={() => applyToAll('close', '18:00')}
                            className="px-3 py-1 text-xs font-medium rounded-lg bg-rose-100 text-rose-600 hover:bg-rose-200 transition-colors"
                        >
                            Tümüne 18:00 Kapanış
                        </button>
                    </div>

                    {/* Days Grid */}
                    <div className="space-y-3">
                        {DAYS.map(day => {
                            const hours = workingHours[day.key];
                            return (
                                <div
                                    key={day.key}
                                    className={clsx(
                                        "flex items-center gap-4 p-4 rounded-xl transition-all",
                                        hours.isOpen
                                            ? isDark ? "bg-gray-700/50" : "bg-gray-50"
                                            : isDark ? "bg-gray-800/30 opacity-60" : "bg-gray-100/50 opacity-60"
                                    )}
                                >
                                    {/* Day Toggle */}
                                    <label className="flex items-center gap-3 min-w-[140px]">
                                        <input
                                            type="checkbox"
                                            checked={hours.isOpen}
                                            onChange={(e) => handleDayChange(day.key, 'isOpen', e.target.checked)}
                                            className="w-5 h-5 rounded border-gray-300 text-rose-500 focus:ring-rose-500"
                                        />
                                        <span className={clsx(
                                            "font-medium",
                                            isDark ? "text-white" : "text-gray-900"
                                        )}>
                                            {day.label}
                                        </span>
                                    </label>

                                    {hours.isOpen ? (
                                        <div className="flex items-center gap-3 flex-1">
                                            <input
                                                type="time"
                                                value={hours.open}
                                                onChange={(e) => handleDayChange(day.key, 'open', e.target.value)}
                                                className={clsx(
                                                    "px-3 py-2 rounded-lg border focus:ring-2 focus:ring-rose-500 focus:border-rose-500",
                                                    isDark
                                                        ? "bg-gray-700 border-gray-600 text-white"
                                                        : "bg-white border-gray-300 text-gray-900"
                                                )}
                                            />
                                            <span className={isDark ? "text-gray-400" : "text-gray-500"}>-</span>
                                            <input
                                                type="time"
                                                value={hours.close}
                                                onChange={(e) => handleDayChange(day.key, 'close', e.target.value)}
                                                className={clsx(
                                                    "px-3 py-2 rounded-lg border focus:ring-2 focus:ring-rose-500 focus:border-rose-500",
                                                    isDark
                                                        ? "bg-gray-700 border-gray-600 text-white"
                                                        : "bg-white border-gray-300 text-gray-900"
                                                )}
                                            />
                                        </div>
                                    ) : (
                                        <span className={clsx(
                                            "text-sm italic",
                                            isDark ? "text-gray-500" : "text-gray-400"
                                        )}>
                                            Kapalı
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </motion.div>

            {/* Appointment Settings Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className={clsx(
                    "rounded-2xl border overflow-hidden",
                    isDark ? "bg-gray-800/50 border-gray-700" : "bg-white border-gray-200"
                )}
            >
                <div className={clsx(
                    "px-6 py-4 border-b",
                    isDark ? "border-gray-700 bg-gray-800/80" : "border-gray-100 bg-gray-50"
                )}>
                    <h2 className={clsx(
                        "font-bold flex items-center gap-2",
                        isDark ? "text-white" : "text-gray-900"
                    )}>
                        <Calendar className="w-5 h-5 text-rose-500" />
                        Randevu Ayarları
                    </h2>
                </div>

                <div className="p-6 space-y-6">
                    {/* Slot Duration */}
                    <div>
                        <label className={clsx(
                            "block text-sm font-medium mb-2",
                            isDark ? "text-gray-200" : "text-gray-700"
                        )}>
                            Randevu Slot Süresi
                        </label>
                        <p className={clsx(
                            "text-xs mb-3",
                            isDark ? "text-gray-400" : "text-gray-500"
                        )}>
                            Müşterilere gösterilecek randevu saatleri arasındaki fark
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {SLOT_OPTIONS.map(opt => (
                                <button
                                    key={opt.value}
                                    onClick={() => setSlotMinutes(opt.value)}
                                    className={clsx(
                                        "px-4 py-2 rounded-lg border-2 font-medium transition-all",
                                        slotMinutes === opt.value
                                            ? "border-rose-500 bg-rose-50 text-rose-600"
                                            : isDark
                                                ? "border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500"
                                                : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                                    )}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Display Options */}
                    <div className={clsx(
                        "p-4 rounded-xl",
                        isDark ? "bg-gray-700/50" : "bg-gray-50"
                    )}>
                        <h3 className={clsx(
                            "font-medium mb-3",
                            isDark ? "text-white" : "text-gray-900"
                        )}>
                            Görünüm Seçenekleri
                        </h3>
                        <div className="space-y-3">
                            <label className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    checked={showDuration}
                                    onChange={(e) => setShowDuration(e.target.checked)}
                                    className="w-5 h-5 rounded border-gray-300 text-rose-500 focus:ring-rose-500"
                                />
                                <span className={isDark ? "text-gray-200" : "text-gray-700"}>
                                    Hizmet süresini göster
                                </span>
                            </label>
                            <label className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    checked={showStaff}
                                    onChange={(e) => setShowStaff(e.target.checked)}
                                    className="w-5 h-5 rounded border-gray-300 text-rose-500 focus:ring-rose-500"
                                />
                                <span className={isDark ? "text-gray-200" : "text-gray-700"}>
                                    Personel seçimi göster
                                </span>
                            </label>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
