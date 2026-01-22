"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Users,
    Plus,
    Loader2,
    Edit2,
    Trash2,
    X,
    Check,
    Search,
    Phone,
    Mail,
    MapPin,
} from "lucide-react";
import { toast } from "sonner";
import clsx from "clsx";
import { useBusinessSession } from "@/hooks/useBusinessSession";
import { useTheme } from "@/components/panel/ThemeProvider";
import type { Customer } from "@/types/ecommerce";

export default function EcommerceCustomersPage() {
    const { session } = useBusinessSession();
    const { isDark } = useTheme();
    const [isLoading, setIsLoading] = useState(true);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [stats, setStats] = useState({
        total: 0,
        totalRevenue: 0,
        avgOrderValue: 0,
    });

    // Fetch customers
    useEffect(() => {
        async function fetchCustomers() {
            if (!session?.businessId) return;

            try {
                const res = await fetch(`/api/ecommerce/customers?businessId=${session.businessId}`);
                if (res.ok) {
                    const data = await res.json();
                    setCustomers(data.customers || []);
                    setStats(data.stats || {});
                }
            } catch (error) {
                console.error("Customers fetch error:", error);
                toast.error("Müşteriler yüklenemedi");
            } finally {
                setIsLoading(false);
            }
        }

        fetchCustomers();
    }, [session?.businessId]);

    // Filter customers
    const filteredCustomers = customers.filter((customer) => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            customer.name.toLowerCase().includes(query) ||
            customer.email.toLowerCase().includes(query) ||
            customer.phone.includes(searchQuery)
        );
    });

    // Handle save
    const handleSave = async (customerData: Partial<Customer>) => {
        if (!session?.businessId) return;

        try {
            const isEdit = !!editingCustomer;
            const res = await fetch("/api/ecommerce/customers", {
                method: isEdit ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    businessId: session.businessId,
                    id: editingCustomer?.id,
                    ...customerData,
                }),
            });

            if (res.ok) {
                const data = await res.json();
                if (isEdit) {
                    setCustomers(prev =>
                        prev.map(c => c.id === editingCustomer.id ? { ...c, ...customerData } : c)
                    );
                    toast.success("Müşteri güncellendi");
                } else {
                    setCustomers(prev => [data.customer, ...prev]);
                    toast.success("Müşteri eklendi");
                }
                setShowModal(false);
                setEditingCustomer(null);
            } else {
                const error = await res.json();
                toast.error(error.error || "İşlem başarısız");
            }
        } catch (error) {
            console.error("Save error:", error);
            toast.error("Bağlantı hatası");
        }
    };

    // Handle delete
    const handleDelete = async (id: string) => {
        if (!session?.businessId) return;

        setIsDeleting(id);
        try {
            const res = await fetch(
                `/api/ecommerce/customers?businessId=${session.businessId}&id=${id}`,
                { method: "DELETE" }
            );

            if (res.ok) {
                setCustomers(prev => prev.filter(c => c.id !== id));
                toast.success("Müşteri silindi");
            } else {
                const error = await res.json();
                toast.error(error.error || "Silme başarısız");
            }
        } catch (error) {
            console.error("Delete error:", error);
            toast.error("Bağlantı hatası");
        } finally {
            setIsDeleting(null);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className={clsx("h-8 w-8 animate-spin", isDark ? "text-cyan-400" : "text-cyan-500")} />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-4 sm:p-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center">
                        <Users className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h1 className={clsx("text-xl font-bold", isDark ? "text-white" : "text-gray-900")}>Müşteriler</h1>
                        <p className={clsx("text-sm", isDark ? "text-white/50" : "text-gray-500")}>{stats.total} müşteri</p>
                    </div>
                </div>

                <button
                    onClick={() => {
                        setEditingCustomer(null);
                        setShowModal(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium transition-colors"
                >
                    <Plus className="h-4 w-4" />
                    Yeni Müşteri
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mb-6">
                <div className={clsx("rounded-xl border p-3", isDark ? "bg-white/[0.03] border-white/10" : "bg-white border-gray-100")}>
                    <p className={clsx("text-2xl font-bold", isDark ? "text-white" : "text-gray-900")}>{stats.total}</p>
                    <p className={clsx("text-sm", isDark ? "text-white/50" : "text-gray-500")}>Toplam Müşteri</p>
                </div>
                <div className={clsx("rounded-xl border p-3", isDark ? "bg-white/[0.03] border-white/10" : "bg-white border-gray-100")}>
                    <p className="text-2xl font-bold text-emerald-500">
                        {stats.totalRevenue.toLocaleString("tr-TR")}₺
                    </p>
                    <p className={clsx("text-sm", isDark ? "text-white/50" : "text-gray-500")}>Toplam Gelir</p>
                </div>
                <div className={clsx("rounded-xl border p-3", isDark ? "bg-white/[0.03] border-white/10" : "bg-white border-gray-100")}>
                    <p className={clsx("text-2xl font-bold", isDark ? "text-white" : "text-gray-900")}>
                        {stats.avgOrderValue.toLocaleString("tr-TR", { maximumFractionDigits: 0 })}₺
                    </p>
                    <p className={clsx("text-sm", isDark ? "text-white/50" : "text-gray-500")}>Ort. Sipariş</p>
                </div>
            </div>

            {/* Search */}
            <div className="relative mb-6">
                <Search className={clsx("absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5", isDark ? "text-white/40" : "text-gray-400")} />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Ad, email veya telefon ile ara..."
                    className={clsx(
                        "w-full pl-10 pr-4 py-2.5 rounded-xl border outline-none",
                        isDark
                            ? "bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-cyan-500/50"
                            : "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                    )}
                />
            </div>

            {/* Customers List */}
            {filteredCustomers.length === 0 ? (
                <div className={clsx("text-center py-16 rounded-2xl", isDark ? "bg-white/5" : "bg-gray-50")}>
                    <Users className={clsx("h-12 w-12 mx-auto mb-4", isDark ? "text-white/20" : "text-gray-300")} />
                    <h3 className={clsx("text-lg font-medium mb-2", isDark ? "text-white" : "text-gray-900")}>
                        {searchQuery ? "Müşteri bulunamadı" : "Henüz müşteri yok"}
                    </h3>
                    <p className={clsx("mb-4", isDark ? "text-white/50" : "text-gray-500")}>
                        {searchQuery
                            ? "Arama kriterlerinizi değiştirmeyi deneyin"
                            : "Siparişler üzerinden müşteriler otomatik eklenir veya manuel ekleyebilirsiniz"}
                    </p>
                    {!searchQuery && (
                        <button
                            onClick={() => setShowModal(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600"
                        >
                            <Plus className="h-4 w-4" />
                            İlk Müşteriyi Ekle
                        </button>
                    )}
                </div>
            ) : (
                <div className={clsx("rounded-2xl border divide-y", isDark ? "bg-white/[0.03] border-white/10 divide-white/10" : "bg-white border-gray-100 divide-gray-100")}>
                    {filteredCustomers.map((customer, index) => (
                        <motion.div
                            key={customer.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.03 }}
                            className={clsx("p-4 transition-colors", isDark ? "hover:bg-white/5" : "hover:bg-gray-50")}
                        >
                            <div className="flex items-center gap-4">
                                {/* Avatar */}
                                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white font-bold text-lg">
                                    {customer.name.charAt(0).toUpperCase()}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <h3 className={clsx("font-medium", isDark ? "text-white" : "text-gray-900")}>{customer.name}</h3>
                                    <div className={clsx("flex flex-wrap gap-3 text-sm", isDark ? "text-white/50" : "text-gray-500")}>
                                        <span className="flex items-center gap-1">
                                            <Phone className="h-3.5 w-3.5" />
                                            {customer.phone}
                                        </span>
                                        {customer.email && (
                                            <span className="flex items-center gap-1">
                                                <Mail className="h-3.5 w-3.5" />
                                                {customer.email}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Stats */}
                                <div className="text-right hidden sm:block">
                                    <p className="font-bold text-gray-900">
                                        {(customer.totalSpent || 0).toLocaleString("tr-TR")}₺
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {customer.totalOrders || 0} sipariş
                                    </p>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => {
                                            setEditingCustomer(customer);
                                            setShowModal(true);
                                        }}
                                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                    >
                                        <Edit2 className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(customer.id)}
                                        disabled={isDeleting === customer.id}
                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                    >
                                        {isDeleting === customer.id ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Trash2 className="h-4 w-4" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Customer Modal */}
            <AnimatePresence>
                {showModal && (
                    <CustomerModal
                        customer={editingCustomer}
                        onSave={handleSave}
                        onClose={() => {
                            setShowModal(false);
                            setEditingCustomer(null);
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

// Customer Modal
function CustomerModal({
    customer,
    onSave,
    onClose,
}: {
    customer: Customer | null;
    onSave: (data: Partial<Customer>) => Promise<void>;
    onClose: () => void;
}) {
    const [name, setName] = useState(customer?.name || "");
    const [phone, setPhone] = useState(customer?.phone || "");
    const [email, setEmail] = useState(customer?.email || "");
    const [notes, setNotes] = useState(customer?.notes || "");
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            toast.error("Müşteri adı zorunlu");
            return;
        }
        if (!phone.trim() || phone.length < 10) {
            toast.error("Geçerli telefon numarası girin");
            return;
        }

        setIsSaving(true);
        await onSave({
            name: name.trim(),
            phone: phone.trim(),
            email: email.trim() || undefined,
            notes: notes.trim() || undefined,
            addresses: customer?.addresses || [],
        });
        setIsSaving(false);
    };

    return (
        <>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 bg-black/50 z-50"
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
                <div
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white rounded-2xl shadow-xl w-full max-w-md"
                >
                    <div className="flex items-center justify-between p-4 border-b border-gray-100">
                        <h3 className="font-semibold text-gray-900">
                            {customer ? "Müşteri Düzenle" : "Yeni Müşteri"}
                        </h3>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-4 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Ad Soyad *
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Müşteri adı"
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none text-gray-900 placeholder:text-gray-400"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Telefon *
                            </label>
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="05XX XXX XX XX"
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none text-gray-900 placeholder:text-gray-400"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                E-posta
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="ornek@email.com"
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none text-gray-900 placeholder:text-gray-400"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Notlar
                            </label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Müşteri hakkında notlar..."
                                rows={2}
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none resize-none"
                            />
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50"
                            >
                                İptal
                            </button>
                            <button
                                type="submit"
                                disabled={isSaving || !name.trim() || !phone.trim()}
                                className="flex-1 px-4 py-2.5 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isSaving ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Check className="h-4 w-4" />
                                )}
                                Kaydet
                            </button>
                        </div>
                    </form>
                </div>
            </motion.div>
        </>
    );
}

