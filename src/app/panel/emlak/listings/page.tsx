"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Plus,
    Search,
    Edit3,
    Trash2,
    Loader2,
    Image as ImageIcon,
    MapPin,
    Home,
    Building2,
    Trees,
    Filter,
    Eye,
    EyeOff
} from "lucide-react";
import clsx from "clsx";
import { toast } from "sonner";
import { useTheme } from "@/components/panel/ThemeProvider";
import Link from "next/link";
import Image from "next/image";
import {
    Listing,
    Consultant,
    PROPERTY_TYPE_LABELS,
    STATUS_LABELS,
    formatPrice,
    getPropertyBadgeColor
} from "@/types/emlak";

export default function EmlakListingsPage() {
    const { isDark } = useTheme();
    const [loading, setLoading] = useState(true);
    const [listings, setListings] = useState<Listing[]>([]);
    const [consultants, setConsultants] = useState<Consultant[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterType, setFilterType] = useState<string>("all");
    const [filterStatus, setFilterStatus] = useState<string>("all");
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [listingsRes, consultantsRes] = await Promise.all([
                fetch('/api/emlak/listings'),
                fetch('/api/emlak/consultants')
            ]);

            const listingsData = await listingsRes.json();
            const consultantsData = await consultantsRes.json();

            if (listingsData.success) {
                setListings(listingsData.listings || []);
            }
            if (consultantsData.success) {
                setConsultants(consultantsData.consultants || []);
            }
        } catch (error) {
            console.error('Data loading error:', error);
            toast.error('Veriler yüklenirken hata oluştu');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            const res = await fetch(`/api/emlak/listings?id=${id}`, { method: 'DELETE' });
            const data = await res.json();

            if (data.success) {
                setListings(prev => prev.filter(l => l.id !== id));
                toast.success('İlan silindi');
            } else {
                toast.error(data.error || 'Silme başarısız');
            }
        } catch {
            toast.error('Silme sırasında hata oluştu');
        }
        setDeleteConfirm(null);
    };

    const toggleStatus = async (listing: Listing) => {
        const newStatus = listing.status === 'active' ? 'inactive' : 'active';
        try {
            const res = await fetch('/api/emlak/listings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: listing.id, status: newStatus }),
            });
            const data = await res.json();

            if (data.success) {
                setListings(prev => prev.map(l =>
                    l.id === listing.id ? { ...l, status: newStatus as Listing['status'], isActive: newStatus === 'active' } : l
                ));
                toast.success(newStatus === 'active' ? 'İlan aktifleştirildi' : 'İlan pasifleştirildi');
            }
        } catch {
            toast.error('Güncelleme başarısız');
        }
    };

    const getConsultantName = (consultantId?: string) => {
        if (!consultantId) return null;
        const consultant = consultants.find(c => c.id === consultantId);
        return consultant?.name || null;
    };

    const getPropertyIcon = (type: string) => {
        switch (type) {
            case 'residential': return Home;
            case 'commercial': return Building2;
            case 'land': return Trees;
            default: return Home;
        }
    };

    // Filter listings
    const filteredListings = listings.filter(listing => {
        const matchesSearch = listing.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            listing.location?.district?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = filterType === 'all' || listing.propertyType === filterType;
        const matchesStatus = filterStatus === 'all' || listing.status === filterStatus;
        return matchesSearch && matchesType && matchesStatus;
    });

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        İlanlar
                    </h1>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {filteredListings.length} ilan
                    </p>
                </div>
                <Link
                    href="/panel/emlak/listings/new"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white font-medium rounded-xl hover:shadow-lg transition-all"
                >
                    <Plus className="w-5 h-5" />
                    Yeni İlan
                </Link>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                {/* Search */}
                <div className={`relative flex-1 ${isDark ? 'bg-gray-800' : 'bg-white'} rounded-xl`}>
                    <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-400'}`} />
                    <input
                        type="text"
                        placeholder="İlan ara..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={`w-full pl-10 pr-4 py-3 rounded-xl border-0 focus:ring-2 focus:ring-purple-500 ${isDark ? 'bg-gray-800 text-white placeholder:text-gray-500' : 'bg-white text-gray-900'
                            }`}
                    />
                </div>

                {/* Property Type Filter */}
                <div className="flex gap-2">
                    {[
                        { value: 'all', label: 'Tümü', icon: Filter },
                        { value: 'residential', label: 'Konut', icon: Home },
                        { value: 'commercial', label: 'Ticari', icon: Building2 },
                        { value: 'land', label: 'Arsa', icon: Trees },
                    ].map((type) => (
                        <button
                            key={type.value}
                            onClick={() => setFilterType(type.value)}
                            className={clsx(
                                "px-4 py-2 rounded-xl font-medium text-sm flex items-center gap-2 transition-all",
                                filterType === type.value
                                    ? "bg-purple-600 text-white"
                                    : isDark ? "bg-gray-800 text-gray-300 hover:bg-gray-700" : "bg-white text-gray-600 hover:bg-gray-50"
                            )}
                        >
                            <type.icon className="w-4 h-4" />
                            <span className="hidden sm:inline">{type.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Listings Grid */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                </div>
            ) : filteredListings.length === 0 ? (
                <div className={`text-center py-20 rounded-2xl ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                    <div className="text-5xl mb-4">🏠</div>
                    <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {listings.length === 0 ? 'Henüz ilan yok' : 'Sonuç bulunamadı'}
                    </h3>
                    <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {listings.length === 0 ? 'İlk ilanınızı ekleyin' : 'Filtrelerinizi değiştirin'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    <AnimatePresence>
                        {filteredListings.map((listing, index) => {
                            const PropertyIcon = getPropertyIcon(listing.propertyType);
                            const mainImage = listing.images?.find(img => img.isMain) || listing.images?.[0];

                            return (
                                <motion.div
                                    key={listing.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ delay: index * 0.05 }}
                                    className={`relative rounded-2xl overflow-hidden ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm hover:shadow-lg transition-all group`}
                                >
                                    {/* Image */}
                                    <div className="relative h-40 bg-gray-200">
                                        {mainImage?.url ? (
                                            <Image
                                                src={mainImage.url}
                                                alt={listing.title}
                                                fill
                                                className="object-cover"

                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <ImageIcon className={`w-12 h-12 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
                                            </div>
                                        )}

                                        {/* Status Badge */}
                                        <div className={clsx(
                                            "absolute top-3 left-3 px-2 py-1 rounded-lg text-xs font-medium text-white",
                                            listing.status === 'active' ? 'bg-emerald-500' :
                                                listing.status === 'sold' ? 'bg-rose-500' : 'bg-gray-500'
                                        )}>
                                            {STATUS_LABELS[listing.status]}
                                        </div>

                                        {/* Property Type Badge */}
                                        <div className={clsx(
                                            "absolute top-3 right-3 px-2 py-1 rounded-lg text-xs font-medium text-white flex items-center gap-1",
                                            getPropertyBadgeColor(listing.propertyType)
                                        )}>
                                            <PropertyIcon className="w-3 h-3" />
                                            {PROPERTY_TYPE_LABELS[listing.propertyType]}
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="p-4">
                                        <h3 className={`font-semibold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                            {listing.title}
                                        </h3>

                                        <div className={`flex items-center gap-1 mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                            <MapPin className="w-4 h-4" />
                                            <span className="truncate">
                                                {listing.location?.district}, {listing.location?.city}
                                            </span>
                                        </div>

                                        {/* Features */}
                                        <div className={`flex items-center gap-3 mt-2 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                            {listing.features?.grossArea && (
                                                <span>{listing.features.grossArea} m²</span>
                                            )}
                                            {listing.features?.roomCount && (
                                                <span>{listing.features.roomCount}</span>
                                            )}
                                            {listing.features?.floor !== undefined && (
                                                <span>{listing.features.floor}. Kat</span>
                                            )}
                                        </div>

                                        {/* Price */}
                                        <div className="mt-3 flex items-center justify-between">
                                            <span className="text-lg font-bold text-purple-600">
                                                {formatPrice(listing.price, listing.currency)}
                                            </span>

                                            {getConsultantName(listing.consultantId) && (
                                                <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                                    {getConsultantName(listing.consultantId)}
                                                </span>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                                            <Link
                                                href={`/panel/emlak/listings/${listing.id}`}
                                                className={clsx(
                                                    "flex-1 py-2 rounded-lg text-center text-sm font-medium transition-colors",
                                                    isDark ? "bg-gray-700 text-white hover:bg-gray-600" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                                )}
                                            >
                                                <Edit3 className="w-4 h-4 inline mr-1" />
                                                Düzenle
                                            </Link>

                                            <button
                                                onClick={() => toggleStatus(listing)}
                                                className={clsx(
                                                    "p-2 rounded-lg transition-colors",
                                                    listing.status === 'active'
                                                        ? "bg-emerald-100 text-emerald-600 hover:bg-emerald-200"
                                                        : isDark ? "bg-gray-700 text-gray-400 hover:bg-gray-600" : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                                                )}
                                                title={listing.status === 'active' ? 'Pasifleştir' : 'Aktifleştir'}
                                            >
                                                {listing.status === 'active' ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                            </button>

                                            <button
                                                onClick={() => setDeleteConfirm(listing.id)}
                                                className="p-2 rounded-lg bg-rose-100 text-rose-600 hover:bg-rose-200 transition-colors"
                                                title="Sil"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            )}

            {/* Delete Confirmation Modal - Full Screen */}
            <AnimatePresence>
                {deleteConfirm && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={() => setDeleteConfirm(null)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className={clsx(
                                "relative w-full max-w-sm p-6 rounded-3xl shadow-2xl",
                                isDark ? "bg-gray-800 border border-gray-700" : "bg-white"
                            )}
                        >
                            <div className="flex flex-col items-center text-center gap-4">
                                <div className="w-16 h-16 rounded-2xl bg-rose-500/10 flex items-center justify-center">
                                    <Trash2 className="w-8 h-8 text-rose-500" />
                                </div>
                                <div>
                                    <h3 className={clsx("text-xl font-bold mb-2", isDark ? "text-white" : "text-gray-900")}>
                                        İlanı Sil
                                    </h3>
                                    <p className={isDark ? "text-gray-400" : "text-gray-500"}>
                                        Bu ilanı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
                                    </p>
                                </div>
                                <div className="flex gap-3 w-full mt-2">
                                    <button
                                        onClick={() => setDeleteConfirm(null)}
                                        className={clsx(
                                            "flex-1 py-3 rounded-xl font-semibold transition-colors",
                                            isDark ? "bg-gray-700 hover:bg-gray-600 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-900"
                                        )}
                                    >
                                        İptal
                                    </button>
                                    <button
                                        onClick={() => handleDelete(deleteConfirm)}
                                        className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold transition-colors shadow-lg shadow-rose-500/20"
                                    >
                                        Sil
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
