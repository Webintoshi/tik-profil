"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
    Search, Filter, ExternalLink, Trash2, Clock, Edit2,
    Settings, X, Check, Loader2, LogIn, Pause, Play, AlertTriangle,
    Calendar, Timer
} from "lucide-react";
import type { Business } from "@/types";
import Link from "next/link";
import { deleteBusiness, updateBusiness } from "@/lib/businessStore";
import { useState } from "react";
import { TimeManagerDrawer } from "./TimeManagerDrawer";
import { getSubscriptionInfo } from "@/lib/services/subscriptionService";
import { MODULE_REGISTRY } from "@/lib/ModuleRegistry";
import { writeLog } from "@/lib/systemLogs";
import clsx from "clsx";
import { toast } from "sonner";

interface BusinessTableProps {
    businesses: Business[];
    onDelete?: (id: string) => void;
    onUpdate?: (business: Business) => void;
}

const packageColors = {
    starter: "from-gray-400 to-gray-500",
    pro: "from-blue-400 to-cyan-400",
    ultimate: "from-purple-400 to-pink-400",
};

const packageNames = {
    starter: "Başlangıç",
    pro: "Premium",
    ultimate: "Kurumsal",
};

const statusNames: Record<string, string> = {
    active: "Aktif",
    pending: "Beklemede",
    inactive: "Pasif",
    expired: "Süresi Doldu",
    frozen: "Donduruldu",
};

// Date Formatter
function formatDate(date: Date | null | undefined): string {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// Simple Card Component - No animations for performance
const SimpleCard = ({ children, className = "" }: {
    children: React.ReactNode,
    className?: string
}) => (
    <div
        className={`
            relative overflow-hidden rounded-2xl
            bg-gradient-to-br from-[#1a1a2e]/90 via-[#16162a]/90 to-[#0f0f1a]/90
            border border-white/[0.08]
            ${className}
        `}
        style={{
            boxShadow: `
                0 0 0 1px rgba(255,255,255,0.03),
                0 10px 40px -10px rgba(0,0,0,0.4),
                inset 0 1px 1px rgba(255,255,255,0.05)
            `
        }}
    >
        <div className="relative z-10">{children}</div>
    </div>
);

// Status Badge with Metallic Style
function MetallicStatusBadge({ status, isFrozen }: { status: string; isFrozen: boolean }) {
    const colors: Record<string, { bg: string; text: string; glow: string }> = {
        active: { bg: 'from-emerald-500/25 to-green-500/15', text: 'text-emerald-400', glow: 'rgba(16,185,129,0.3)' },
        pending: { bg: 'from-amber-500/25 to-yellow-500/15', text: 'text-amber-400', glow: 'rgba(245,158,11,0.3)' },
        inactive: { bg: 'from-gray-500/25 to-gray-400/15', text: 'text-gray-400', glow: 'rgba(156,163,175,0.2)' },
        expired: { bg: 'from-red-500/25 to-rose-500/15', text: 'text-red-400', glow: 'rgba(239,68,68,0.3)' },
        frozen: { bg: 'from-blue-500/25 to-cyan-500/15', text: 'text-blue-400', glow: 'rgba(59,130,246,0.3)' },
    };

    const effectiveStatus = isFrozen ? 'frozen' : status;
    const color = colors[effectiveStatus] || colors.active;

    return (
        <span
            className={`px-3 py-1.5 rounded-lg text-xs font-bold ${color.text} bg-gradient-to-r ${color.bg}`}
            style={{
                boxShadow: `0 0 15px ${color.glow}, inset 0 0 0 1px ${color.glow}`
            }}
        >
            {isFrozen ? "❄️ Donduruldu" : statusNames[status]}
        </span>
    );
}

export function BusinessTable({ businesses, onDelete, onUpdate }: BusinessTableProps) {
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [freezingId, setFreezingId] = useState<string | null>(null);
    const [timeManagerBusiness, setTimeManagerBusiness] = useState<Business | null>(null);
    const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);
    const [deleteModal, setDeleteModal] = useState<{ business: Business; password: string } | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    // Filter businesses
    const filteredBusinesses = businesses.filter(b =>
        b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Handle Freeze/Unfreeze
    const handleFreeze = async (business: Business) => {
        setFreezingId(business.id);
        try {
            const subInfo = getSubscriptionInfo(business.subscriptionEndDate, business.subscriptionStatus);

            if (business.isFrozen) {
                const newEndDate = new Date();
                newEndDate.setDate(newEndDate.getDate() + (business.frozenRemainingDays || 0));

                await updateBusiness(business.id, {
                    isFrozen: false,
                    status: "active",
                    frozenAt: null,
                    subscriptionEndDate: newEndDate,
                    frozenRemainingDays: null,
                });
                toast.success("İşletme aktif edildi");
                writeLog("business_unfrozen", "webintosh", `"${business.name}" aktifleştirildi`, "success");
            } else {
                await updateBusiness(business.id, {
                    isFrozen: true,
                    status: "frozen",
                    frozenAt: new Date(),
                    frozenRemainingDays: subInfo.daysRemaining > 0 ? subInfo.daysRemaining : 0,
                });
                toast.success("İşletme donduruldu");
                writeLog("business_frozen", "webintosh", `"${business.name}" donduruldu`, "warning");
            }
        } catch (error) {
            console.error("Freeze error:", error);
            toast.error("İşlem başarısız");
        } finally {
            setFreezingId(null);
        }
    };

    // Handle Delete with Password
    const handleDeleteConfirm = async () => {
        if (!deleteModal) return;

        if (deleteModal.password !== process.env.NEXT_PUBLIC_ADMIN_DELETE_PASSWORD) {
            toast.error("Yanlış şifre!");
            return;
        }

        setDeletingId(deleteModal.business.id);
        try {
            const { getCollectionREST, deleteDocumentREST } = await import("@/lib/documentStore");

            const owners = await getCollectionREST("business_owners");
            const businessOwners = owners.filter(o => o.business_id === deleteModal.business.id);

            for (const owner of businessOwners) {
                if (owner.id) {
                    await deleteDocumentREST("business_owners", owner.id as string);
                }
            }

            await deleteBusiness(deleteModal.business.id);

            try {
                await fetch("/api/auth/force-logout", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ businessId: deleteModal.business.id }),
                });
            } catch (e) {
            }

            onDelete?.(deleteModal.business.id);
            toast.success("İşletme ve sahip bilgileri silindi");
            writeLog("business_deleted", "webintosh", `"${deleteModal.business.name}" silindi`, "warning");
            setDeleteModal(null);
        } catch (error) {
            console.error("Delete error:", error);
            toast.error("Silme hatası");
        } finally {
            setDeletingId(null);
        }
    };

    const handleImpersonate = (business: Business) => {
        document.cookie = `tikprofil_impersonate=${business.id}; path=/; max-age=3600`;
        window.open(`/panel`, "_blank");
    };

    return (
        <div className="space-y-4">
            {/* Search Bar with Liquid Metal Effect */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative flex-1 group"
                >
                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 rounded-2xl blur-lg opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
                    <div
                        className="relative flex items-center"
                        style={{
                            background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
                            borderRadius: '0.875rem',
                            boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.08), 0 4px 20px rgba(0,0,0,0.2)'
                        }}
                    >
                        <Search className="absolute left-4 h-4 w-4 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
                        <input
                            type="text"
                            placeholder="İşletme ara..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-transparent pl-11 pr-4 py-3 focus:outline-none placeholder:text-gray-600 text-gray-200"
                        />
                    </div>
                </motion.div>
                <motion.button
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium text-gray-300 hover:text-white transition-colors sm:w-auto"
                    style={{
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%)',
                        boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.05)'
                    }}
                >
                    <Filter className="h-4 w-4" />
                    Filtrele
                </motion.button>
            </div>

            {/* Business Cards */}
            <div className="grid grid-cols-1 gap-4">
                {filteredBusinesses.length === 0 ? (
                    <SimpleCard className="text-center py-12">
                        <p className="text-gray-500">Henüz işletme bulunmuyor.</p>
                    </SimpleCard>
                ) : (
                    filteredBusinesses.map((business, index) => {
                        const subInfo = getSubscriptionInfo(business.subscriptionEndDate, business.subscriptionStatus);
                        const isFrozen = business.isFrozen || business.status === "frozen";

                        return (
                            <SimpleCard key={business.id} className="p-5">
                                {/* Header Row */}
                                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                                    {/* Avatar + Name */}
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <div
                                            className={clsx(
                                                "flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl font-bold text-lg",
                                                isFrozen ? "text-blue-400" : "text-white"
                                            )}
                                            style={{
                                                background: isFrozen
                                                    ? 'linear-gradient(135deg, rgba(59,130,246,0.3) 0%, rgba(6,182,212,0.2) 100%)'
                                                    : `linear-gradient(135deg, ${packageColors[business.package]?.split(' ')[0].replace('from-', 'rgba(').replace('-', ',').replace(/(\d+)/g, '$1,0.4)')} 0%, ${packageColors[business.package]?.split(' ')[1]?.replace('to-', 'rgba(').replace('-', ',').replace(/(\d+)/g, '$1,0.3)')} 100%)`,
                                                boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.15), 0 4px 12px rgba(0,0,0,0.2)'
                                            }}
                                        >
                                            {business.name.charAt(0)}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p
                                                className="font-bold truncate text-base sm:text-lg"
                                                style={{
                                                    background: 'linear-gradient(180deg, #ffffff 0%, #c0c0c0 100%)',
                                                    backgroundClip: 'text',
                                                    WebkitBackgroundClip: 'text',
                                                    WebkitTextFillColor: 'transparent',
                                                }}
                                            >
                                                {business.name}
                                            </p>
                                            <p className="text-sm text-gray-500 truncate">{business.email}</p>
                                        </div>
                                    </div>

                                    {/* Status Badge */}
                                    <MetallicStatusBadge status={business.status} isFrozen={isFrozen} />
                                </div>

                                {/* Date Info Row */}
                                <div
                                    className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-xl"
                                    style={{
                                        background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
                                        boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.03)'
                                    }}
                                >
                                    <div className="text-center sm:text-left">
                                        <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Başlangıç</p>
                                        <p className="text-sm font-medium text-gray-300 flex items-center gap-1 justify-center sm:justify-start">
                                            <Calendar className="h-3.5 w-3.5 text-gray-500" />
                                            {formatDate(business.subscriptionStartDate || business.createdAt)}
                                        </p>
                                    </div>
                                    <div className="text-center sm:text-left">
                                        <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Bitiş</p>
                                        <p className="text-sm font-medium text-gray-300 flex items-center gap-1 justify-center sm:justify-start">
                                            <Calendar className="h-3.5 w-3.5 text-gray-500" />
                                            {formatDate(business.subscriptionEndDate)}
                                        </p>
                                    </div>
                                    <div className="text-center sm:text-left">
                                        <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Kalan Süre</p>
                                        <p className={clsx(
                                            "text-sm font-bold flex items-center gap-1 justify-center sm:justify-start",
                                            isFrozen ? "text-blue-400" :
                                                subInfo.statusColor === "green" ? "text-emerald-400" :
                                                    subInfo.statusColor === "orange" ? "text-amber-400" :
                                                        subInfo.statusColor === "red" ? "text-red-400" : "text-gray-400"
                                        )}>
                                            <Timer className="h-3.5 w-3.5" />
                                            {isFrozen
                                                ? `${business.frozenRemainingDays || 0} gün (donduruldu)`
                                                : subInfo.statusLabel
                                            }
                                        </p>
                                    </div>
                                    <div className="text-center sm:text-left">
                                        <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Paket</p>
                                        <p
                                            className="text-sm font-bold"
                                            style={{
                                                background: `linear-gradient(135deg, ${business.package === 'starter' ? '#9ca3af, #6b7280' : business.package === 'pro' ? '#60a5fa, #22d3ee' : '#c084fc, #f472b6'})`,
                                                backgroundClip: 'text',
                                                WebkitBackgroundClip: 'text',
                                                WebkitTextFillColor: 'transparent',
                                            }}
                                        >
                                            {packageNames[business.package]}
                                        </p>
                                    </div>
                                </div>

                                {/* Action Buttons Row */}
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {/* Edit */}
                                    <ActionButton
                                        onClick={() => setEditingBusiness(business)}
                                        color="blue"
                                        icon={<Edit2 className="h-4 w-4" />}
                                        label="Düzenle"
                                    />

                                    {/* Panel */}
                                    <ActionButton
                                        onClick={() => handleImpersonate(business)}
                                        color="purple"
                                        icon={<LogIn className="h-4 w-4" />}
                                        label="Panel"
                                    />

                                    {/* Time Manager */}
                                    <ActionButton
                                        onClick={() => setTimeManagerBusiness(business)}
                                        color="emerald"
                                        icon={<Clock className="h-4 w-4" />}
                                        label="Süre"
                                    />

                                    {/* Public Profile */}
                                    <Link
                                        href={`/${business.slug}`}
                                        target="_blank"
                                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all text-gray-400 hover:text-white"
                                        style={{
                                            background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
                                            boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.03)'
                                        }}
                                    >
                                        <ExternalLink className="h-4 w-4" />
                                        <span className="hidden sm:inline">Profil</span>
                                    </Link>

                                    {/* Spacer */}
                                    <div className="flex-1" />

                                    {/* Freeze/Unfreeze */}
                                    <ActionButton
                                        onClick={() => handleFreeze(business)}
                                        disabled={freezingId === business.id}
                                        color={isFrozen ? "emerald" : "cyan"}
                                        icon={freezingId === business.id
                                            ? <Loader2 className="h-4 w-4 animate-spin" />
                                            : isFrozen ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />
                                        }
                                        label={isFrozen ? "Aktifleştir" : "Dondur"}
                                    />

                                    {/* Delete */}
                                    <ActionButton
                                        onClick={() => setDeleteModal({ business, password: "" })}
                                        color="red"
                                        icon={<Trash2 className="h-4 w-4" />}
                                        label="Sil"
                                    />
                                </div>
                            </SimpleCard>
                        );
                    })
                )}
            </div>

            {/* Time Manager Drawer */}
            {timeManagerBusiness && (
                <TimeManagerDrawer
                    isOpen={!!timeManagerBusiness}
                    onClose={() => setTimeManagerBusiness(null)}
                    business={{
                        id: timeManagerBusiness.id,
                        name: timeManagerBusiness.name,
                        subscriptionEndDate: timeManagerBusiness.subscriptionEndDate,
                        subscriptionStatus: timeManagerBusiness.subscriptionStatus || "active"
                    }}
                    onUpdate={() => setTimeManagerBusiness(null)}
                />
            )}

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {deleteModal && (
                    <SimpleModal onClose={() => setDeleteModal(null)}>
                        <div className="flex items-center gap-3 mb-4">
                            <div
                                className="h-12 w-12 rounded-xl flex items-center justify-center"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(239,68,68,0.25) 0%, rgba(220,38,38,0.15) 100%)',
                                    boxShadow: '0 4px 20px rgba(239,68,68,0.2), inset 0 0 0 1px rgba(239,68,68,0.2)'
                                }}
                            >
                                <AlertTriangle className="h-6 w-6 text-red-400" />
                            </div>
                            <div>
                                <h3
                                    className="text-lg font-bold"
                                    style={{
                                        background: 'linear-gradient(180deg, #ffffff 0%, #a0a0a0 100%)',
                                        backgroundClip: 'text',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                    }}
                                >
                                    İşletmeyi Sil
                                </h3>
                                <p className="text-sm text-gray-500">{deleteModal.business.name}</p>
                            </div>
                        </div>

                        <div
                            className="rounded-xl p-4 mb-4"
                            style={{
                                background: 'linear-gradient(135deg, rgba(239,68,68,0.15) 0%, rgba(220,38,38,0.08) 100%)',
                                boxShadow: 'inset 0 0 0 1px rgba(239,68,68,0.2)'
                            }}
                        >
                            <p className="text-red-400 text-sm">
                                ⚠️ Bu işlem geri alınamaz! İşletmeye ait tüm veriler kalıcı olarak silinecektir.
                            </p>
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                                Süper Admin Şifresi
                            </label>
                            <input
                                type="password"
                                value={deleteModal.password}
                                onChange={(e) => setDeleteModal({ ...deleteModal, password: e.target.value })}
                                placeholder="Şifrenizi girin"
                                className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-gray-200 focus:outline-none focus:border-red-500/50 placeholder:text-gray-600"
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteModal(null)}
                                className="flex-1 px-4 py-3 rounded-xl font-medium text-gray-300 hover:text-white transition-colors"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%)',
                                    boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.05)'
                                }}
                            >
                                İptal
                            </button>
                            <button
                                onClick={handleDeleteConfirm}
                                disabled={!deleteModal.password || deletingId === deleteModal.business.id}
                                className="flex-1 px-4 py-3 rounded-xl font-medium text-white disabled:opacity-50 flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                                style={{
                                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                    boxShadow: '0 4px 15px rgba(239,68,68,0.4), inset 0 1px 1px rgba(255,255,255,0.1)'
                                }}
                            >
                                {deletingId === deleteModal.business.id ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                    <Trash2 className="h-5 w-5" />
                                )}
                                Kalıcı Olarak Sil
                            </button>
                        </div>
                    </SimpleModal>
                )}
            </AnimatePresence>

            {/* Edit Business Modal */}
            <AnimatePresence>
                {editingBusiness && (
                    <BusinessEditModal
                        business={editingBusiness}
                        onClose={() => setEditingBusiness(null)}
                        onSave={async (updates) => {
                            await updateBusiness(editingBusiness.id, updates);
                            onUpdate?.({ ...editingBusiness, ...updates });
                            setEditingBusiness(null);
                            toast.success("İşletme güncellendi");
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

// Action Button Component
function ActionButton({
    onClick,
    icon,
    label,
    color,
    disabled = false
}: {
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
    color: 'blue' | 'purple' | 'emerald' | 'red' | 'cyan';
    disabled?: boolean;
}) {
    const colors = {
        blue: { bg: 'from-blue-500/20 to-blue-500/10', text: 'text-blue-400', glow: 'rgba(59,130,246,0.2)' },
        purple: { bg: 'from-purple-500/20 to-purple-500/10', text: 'text-purple-400', glow: 'rgba(168,85,247,0.2)' },
        emerald: { bg: 'from-emerald-500/20 to-emerald-500/10', text: 'text-emerald-400', glow: 'rgba(16,185,129,0.2)' },
        red: { bg: 'from-red-500/20 to-red-500/10', text: 'text-red-400', glow: 'rgba(239,68,68,0.2)' },
        cyan: { bg: 'from-cyan-500/20 to-cyan-500/10', text: 'text-cyan-400', glow: 'rgba(6,182,212,0.2)' },
    };

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 bg-gradient-to-r ${colors[color].bg} ${colors[color].text}`}
            style={{ boxShadow: `0 4px 12px ${colors[color].glow}` }}
        >
            {icon}
            <span className="hidden sm:inline">{label}</span>
        </button>
    );
}

// Simple Modal Wrapper - No heavy animations
function SimpleModal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
    return (
        <>
            <div
                onClick={onClose}
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div
                    className="w-full max-w-md p-6 rounded-2xl border border-white/[0.08]"
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        background: 'linear-gradient(135deg, rgba(20,20,25,0.98) 0%, rgba(15,15,20,0.98) 100%)',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.05)'
                    }}
                >
                    {children}
                </div>
            </div>
        </>
    );
}

// Business Edit Modal Component
function BusinessEditModal({
    business,
    onClose,
    onSave
}: {
    business: Business;
    onClose: () => void;
    onSave: (updates: Partial<Business>) => Promise<void>;
}) {
    const [name, setName] = useState(business.name);
    const [email, setEmail] = useState(business.email);
    const [owner, setOwner] = useState(business.owner);
    const [slug, setSlug] = useState(business.slug || '');
    const [slugError, setSlugError] = useState('');
    const [checkingSlug, setCheckingSlug] = useState(false);
    const [status, setStatus] = useState(business.status);
    const [selectedModules, setSelectedModules] = useState<string[]>(business.modules || []);
    const [isLoading, setIsLoading] = useState(false);

    // Normalize slug during typing: allows trailing hyphen for better UX
    const normalizeSlug = (value: string) => {
        return value
            .toLowerCase()
            .replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u')
            .replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/ı/g, 'i')
            .replace(/İ/g, 'i').replace(/Ş/g, 's').replace(/Ğ/g, 'g')
            .replace(/Ü/g, 'u').replace(/Ö/g, 'o').replace(/Ç/g, 'c')
            .replace(/\s+/g, '-')           // Spaces to hyphens
            .replace(/[^a-z0-9-]/g, '')     // Remove other invalid chars
            .replace(/-+/g, '-')            // Multiple hyphens to single
            .replace(/^-/, '');             // Only remove LEADING hyphen, NOT trailing
    };

    // Clean slug for saving: removes trailing hyphens
    const cleanSlugForSave = (value: string) => {
        return value.replace(/-$/g, '');    // Remove trailing hyphen only on save
    };

    const handleSlugChange = async (value: string) => {
        const normalized = normalizeSlug(value);
        setSlug(normalized);
        setSlugError('');

        // Check uniqueness with cleaned slug
        const cleanedSlug = cleanSlugForSave(normalized);
        if (cleanedSlug && cleanedSlug !== business.slug) {
            setCheckingSlug(true);
            try {
                const { getCollectionREST } = await import('@/lib/documentStore');
                const businesses = await getCollectionREST('businesses');
                const exists = businesses.some((b: any) => b.slug === cleanedSlug && b.id !== business.id);
                if (exists) {
                    setSlugError('Bu URL zaten kullanılıyor');
                }
            } catch (error) {
                console.error('Slug check error:', error);
            }
            setCheckingSlug(false);
        }
    };

    const toggleModule = (moduleId: string) => {
        setSelectedModules(prev =>
            prev.includes(moduleId)
                ? prev.filter(id => id !== moduleId)
                : [...prev, moduleId]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const cleanedSlug = cleanSlugForSave(slug);

            // Build update object
            const updates: Record<string, any> = {
                name,
                email,
                owner,
                slug: cleanedSlug,
                status,
                modules: selectedModules,
            };

            // If slug changed, add old slug to previousSlugs for 301 redirects
            if (cleanedSlug !== business.slug) {
                const existingPreviousSlugs = business.previousSlugs || [];
                // Add old slug if not already in the list
                if (!existingPreviousSlugs.includes(business.slug)) {
                    updates.previousSlugs = [...existingPreviousSlugs, business.slug];
                }
            }

            await onSave(updates);
        } catch (error) {
            console.error("Update error:", error);
            toast.error("Güncelleme hatası");
        }
        setIsLoading(false);
    };

    return (
        <>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md"
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none overflow-y-auto"
            >
                <div
                    onClick={(e) => e.stopPropagation()}
                    className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-white/[0.08] pointer-events-auto"
                    style={{
                        background: 'linear-gradient(135deg, rgba(20,20,25,0.98) 0%, rgba(15,15,20,0.98) 100%)',
                        backdropFilter: 'blur(40px)',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.05)'
                    }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-5 border-b border-white/[0.06] sticky top-0 z-10" style={{ background: 'rgba(15,15,20,0.95)' }}>
                        <div className="flex items-center gap-3">
                            <div
                                className="h-10 w-10 rounded-xl flex items-center justify-center"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(59,130,246,0.25) 0%, rgba(139,92,246,0.15) 100%)',
                                    boxShadow: '0 4px 12px rgba(59,130,246,0.2)'
                                }}
                            >
                                <Settings className="h-5 w-5 text-blue-400" />
                            </div>
                            <h2
                                className="text-lg font-bold"
                                style={{
                                    background: 'linear-gradient(180deg, #ffffff 0%, #a0a0a0 100%)',
                                    backgroundClip: 'text',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                }}
                            >
                                Düzenle
                            </h2>
                        </div>
                        <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/[0.05] transition-colors">
                            <X className="h-5 w-5 text-gray-400" />
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="p-5 space-y-4">
                        <FormInput label="İşletme Adı" value={name} onChange={setName} required />
                        <FormInput label="E-posta" value={email} onChange={setEmail} type="email" required />
                        <FormInput label="Sahip" value={owner} onChange={setOwner} />

                        {/* Slug Field */}
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                                Profil Linki (Slug)
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                                    tikprofil.com/
                                </span>
                                <input
                                    type="text"
                                    value={slug}
                                    onChange={(e) => handleSlugChange(e.target.value)}
                                    placeholder="isletme-adi"
                                    className={clsx(
                                        "w-full pl-28 pr-10 py-3 rounded-xl bg-white/[0.03] border text-gray-200 focus:outline-none placeholder:text-gray-600 font-mono text-sm",
                                        slugError ? "border-red-500/50" : "border-white/[0.08] focus:border-blue-500/50"
                                    )}
                                />
                                {checkingSlug && (
                                    <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-500" />
                                )}
                                {!checkingSlug && slug && !slugError && (
                                    <Check className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-400" />
                                )}
                            </div>
                            {slugError && (
                                <p className="mt-1 text-xs text-red-400">{slugError}</p>
                            )}
                            {slug && !slugError && (
                                <p className="mt-1 text-xs text-gray-500">
                                    Yeni link: <span className="text-blue-400">tikprofil.com/{slug}</span>
                                </p>
                            )}
                        </div>

                        {/* Status */}
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Durum</label>
                            <div className="flex flex-wrap gap-2">
                                {(["active", "pending", "inactive", "expired"] as const).map((s) => (
                                    <button
                                        key={s}
                                        type="button"
                                        onClick={() => setStatus(s)}
                                        className={clsx(
                                            "px-3 py-2 rounded-lg transition-all font-medium text-sm",
                                            status === s
                                                ? "text-white"
                                                : "text-gray-400 hover:text-gray-200"
                                        )}
                                        style={status === s ? {
                                            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                                            boxShadow: '0 4px 15px rgba(59,130,246,0.3)'
                                        } : {
                                            background: 'rgba(255,255,255,0.05)'
                                        }}
                                    >
                                        {statusNames[s]}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Module Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                                Modüller ({selectedModules.length})
                            </label>
                            <div
                                className="max-h-40 overflow-y-auto rounded-xl p-2 space-y-1"
                                style={{
                                    background: 'rgba(255,255,255,0.03)',
                                    boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.02)'
                                }}
                            >
                                {MODULE_REGISTRY.slice(0, 10).map((mod) => (
                                    <label
                                        key={mod.id}
                                        className={clsx(
                                            "flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors text-sm",
                                            selectedModules.includes(mod.id)
                                                ? "bg-blue-500/15 text-blue-400"
                                                : "hover:bg-white/[0.03] text-gray-400"
                                        )}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedModules.includes(mod.id)}
                                            onChange={() => toggleModule(mod.id)}
                                            className="w-4 h-4 rounded"
                                        />
                                        {mod.label}
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-4 py-3 rounded-xl font-medium text-gray-300 hover:text-white transition-colors"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%)',
                                    boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.05)'
                                }}
                            >
                                İptal
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading || !name || !email || !slug || !!slugError || checkingSlug}
                                className="flex-1 px-4 py-3 rounded-xl font-medium text-white disabled:opacity-50 flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                                style={{
                                    background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                                    boxShadow: '0 4px 15px rgba(59,130,246,0.4), inset 0 1px 1px rgba(255,255,255,0.1)'
                                }}
                            >
                                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
                                Kaydet
                            </button>
                        </div>
                    </form>
                </div>
            </motion.div>
        </>
    );
}

// Form Input Component
function FormInput({
    label,
    value,
    onChange,
    type = "text",
    required = false
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    type?: string;
    required?: boolean;
}) {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">{label}</label>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                required={required}
                className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-gray-200 focus:outline-none focus:border-blue-500/50 placeholder:text-gray-600"
            />
        </div>
    );
}
