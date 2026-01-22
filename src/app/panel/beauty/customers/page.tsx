"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Plus, Edit3, Trash2, Loader2, Save, X, Search,
    Phone, Mail, Tag, User, Calendar, Clock, DollarSign,
    FileText, ChevronDown, ChevronUp
} from "lucide-react";
import clsx from "clsx";
import { toast } from "sonner";
import { useTheme } from "@/components/panel/ThemeProvider";
import { Customer, Appointment } from "@/types/beauty";
import { useBusinessSession } from "@/hooks/useBusinessSession";

// Tag color mapping
const TAG_COLORS: Record<string, string> = {
    "VIP": "bg-yellow-100 text-yellow-700 border-yellow-200",
    "Yeni": "bg-green-100 text-green-700 border-green-200",
    "Sadık": "bg-purple-100 text-purple-700 border-purple-200",
    "İptal Riski": "bg-red-100 text-red-700 border-red-200",
    "default": "bg-gray-100 text-gray-600 border-gray-200",
};

const AVAILABLE_TAGS = ["VIP", "Yeni", "Sadık", "İptal Riski"];

export default function BeautyCustomersPage() {
    const { isDark } = useTheme();
    const { session: business } = useBusinessSession();
    const [loading, setLoading] = useState(true);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);
    const [customerAppointments, setCustomerAppointments] = useState<Record<string, Appointment[]>>({});
    const [loadingHistory, setLoadingHistory] = useState<string | null>(null);
    const hasFetched = useRef(false);

    const [form, setForm] = useState({
        name: "",
        phone: "",
        email: "",
        notes: "",
        tags: [] as string[],
    });

    const loadCustomers = useCallback(async () => {
        if (!business?.businessId) return;
        try {
            setLoading(true);
            const res = await fetch('/api/beauty/customers');
            const data = await res.json();
            if (data.success) {
                setCustomers(data.customers || []);
            }
        } catch (error) {
            console.error('Load error:', error);
            toast.error('Müşteriler yüklenirken hata oluştu');
        } finally {
            setLoading(false);
        }
    }, [business?.businessId]);

    useEffect(() => {
        if (business?.businessId && !hasFetched.current) {
            hasFetched.current = true;
            loadCustomers();
        }
    }, [business?.businessId, loadCustomers]);

    const loadAppointmentHistory = async (customerId: string, customerPhone: string) => {
        if (customerAppointments[customerId]) return;

        setLoadingHistory(customerId);
        try {
            const res = await fetch(`/api/beauty/appointments?businessId=${business?.businessId}`);
            const data = await res.json();
            if (data.success) {
                const customerAppts = (data.appointments || []).filter(
                    (a: Appointment) => a.customerPhone === customerPhone
                );
                setCustomerAppointments(prev => ({
                    ...prev,
                    [customerId]: customerAppts
                }));
            }
        } catch (error) {
            console.error('Load history error:', error);
        } finally {
            setLoadingHistory(null);
        }
    };

    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone.includes(searchQuery) ||
        c.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const openModal = (customer?: Customer) => {
        if (customer) {
            setEditingId(customer.id);
            setForm({
                name: customer.name,
                phone: customer.phone,
                email: customer.email || "",
                notes: customer.notes || "",
                tags: customer.tags || [],
            });
        } else {
            setEditingId(null);
            setForm({
                name: "",
                phone: "",
                email: "",
                notes: "",
                tags: [],
            });
        }
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!form.name.trim() || !form.phone.trim()) {
            toast.error('Ad ve telefon zorunlu');
            return;
        }

        setSaving(true);
        try {
            const method = editingId ? 'PUT' : 'POST';
            const payload = editingId ? { id: editingId, ...form } : form;

            const res = await fetch('/api/beauty/customers', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (data.success) {
                toast.success(editingId ? 'Müşteri güncellendi!' : 'Müşteri eklendi!');
                setShowModal(false);
                loadCustomers();
            } else {
                toast.error(data.error || 'Bir hata oluştu');
            }
        } catch (error) {
            console.error('Submit error:', error);
            toast.error('İşlem sırasında hata oluştu');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            const res = await fetch(`/api/beauty/customers?id=${id}`, {
                method: 'DELETE',
            });
            const data = await res.json();

            if (data.success) {
                toast.success('Müşteri silindi');
                setCustomers(prev => prev.filter(c => c.id !== id));
            } else {
                toast.error(data.error || 'Silme hatası');
            }
        } catch (error) {
            console.error('Delete error:', error);
            toast.error('Silme sırasında hata oluştu');
        } finally {
            setDeleteConfirm(null);
        }
    };

    const toggleTag = (tag: string) => {
        setForm(prev => ({
            ...prev,
            tags: prev.tags.includes(tag)
                ? prev.tags.filter(t => t !== tag)
                : [...prev.tags, tag]
        }));
    };

    const toggleExpand = (customerId: string, phone: string) => {
        if (expandedCustomer === customerId) {
            setExpandedCustomer(null);
        } else {
            setExpandedCustomer(customerId);
            loadAppointmentHistory(customerId, phone);
        }
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
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className={clsx(
                        "text-2xl font-bold",
                        isDark ? "text-white" : "text-gray-900"
                    )}>
                        <User className="inline-block w-6 h-6 mr-2 -mt-1" />
                        Müşteriler
                    </h1>
                    <p className={clsx(
                        "text-sm mt-1",
                        isDark ? "text-gray-400" : "text-gray-500"
                    )}>
                        {customers.length} müşteri kayıtlı
                    </p>
                </div>
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => openModal()}
                    className="px-4 py-2.5 bg-gradient-to-r from-rose-500 to-pink-600 text-white font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-rose-500/25"
                >
                    <Plus className="w-5 h-5" />
                    Yeni Müşteri
                </motion.button>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                    type="text"
                    placeholder="İsim, telefon veya email ile ara..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={clsx(
                        "w-full pl-12 pr-4 py-3 rounded-xl border focus:ring-2 focus:ring-rose-500 focus:border-rose-500",
                        isDark
                            ? "bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                            : "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400"
                    )}
                />
            </div>

            {/* Customer List */}
            <div className="space-y-3">
                <AnimatePresence>
                    {filteredCustomers.length === 0 ? (
                        <div className={clsx(
                            "text-center py-12 rounded-2xl border-2 border-dashed",
                            isDark ? "border-gray-700 text-gray-400" : "border-gray-200 text-gray-500"
                        )}>
                            <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p className="font-medium">
                                {searchQuery ? "Sonuç bulunamadı" : "Henüz müşteri yok"}
                            </p>
                            <p className="text-sm mt-1">
                                {searchQuery ? "Farklı bir arama deneyin" : "İlk müşterinizi ekleyin"}
                            </p>
                        </div>
                    ) : (
                        filteredCustomers.map((customer, index) => (
                            <motion.div
                                key={customer.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ delay: index * 0.05 }}
                                className={clsx(
                                    "rounded-2xl border overflow-hidden",
                                    isDark ? "bg-gray-800/50 border-gray-700" : "bg-white border-gray-200"
                                )}
                            >
                                {/* Customer Card */}
                                <div className="p-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h3 className={clsx(
                                                    "font-bold text-lg",
                                                    isDark ? "text-white" : "text-gray-900"
                                                )}>
                                                    {customer.name}
                                                </h3>
                                                {customer.tags?.map(tag => (
                                                    <span
                                                        key={tag}
                                                        className={clsx(
                                                            "px-2 py-0.5 text-xs font-medium rounded-full border",
                                                            TAG_COLORS[tag] || TAG_COLORS.default
                                                        )}
                                                    >
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                            <div className="flex flex-wrap gap-4 mt-2 text-sm">
                                                <span className={clsx(
                                                    "flex items-center gap-1",
                                                    isDark ? "text-gray-400" : "text-gray-500"
                                                )}>
                                                    <Phone className="w-4 h-4" />
                                                    {customer.phone}
                                                </span>
                                                {customer.email && (
                                                    <span className={clsx(
                                                        "flex items-center gap-1",
                                                        isDark ? "text-gray-400" : "text-gray-500"
                                                    )}>
                                                        <Mail className="w-4 h-4" />
                                                        {customer.email}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Stats */}
                                            <div className="flex flex-wrap gap-4 mt-3 text-sm">
                                                <span className={clsx(
                                                    "flex items-center gap-1",
                                                    isDark ? "text-gray-400" : "text-gray-500"
                                                )}>
                                                    <Calendar className="w-4 h-4 text-rose-500" />
                                                    {customer.totalAppointments || 0} randevu
                                                </span>
                                                <span className={clsx(
                                                    "flex items-center gap-1",
                                                    isDark ? "text-gray-400" : "text-gray-500"
                                                )}>
                                                    <DollarSign className="w-4 h-4 text-green-500" />
                                                    ₺{(customer.totalSpent || 0).toLocaleString('tr-TR')}
                                                </span>
                                                {customer.lastVisit && (
                                                    <span className={clsx(
                                                        "flex items-center gap-1",
                                                        isDark ? "text-gray-400" : "text-gray-500"
                                                    )}>
                                                        <Clock className="w-4 h-4" />
                                                        Son: {new Date(customer.lastVisit).toLocaleDateString('tr-TR')}
                                                    </span>
                                                )}
                                            </div>

                                            {customer.notes && (
                                                <p className={clsx(
                                                    "mt-2 text-sm p-2 rounded-lg",
                                                    isDark ? "bg-gray-700/50 text-gray-300" : "bg-gray-50 text-gray-600"
                                                )}>
                                                    <FileText className="w-4 h-4 inline mr-1" />
                                                    {customer.notes}
                                                </p>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => toggleExpand(customer.id, customer.phone)}
                                                className={clsx(
                                                    "p-2 rounded-lg transition-colors",
                                                    isDark ? "hover:bg-gray-700" : "hover:bg-gray-100"
                                                )}
                                                title="Randevu Geçmişi"
                                            >
                                                {expandedCustomer === customer.id ? (
                                                    <ChevronUp className="w-5 h-5 text-rose-500" />
                                                ) : (
                                                    <ChevronDown className="w-5 h-5 text-gray-400" />
                                                )}
                                            </button>
                                            <button
                                                onClick={() => openModal(customer)}
                                                className={clsx(
                                                    "p-2 rounded-lg transition-colors",
                                                    isDark ? "hover:bg-gray-700" : "hover:bg-gray-100"
                                                )}
                                            >
                                                <Edit3 className="w-5 h-5 text-gray-400" />
                                            </button>
                                            {deleteConfirm === customer.id ? (
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => handleDelete(customer.id)}
                                                        className="p-2 rounded-lg bg-red-500 text-white hover:bg-red-600"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => setDeleteConfirm(null)}
                                                        className={clsx(
                                                            "p-2 rounded-lg",
                                                            isDark ? "bg-gray-700" : "bg-gray-100"
                                                        )}
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => setDeleteConfirm(customer.id)}
                                                    className={clsx(
                                                        "p-2 rounded-lg transition-colors",
                                                        isDark ? "hover:bg-gray-700" : "hover:bg-gray-100"
                                                    )}
                                                >
                                                    <Trash2 className="w-5 h-5 text-gray-400 hover:text-red-500" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Appointment History */}
                                <AnimatePresence>
                                    {expandedCustomer === customer.id && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className={clsx(
                                                "border-t",
                                                isDark ? "border-gray-700 bg-gray-800/30" : "border-gray-100 bg-gray-50"
                                            )}
                                        >
                                            <div className="p-4">
                                                <h4 className={clsx(
                                                    "font-medium mb-3",
                                                    isDark ? "text-gray-200" : "text-gray-700"
                                                )}>
                                                    Randevu Geçmişi
                                                </h4>
                                                {loadingHistory === customer.id ? (
                                                    <div className="flex items-center justify-center py-4">
                                                        <Loader2 className="w-5 h-5 animate-spin text-rose-500" />
                                                    </div>
                                                ) : customerAppointments[customer.id]?.length ? (
                                                    <div className="space-y-2">
                                                        {customerAppointments[customer.id].slice(0, 5).map(appt => (
                                                            <div
                                                                key={appt.id}
                                                                className={clsx(
                                                                    "flex items-center justify-between p-3 rounded-xl",
                                                                    isDark ? "bg-gray-700/50" : "bg-white"
                                                                )}
                                                            >
                                                                <div>
                                                                    <p className={clsx(
                                                                        "font-medium",
                                                                        isDark ? "text-white" : "text-gray-900"
                                                                    )}>
                                                                        {appt.serviceName}
                                                                    </p>
                                                                    <p className={clsx(
                                                                        "text-sm",
                                                                        isDark ? "text-gray-400" : "text-gray-500"
                                                                    )}>
                                                                        {new Date(appt.date).toLocaleDateString('tr-TR')} - {appt.startTime}
                                                                    </p>
                                                                </div>
                                                                <span className={clsx(
                                                                    "px-2 py-1 text-xs font-medium rounded-lg",
                                                                    appt.status === 'completed' ? "bg-green-100 text-green-700" :
                                                                        appt.status === 'cancelled' ? "bg-red-100 text-red-700" :
                                                                            appt.status === 'confirmed' ? "bg-blue-100 text-blue-700" :
                                                                                "bg-yellow-100 text-yellow-700"
                                                                )}>
                                                                    {appt.status === 'completed' ? 'Tamamlandı' :
                                                                        appt.status === 'cancelled' ? 'İptal' :
                                                                            appt.status === 'confirmed' ? 'Onaylı' : 'Bekliyor'}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className={clsx(
                                                        "text-sm text-center py-4",
                                                        isDark ? "text-gray-500" : "text-gray-400"
                                                    )}>
                                                        Henüz randevu kaydı yok
                                                    </p>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        ))
                    )}
                </AnimatePresence>
            </div>

            {/* Modal */}
            <AnimatePresence>
                {showModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className={clsx(
                                "w-full max-w-md rounded-2xl shadow-2xl",
                                isDark ? "bg-gray-800" : "bg-white"
                            )}
                        >
                            <div className={clsx(
                                "px-6 py-4 border-b flex items-center justify-between",
                                isDark ? "border-gray-700" : "border-gray-200"
                            )}>
                                <h2 className={clsx(
                                    "font-bold text-lg",
                                    isDark ? "text-white" : "text-gray-900"
                                )}>
                                    {editingId ? "Müşteri Düzenle" : "Yeni Müşteri"}
                                </h2>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className={clsx(
                                        "p-2 rounded-lg transition-colors",
                                        isDark ? "hover:bg-gray-700" : "hover:bg-gray-100"
                                    )}
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                {/* Name */}
                                <div>
                                    <label className={clsx(
                                        "block text-sm font-medium mb-1.5",
                                        isDark ? "text-gray-200" : "text-gray-700"
                                    )}>
                                        Ad Soyad *
                                    </label>
                                    <input
                                        type="text"
                                        value={form.name}
                                        onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
                                        placeholder="Müşteri adı"
                                        className={clsx(
                                            "w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-rose-500",
                                            isDark
                                                ? "bg-gray-700 border-gray-600 text-white"
                                                : "bg-white border-gray-200 text-gray-900"
                                        )}
                                    />
                                </div>

                                {/* Phone */}
                                <div>
                                    <label className={clsx(
                                        "block text-sm font-medium mb-1.5",
                                        isDark ? "text-gray-200" : "text-gray-700"
                                    )}>
                                        Telefon *
                                    </label>
                                    <input
                                        type="tel"
                                        value={form.phone}
                                        onChange={(e) => setForm(p => ({ ...p, phone: e.target.value }))}
                                        placeholder="05XX XXX XX XX"
                                        className={clsx(
                                            "w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-rose-500",
                                            isDark
                                                ? "bg-gray-700 border-gray-600 text-white"
                                                : "bg-white border-gray-200 text-gray-900"
                                        )}
                                    />
                                </div>

                                {/* Email */}
                                <div>
                                    <label className={clsx(
                                        "block text-sm font-medium mb-1.5",
                                        isDark ? "text-gray-200" : "text-gray-700"
                                    )}>
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        value={form.email}
                                        onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))}
                                        placeholder="ornek@email.com"
                                        className={clsx(
                                            "w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-rose-500",
                                            isDark
                                                ? "bg-gray-700 border-gray-600 text-white"
                                                : "bg-white border-gray-200 text-gray-900"
                                        )}
                                    />
                                </div>

                                {/* Tags */}
                                <div>
                                    <label className={clsx(
                                        "block text-sm font-medium mb-1.5",
                                        isDark ? "text-gray-200" : "text-gray-700"
                                    )}>
                                        Etiketler
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {AVAILABLE_TAGS.map(tag => (
                                            <button
                                                key={tag}
                                                type="button"
                                                onClick={() => toggleTag(tag)}
                                                className={clsx(
                                                    "px-3 py-1.5 rounded-lg border text-sm font-medium transition-all",
                                                    form.tags.includes(tag)
                                                        ? TAG_COLORS[tag] || TAG_COLORS.default
                                                        : isDark
                                                            ? "border-gray-600 text-gray-400 hover:border-gray-500"
                                                            : "border-gray-200 text-gray-500 hover:border-gray-300"
                                                )}
                                            >
                                                <Tag className="w-3 h-3 inline mr-1" />
                                                {tag}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Notes */}
                                <div>
                                    <label className={clsx(
                                        "block text-sm font-medium mb-1.5",
                                        isDark ? "text-gray-200" : "text-gray-700"
                                    )}>
                                        Notlar
                                    </label>
                                    <textarea
                                        value={form.notes}
                                        onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))}
                                        placeholder="Müşteri hakkında notlar..."
                                        rows={3}
                                        className={clsx(
                                            "w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-rose-500 resize-none",
                                            isDark
                                                ? "bg-gray-700 border-gray-600 text-white"
                                                : "bg-white border-gray-200 text-gray-900"
                                        )}
                                    />
                                </div>

                                {/* Submit */}
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="w-full py-3 bg-gradient-to-r from-rose-500 to-pink-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {saving ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <Save className="w-5 h-5" />
                                    )}
                                    {editingId ? "Güncelle" : "Kaydet"}
                                </button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
