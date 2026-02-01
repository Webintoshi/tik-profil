"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader, GlassCard, Button } from "@/components/ui";
import {
    Plus, Edit2, Trash2, X, Check, Loader2, Shield,
    UserCircle, Key, Mail, Clock, ToggleLeft, ToggleRight,
    AlertTriangle, Lock
} from "lucide-react";
import {
    type Admin,
    type AdminRole,
    subscribeToAdmins,
    createAdmin,
    updateAdmin,
    deleteAdmin,
    canManageAdmins,
    hashPassword,
    ROLE_LABELS,
    ROLE_COLORS
} from "@/lib/adminService";
import clsx from "clsx";

// Current user (in production, get from session)
const CURRENT_USER = "webintosh";

export default function SecurityPage() {
    const [admins, setAdmins] = useState<Admin[]>([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingItem, setEditingItem] = useState<Admin | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const canManage = canManageAdmins(CURRENT_USER);

    useEffect(() => {
        const isSupabaseConfigured = Boolean(
            process.env.NEXT_PUBLIC_SUPABASE_URL &&
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        );

        if (isSupabaseConfigured) {
            const unsubscribe = subscribeToAdmins((data) => {
                setAdmins(data);
            });
            return () => unsubscribe();
        }
    }, []);

    const handleDelete = async (admin: Admin) => {
        if (admin.username === "webintosh") {
            alert("Süper yönetici silinemez!");
            return;
        }
        if (!confirm(`"${admin.displayName}" yöneticisini silmek istediğinize emin misiniz?`)) return;

        try {
            await deleteAdmin(admin.id, CURRENT_USER);
            setAdmins(prev => prev.filter(a => a.id !== admin.id));
        } catch (error) {
            console.error("Delete error:", error);
            alert("Silme hatası: " + (error as Error).message);
        }
    };

    const formatDate = (date?: Date) => {
        if (!date) return "-";
        return new Intl.DateTimeFormat("tr-TR", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        }).format(date);
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Güvenlik ve Yöneticiler"
                description={`${admins.length} yönetici · ${admins.filter(a => a.isActive).length} aktif`}
                action={
                    canManage ? (
                        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setShowAddModal(true)}>
                            Yeni Yönetici Ekle
                        </Button>
                    ) : null
                }
            />

            {/* Permission Notice */}
            {!canManage && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-accent-orange/10 border border-accent-orange/20">
                    <Lock className="h-5 w-5 text-accent-orange flex-shrink-0" />
                    <p className="text-sm text-accent-orange">
                        Yönetici ekleme ve düzenleme yetkisi sadece <strong>webintosh</strong> kullanıcısındadır.
                    </p>
                </div>
            )}

            {/* Admins Table */}
            <GlassCard padding="none">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-dark-700/50">
                                <th className="text-left text-xs font-medium text-dark-500 px-6 py-4">Yönetici</th>
                                <th className="text-left text-xs font-medium text-dark-500 px-6 py-4 hidden md:table-cell">Kullanıcı Adı</th>
                                <th className="text-left text-xs font-medium text-dark-500 px-6 py-4">Rol</th>
                                <th className="text-left text-xs font-medium text-dark-500 px-6 py-4 hidden lg:table-cell">Son Giriş</th>
                                <th className="text-left text-xs font-medium text-dark-500 px-6 py-4">Durum</th>
                                {canManage && (
                                    <th className="text-right text-xs font-medium text-dark-500 px-6 py-4">İşlemler</th>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            <AnimatePresence mode="popLayout">
                                {admins.map((admin) => (
                                    <motion.tr
                                        key={admin.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="border-b border-dark-700/30 hover:bg-dark-800/30"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="h-10 w-10 rounded-full flex items-center justify-center"
                                                    style={{ backgroundColor: `${ROLE_COLORS[admin.role]}20` }}
                                                >
                                                    <UserCircle className="h-6 w-6" style={{ color: ROLE_COLORS[admin.role] }} />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-dark-100">{admin.displayName}</p>
                                                    {admin.email && (
                                                        <p className="text-xs text-dark-500">{admin.email}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 hidden md:table-cell">
                                            <code className="text-sm text-dark-400 bg-dark-800 px-2 py-1 rounded">{admin.username}</code>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span
                                                className="px-2.5 py-1 rounded-full text-xs font-medium"
                                                style={{
                                                    backgroundColor: `${ROLE_COLORS[admin.role]}20`,
                                                    color: ROLE_COLORS[admin.role]
                                                }}
                                            >
                                                {ROLE_LABELS[admin.role]}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 hidden lg:table-cell">
                                            <div className="flex items-center gap-2 text-sm text-dark-400">
                                                <Clock className="h-4 w-4" />
                                                {formatDate(admin.lastLogin)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={clsx(
                                                "px-2 py-1 rounded-full text-xs font-medium",
                                                admin.isActive
                                                    ? "bg-accent-green/15 text-accent-green"
                                                    : "bg-dark-700 text-dark-400"
                                            )}>
                                                {admin.isActive ? "Aktif" : "Pasif"}
                                            </span>
                                        </td>
                                        {canManage && (
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => setEditingItem(admin)}
                                                        className="p-2 rounded-lg hover:bg-dark-700 text-dark-400 hover:text-dark-200 transition-colors"
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </button>
                                                    {admin.username !== "webintosh" && (
                                                        <button
                                                            onClick={() => handleDelete(admin)}
                                                            className="p-2 rounded-lg hover:bg-red-500/10 text-dark-400 hover:text-red-500 transition-colors"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        )}
                                    </motion.tr>
                                ))}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>

                {admins.length === 0 && (
                    <div className="text-center py-12 text-dark-500">
                        Henüz yönetici eklenmemiş
                    </div>
                )}
            </GlassCard>

            {/* Security Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <GlassCard>
                    <div className="flex items-start gap-4">
                        <div className="h-12 w-12 rounded-xl bg-accent-blue/15 flex items-center justify-center">
                            <Shield className="h-6 w-6 text-accent-blue" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-dark-100 mb-1">Güvenlik Politikası</h3>
                            <p className="text-sm text-dark-400">
                                Tüm yönetici girişleri loglanır. IP bazlı erişim kontrolü aktiftir.
                            </p>
                        </div>
                    </div>
                </GlassCard>

                <GlassCard>
                    <div className="flex items-start gap-4">
                        <div className="h-12 w-12 rounded-xl bg-accent-purple/15 flex items-center justify-center">
                            <Key className="h-6 w-6 text-accent-purple" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-dark-100 mb-1">Oturum Süresi</h3>
                            <p className="text-sm text-dark-400">
                                Yönetici oturumları 24 saat sonra otomatik sonlanır.
                            </p>
                        </div>
                    </div>
                </GlassCard>
            </div>

            {/* Add/Edit Modal */}
            <AnimatePresence>
                {(showAddModal || editingItem) && (
                    <AdminModal
                        item={editingItem}
                        onClose={() => {
                            setShowAddModal(false);
                            setEditingItem(null);
                        }}
                        onSave={async (data, newPassword) => {
                            setIsLoading(true);
                            try {
                                if (editingItem) {
                                    const updateData: Partial<Admin> = { ...data };
                                    if (newPassword) {
                                        updateData.passwordHash = await hashPassword(newPassword);
                                    }
                                    await updateAdmin(editingItem.id, updateData, CURRENT_USER);
                                    setAdmins(prev => prev.map(a =>
                                        a.id === editingItem.id ? { ...a, ...updateData } : a
                                    ));
                                } else {
                                    if (!newPassword) {
                                        throw new Error("Yeni yönetici için şifre zorunludur");
                                    }
                                    const id = await createAdmin({
                                        ...data,
                                        passwordHash: await hashPassword(newPassword),
                                        createdBy: CURRENT_USER,
                                    }, CURRENT_USER);
                                    setAdmins(prev => [...prev, {
                                        ...data,
                                        id,
                                        passwordHash: "",
                                        createdAt: new Date(),
                                        createdBy: CURRENT_USER,
                                    }]);
                                }
                                setShowAddModal(false);
                                setEditingItem(null);
                            } catch (error) {
                                console.error("Save error:", error);
                                alert("Kaydetme hatası: " + (error as Error).message);
                            }
                            setIsLoading(false);
                        }}
                        isLoading={isLoading}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

// Admin Modal
function AdminModal({
    item,
    onClose,
    onSave,
    isLoading
}: {
    item: Admin | null;
    onClose: () => void;
    onSave: (data: Omit<Admin, "id" | "createdAt" | "passwordHash" | "createdBy">, newPassword?: string) => void;
    isLoading: boolean;
}) {
    const [displayName, setDisplayName] = useState(item?.displayName || "");
    const [username, setUsername] = useState(item?.username || "");
    const [email, setEmail] = useState(item?.email || "");
    const [role, setRole] = useState<AdminRole>(item?.role || "admin");
    const [password, setPassword] = useState("");
    const [isActive, setIsActive] = useState(item?.isActive ?? true);

    const isEditingWebintosh = item?.username === "webintosh";

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // Import ROLE_PERMISSIONS to get default permissions for role
        const { ROLE_PERMISSIONS } = await import("@/lib/adminService");
        await onSave({
            displayName,
            username: isEditingWebintosh ? "webintosh" : username,
            email: email || undefined,
            role: isEditingWebintosh ? "super_admin" : role,
            permissions: item?.permissions || ROLE_PERMISSIONS[isEditingWebintosh ? "super_admin" : role] || [],
            isActive,
            lastLogin: item?.lastLogin,
        }, password || undefined);
    };

    return (
        <>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 z-50 bg-dark-950/80 backdrop-blur-md"
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
            >
                <div
                    onClick={(e) => e.stopPropagation()}
                    className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-dark-700/50 pointer-events-auto"
                    style={{ background: "rgba(28, 28, 30, 0.95)", backdropFilter: "blur(40px)" }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-dark-700/50">
                        <h2 className="text-lg font-semibold text-dark-100">
                            {item ? "Yönetici Düzenle" : "Yeni Yönetici Ekle"}
                        </h2>
                        <button onClick={onClose} className="p-2 rounded-lg hover:bg-dark-700">
                            <X className="h-5 w-5 text-dark-400" />
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="p-6 space-y-5">
                        {isEditingWebintosh && (
                            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-accent-orange/10 border border-accent-orange/20">
                                <AlertTriangle className="h-5 w-5 text-accent-orange flex-shrink-0" />
                                <p className="text-sm text-accent-orange">
                                    Süper yönetici ayarları kısıtlıdır.
                                </p>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-dark-300 mb-2">Görünen Ad</label>
                                <input
                                    type="text"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    required
                                    className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-dark-700 text-dark-100 focus:outline-none focus:border-accent-blue"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-dark-300 mb-2">Kullanıcı Adı</label>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                    disabled={isEditingWebintosh}
                                    className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-dark-700 text-dark-100 focus:outline-none focus:border-accent-blue font-mono disabled:opacity-50"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-dark-300 mb-2">E-posta (Opsiyonel)</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="admin@example.com"
                                className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-dark-700 text-dark-100 placeholder-dark-500 focus:outline-none focus:border-accent-blue"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-dark-300 mb-2">Rol</label>
                                <select
                                    value={role}
                                    onChange={(e) => setRole(e.target.value as AdminRole)}
                                    disabled={isEditingWebintosh}
                                    className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-dark-700 text-dark-100 focus:outline-none focus:border-accent-blue disabled:opacity-50"
                                >
                                    <option value="super_admin">Süper Yönetici</option>
                                    <option value="admin">Yönetici</option>
                                    <option value="moderator">Moderatör</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-dark-300 mb-2">
                                    {item ? "Yeni Şifre (boş bırakın)" : "Şifre"}
                                </label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required={!item}
                                    className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-dark-700 text-dark-100 focus:outline-none focus:border-accent-blue"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-2">
                            <span className="text-sm font-medium text-dark-300">Hesap Durumu</span>
                            <button
                                type="button"
                                onClick={() => setIsActive(!isActive)}
                                disabled={isEditingWebintosh}
                                className={clsx(
                                    "flex items-center gap-2 px-4 py-2 rounded-xl transition-colors",
                                    isActive
                                        ? "bg-accent-green/15 text-accent-green"
                                        : "bg-dark-700 text-dark-400",
                                    isEditingWebintosh && "opacity-50 cursor-not-allowed"
                                )}
                            >
                                {isActive ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
                                {isActive ? "Aktif" : "Pasif"}
                            </button>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-4 py-3 rounded-xl bg-dark-700 text-dark-200 hover:bg-dark-600 font-medium transition-colors"
                            >
                                İptal
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading || !displayName || !username}
                                className="flex-1 px-4 py-3 rounded-xl bg-accent-blue text-white font-medium hover:bg-accent-blue/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
                                {item ? "Güncelle" : "Kaydet"}
                            </button>
                        </div>
                    </form>
                </div>
            </motion.div>
        </>
    );
}
