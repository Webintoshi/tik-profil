"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Users,
    Plus,
    Edit2,
    Trash2,
    Mail,
    Phone,
    Shield,
    ShieldCheck,
    ShieldAlert,
    Loader2,
    X,
    Check,
    Eye,
    EyeOff,
    Clock,
    AlertCircle
} from "lucide-react";
import { useBusinessSession } from "@/hooks/useBusinessSession";
import {
    PERMISSION_MODULES,
    getAvailableModules,
    getDefaultPermissionsForRole,
    StaffRole
} from "@/lib/permissions";

// ============================================
// TYPES
// ============================================

interface StaffMember {
    id: string;
    email: string;
    phone?: string;
    name: string;
    role: StaffRole;
    permissions: string[];
    is_active: boolean;
    created_at: string;
    last_login?: string;
}

interface StaffFormData {
    name: string;
    email: string;
    phone: string;
    password: string;
    role: StaffRole;
    permissions: string[];
}

// ============================================
// ROLE CONFIG
// ============================================

const ROLE_CONFIG: Record<StaffRole, { label: string; icon: typeof Shield; color: string }> = {
    owner: { label: "Sahip", icon: ShieldAlert, color: "text-amber-500" },
    manager: { label: "Yönetici", icon: ShieldCheck, color: "text-blue-500" },
    staff: { label: "Personel", icon: Shield, color: "text-gray-500" }
};

// ============================================
// COMPONENT
// ============================================

export default function StaffPage() {
    const { session, isLoading: sessionLoading } = useBusinessSession();
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    const [formData, setFormData] = useState<StaffFormData>({
        name: "",
        email: "",
        phone: "",
        password: "",
        role: "staff",
        permissions: []
    });

    // Load staff members
    useEffect(() => {
        if (!session?.businessId) return;
        loadStaff();
    }, [session?.businessId]);

    const loadStaff = async () => {
        if (!session?.businessId) return;

        setIsLoading(true);
        try {
            const response = await fetch(`/api/panel/staff?businessId=${session.businessId}`);
            if (response.ok) {
                const data = await response.json();
                setStaff(data.staff || []);
            }
        } catch (err) {
            console.error("Error loading staff:", err);
        } finally {
            setIsLoading(false);
        }
    };

    // Open modal for new staff
    const openNewModal = () => {
        setEditingStaff(null);
        setFormData({
            name: "",
            email: "",
            phone: "",
            password: "",
            role: "staff",
            permissions: getDefaultPermissionsForRole("staff")
        });
        setShowModal(true);
        setError(null);
    };

    // Open modal for editing
    const openEditModal = (member: StaffMember) => {
        setEditingStaff(member);
        setFormData({
            name: member.name,
            email: member.email,
            phone: member.phone || "",
            password: "",
            role: member.role,
            permissions: member.permissions
        });
        setShowModal(true);
        setError(null);
    };

    // Handle role change
    const handleRoleChange = (role: StaffRole) => {
        setFormData(prev => ({
            ...prev,
            role,
            permissions: role === "owner" ? [] : getDefaultPermissionsForRole(role)
        }));
    };

    // Toggle permission
    const togglePermission = (permId: string) => {
        setFormData(prev => ({
            ...prev,
            permissions: prev.permissions.includes(permId)
                ? prev.permissions.filter(p => p !== permId)
                : [...prev.permissions, permId]
        }));
    };

    // Save staff
    const handleSave = async () => {
        if (!session?.businessId) return;

        // Validation
        if (!formData.name.trim()) {
            setError("İsim zorunludur");
            return;
        }
        if (!formData.email.trim()) {
            setError("Email zorunludur");
            return;
        }
        if (!editingStaff && !formData.password) {
            setError("Şifre zorunludur");
            return;
        }

        setSaving(true);
        setError(null);

        try {
            const url = editingStaff
                ? `/api/panel/staff/${editingStaff.id}`
                : "/api/panel/staff";

            const method = editingStaff ? "PUT" : "POST";

            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    businessId: session.businessId,
                    ...formData,
                    // Only include password if provided
                    password: formData.password || undefined
                })
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || "Bir hata oluştu");
                return;
            }

            setShowModal(false);
            loadStaff();
        } catch (err) {
            console.error("Error saving staff:", err);
            setError("Bir hata oluştu");
        } finally {
            setSaving(false);
        }
    };

    // Delete staff
    const handleDelete = async (staffId: string) => {
        if (!session?.businessId) return;

        try {
            const response = await fetch(`/api/panel/staff/${staffId}`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ businessId: session.businessId })
            });

            if (response.ok) {
                setDeleteConfirm(null);
                loadStaff();
            }
        } catch (err) {
            console.error("Error deleting staff:", err);
        }
    };

    // Get available modules for this business
    const availableModules = getAvailableModules(session?.enabledModules || []);

    // Loading state
    if (sessionLoading || isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg flex-shrink-0">
                        <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Ekip Yönetimi</h1>
                        <p className="text-xs sm:text-sm text-gray-500">Personel ekle ve yönet</p>
                    </div>
                </div>
                <button
                    onClick={openNewModal}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium transition-colors shadow-lg shadow-emerald-500/25 whitespace-nowrap text-sm sm:text-base"
                >
                    <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>Yeni Üye</span>
                </button>
            </div>

            {/* Staff List */}
            {staff.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-8 sm:p-12 text-center">
                    <Users className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-2">Henüz ekip üyesi yok</h3>
                    <p className="text-sm text-gray-500 mb-6">Personelinizi ekleyerek yetkilendirin</p>
                    <button
                        onClick={openNewModal}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium transition-colors text-sm"
                    >
                        <Plus className="w-4 h-4" />
                        İlk Üyeyi Ekle
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {staff.map((member) => {
                        const roleConfig = ROLE_CONFIG[member.role];
                        const RoleIcon = roleConfig.icon;

                        return (
                            <div key={member.id} className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition-shadow">
                                <div className="flex items-start gap-3">
                                    {/* Avatar */}
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-600 font-bold flex-shrink-0">
                                        {member.name.substring(0, 2).toUpperCase()}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="font-medium text-gray-900 truncate">{member.name}</p>
                                            <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md ${roleConfig.color} bg-opacity-10`}>
                                                <RoleIcon className="w-3 h-3" />
                                                <span className="text-xs font-medium">{roleConfig.label}</span>
                                            </div>
                                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${member.is_active
                                                ? "bg-green-100 text-green-700"
                                                : "bg-red-100 text-red-700"
                                                }`}>
                                                <span className={`w-1 h-1 rounded-full ${member.is_active ? "bg-green-500" : "bg-red-500"}`} />
                                                {member.is_active ? "Aktif" : "Pasif"}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                                            <Mail className="w-3 h-3 flex-shrink-0" />
                                            <span className="truncate">{member.email}</span>
                                        </div>
                                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                                            <span>
                                                {member.role === "owner" ? "Tüm yetkiler" : `${member.permissions.length} yetki`}
                                            </span>
                                            <span>•</span>
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {member.last_login
                                                    ? new Date(member.last_login).toLocaleDateString("tr-TR")
                                                    : "Hiç giriş yapmadı"}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                        <button
                                            onClick={() => openEditModal(member)}
                                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                            title="Düzenle"
                                        >
                                            <Edit2 className="w-4 h-4 text-gray-500" />
                                        </button>
                                        {member.role !== "owner" && (
                                            <button
                                                onClick={() => setDeleteConfirm(member.id)}
                                                className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Sil"
                                            >
                                                <Trash2 className="w-4 h-4 text-red-500" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {deleteConfirm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
                        onClick={() => setDeleteConfirm(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl"
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                                    <AlertCircle className="w-5 h-5 text-red-500" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900">Üyeyi Sil</h3>
                            </div>
                            <p className="text-gray-600 mb-6">Bu ekip üyesini silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.</p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setDeleteConfirm(null)}
                                    className="flex-1 py-2.5 px-4 border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                    İptal
                                </button>
                                <button
                                    onClick={() => handleDelete(deleteConfirm)}
                                    className="flex-1 py-2.5 px-4 bg-red-500 hover:bg-red-600 rounded-xl font-medium text-white transition-colors"
                                >
                                    Sil
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Add/Edit Modal */}
            <AnimatePresence>
                {showModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
                        onClick={() => setShowModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
                        >
                            {/* Header */}
                            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
                                <h2 className="text-xl font-bold text-gray-900">
                                    {editingStaff ? "Üyeyi Düzenle" : "Yeni Ekip Üyesi"}
                                </h2>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5 text-gray-500" />
                                </button>
                            </div>

                            {/* Form */}
                            <div className="p-6 space-y-6">
                                {/* Error */}
                                {error && (
                                    <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3">
                                        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                                        <p className="text-sm text-red-700">{error}</p>
                                    </div>
                                )}

                                {/* Basic Info */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Ad Soyad *</label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900 placeholder:text-gray-500"
                                            placeholder="Ahmet Yılmaz"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                                        <div className="relative">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                            <input
                                                type="email"
                                                value={formData.email}
                                                onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                                className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900 placeholder:text-gray-500"
                                                placeholder="ornek@email.com"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Telefon</label>
                                        <div className="relative">
                                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                            <input
                                                type="tel"
                                                value={formData.phone}
                                                onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                                className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900 placeholder:text-gray-500"
                                                placeholder="05xx xxx xx xx"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Şifre {editingStaff && <span className="text-gray-400">(Değiştirmek için doldurun)</span>}
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                value={formData.password}
                                                onChange={e => setFormData(prev => ({ ...prev, password: e.target.value }))}
                                                className="w-full px-4 py-3 pr-11 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900 placeholder:text-gray-500"
                                                placeholder="••••••••"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                            >
                                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Role Selection */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-3">Rol</label>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                                        {(Object.entries(ROLE_CONFIG) as [StaffRole, typeof ROLE_CONFIG.owner][])
                                            .filter(([role]) => role !== "owner" || editingStaff?.role === "owner")
                                            .map(([role, config]) => {
                                                const Icon = config.icon;
                                                return (
                                                    <button
                                                        key={role}
                                                        type="button"
                                                        onClick={() => handleRoleChange(role)}
                                                        disabled={role === "owner"}
                                                        className={`p-4 rounded-xl border-2 transition-all ${formData.role === role
                                                            ? "border-emerald-500 bg-emerald-50"
                                                            : "border-gray-200 hover:border-gray-300"
                                                            } ${role === "owner" ? "opacity-50 cursor-not-allowed" : ""}`}
                                                    >
                                                        <Icon className={`w-6 h-6 ${config.color} mb-2`} />
                                                        <p className="font-medium text-gray-900">{config.label}</p>
                                                    </button>
                                                );
                                            })}
                                    </div>
                                </div>

                                {/* Permissions */}
                                {formData.role !== "owner" && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-3">İzinler</label>
                                        <div className="space-y-4">
                                            {availableModules.map(module => (
                                                <div key={module.id} className="border border-gray-200 rounded-xl overflow-hidden">
                                                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                                                        <h4 className="font-medium text-gray-900">{module.name}</h4>
                                                    </div>
                                                    <div className="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                                                        {module.permissions.map(perm => {
                                                            const isChecked = formData.permissions.includes(perm.id);
                                                            const isDisabled = perm.minRole === "owner" ||
                                                                (perm.minRole === "manager" && formData.role === "staff");

                                                            return (
                                                                <label
                                                                    key={perm.id}
                                                                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${isDisabled
                                                                        ? "opacity-50 cursor-not-allowed bg-gray-50"
                                                                        : isChecked
                                                                            ? "bg-emerald-50"
                                                                            : "hover:bg-gray-50"
                                                                        }`}
                                                                >
                                                                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${isChecked
                                                                        ? "bg-emerald-500 border-emerald-500"
                                                                        : "border-gray-300"
                                                                        }`}>
                                                                        {isChecked && <Check className="w-3 h-3 text-white" />}
                                                                    </div>
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={isChecked}
                                                                        onChange={() => !isDisabled && togglePermission(perm.id)}
                                                                        disabled={isDisabled}
                                                                        className="sr-only"
                                                                    />
                                                                    <div>
                                                                        <p className="text-sm font-medium text-gray-900">{perm.label}</p>
                                                                        {perm.description && (
                                                                            <p className="text-xs text-gray-500">{perm.description}</p>
                                                                        )}
                                                                    </div>
                                                                </label>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex gap-3">
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 py-3 px-4 border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                    İptal
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="flex-1 py-3 px-4 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 rounded-xl font-medium text-white transition-colors flex items-center justify-center gap-2"
                                >
                                    {saving ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Kaydediliyor...
                                        </>
                                    ) : (
                                        <>
                                            <Check className="w-4 h-4" />
                                            Kaydet
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
