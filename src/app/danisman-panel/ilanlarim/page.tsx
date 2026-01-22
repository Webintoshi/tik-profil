"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Plus,
    Edit3,
    Trash2,
    Loader2,
    Image as ImageIcon,
    MapPin,
    Home,
    Building2,
    Trees,
    ArrowLeft,
    Eye,
    EyeOff,
    ExternalLink
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useConsultantSession } from "@/hooks/useConsultantSession";
import {
    Listing,
    PROPERTY_TYPE_LABELS,
    STATUS_LABELS,
    formatPrice,
    getPropertyBadgeColor
} from "@/types/emlak";

export default function ConsultantListingsPage() {
    const router = useRouter();
    const { session, consultant, business, isLoading: sessionLoading } = useConsultantSession();
    const [listings, setListings] = useState<Listing[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState<string | null>(null);

    useEffect(() => {
        if (!sessionLoading && !session) {
            router.push('/danisman-giris');
        }
    }, [sessionLoading, session, router]);

    useEffect(() => {
        if (session) {
            loadListings();
        }
    }, [session]);

    const loadListings = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/consultant/listings');
            const data = await res.json();
            if (data.success) {
                setListings(data.listings);
            } else {
                toast.error('İlanlar yüklenemedi');
            }
        } catch {
            toast.error('Bağlantı hatası');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Bu ilanı silmek istediğinize emin misiniz?')) return;

        setDeleting(id);
        try {
            const res = await fetch(`/api/consultant/listings?id=${id}`, {
                method: 'DELETE',
            });
            const data = await res.json();
            if (data.success) {
                toast.success('İlan silindi');
                loadListings();
            } else {
                toast.error(data.error || 'Silme başarısız');
            }
        } catch {
            toast.error('Silme sırasında hata oluştu');
        } finally {
            setDeleting(null);
        }
    };

    const toggleStatus = async (listing: Listing) => {
        const newStatus = listing.status === 'active' ? 'inactive' : 'active';
        try {
            const res = await fetch('/api/consultant/listings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: listing.id, status: newStatus }),
            });
            const data = await res.json();
            if (data.success) {
                toast.success(newStatus === 'active' ? 'İlan aktif edildi' : 'İlan pasif yapıldı');
                loadListings();
            } else {
                toast.error(data.error || 'Güncelleme başarısız');
            }
        } catch {
            toast.error('Güncelleme sırasında hata oluştu');
        }
    };

    const getPropertyIcon = (type: string) => {
        switch (type) {
            case 'apartment': return <Building2 className="w-4 h-4" />;
            case 'house': return <Home className="w-4 h-4" />;
            case 'land': return <Trees className="w-4 h-4" />;
            default: return <Home className="w-4 h-4" />;
        }
    };

    if (sessionLoading || !session) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
                <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/danisman-panel"
                            className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center hover:bg-gray-200 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </Link>
                        <div>
                            <h1 className="font-bold text-gray-900">İlanlarım</h1>
                            <p className="text-xs text-gray-500">{listings.length} ilan</p>
                        </div>
                    </div>
                    <Link
                        href="/danisman-panel/ilanlarim/yeni"
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-medium hover:shadow-lg transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Yeni İlan</span>
                    </Link>
                </div>
            </header>

            <main className="max-w-6xl mx-auto p-4">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                    </div>
                ) : listings.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center py-20"
                    >
                        <div className="w-20 h-20 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <Home className="w-10 h-10 text-purple-400" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Henüz ilanınız yok</h2>
                        <p className="text-gray-500 mb-6">İlk ilanınızı ekleyerek başlayın</p>
                        <Link
                            href="/danisman-panel/ilanlarim/yeni"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-violet-600 text-white rounded-xl font-medium hover:shadow-lg transition-all"
                        >
                            <Plus className="w-5 h-5" />
                            <span>İlk İlanı Ekle</span>
                        </Link>
                    </motion.div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <AnimatePresence>
                            {listings.map((listing) => (
                                <motion.div
                                    key={listing.id}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                                >
                                    {/* Image */}
                                    <div className="relative aspect-[4/3] bg-gray-100">
                                        {listing.images && listing.images.length > 0 ? (
                                            <Image
                                                src={typeof listing.images[0] === 'string' ? listing.images[0] : listing.images[0].url}
                                                alt={listing.title}
                                                fill
                                                className="object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <ImageIcon className="w-12 h-12 text-gray-300" />
                                            </div>
                                        )}
                                        {/* Status Badge */}
                                        <div className={`absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-medium ${listing.status === 'active'
                                            ? 'bg-green-500 text-white'
                                            : 'bg-gray-500 text-white'
                                            }`}>
                                            {STATUS_LABELS[listing.status as keyof typeof STATUS_LABELS] || listing.status}
                                        </div>
                                        {/* Property Type Badge */}
                                        <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getPropertyBadgeColor(listing.propertyType)
                                            }`}>
                                            {getPropertyIcon(listing.propertyType)}
                                            {PROPERTY_TYPE_LABELS[listing.propertyType as keyof typeof PROPERTY_TYPE_LABELS]}
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="p-4">
                                        <h3 className="font-bold text-gray-900 line-clamp-1 mb-1">
                                            {listing.title}
                                        </h3>
                                        <p className="text-sm text-gray-500 flex items-center gap-1 mb-2">
                                            <MapPin className="w-3 h-3" />
                                            {listing.location?.district}, {listing.location?.city}
                                        </p>
                                        <p className="text-lg font-bold text-purple-600">
                                            {formatPrice(listing.price, listing.currency)}
                                        </p>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                                            <button
                                                onClick={() => toggleStatus(listing)}
                                                className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-sm font-medium transition-colors ${listing.status === 'active'
                                                    ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                    : 'bg-green-100 text-green-600 hover:bg-green-200'
                                                    }`}
                                            >
                                                {listing.status === 'active' ? (
                                                    <>
                                                        <EyeOff className="w-4 h-4" />
                                                        Pasif Yap
                                                    </>
                                                ) : (
                                                    <>
                                                        <Eye className="w-4 h-4" />
                                                        Aktif Et
                                                    </>
                                                )}
                                            </button>
                                            <Link
                                                href={`/danisman-panel/ilanlarim/${listing.id}`}
                                                className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-sm font-medium bg-purple-100 text-purple-600 hover:bg-purple-200 transition-colors"
                                            >
                                                <Edit3 className="w-4 h-4" />
                                                Düzenle
                                            </Link>
                                            <button
                                                onClick={() => handleDelete(listing.id)}
                                                disabled={deleting === listing.id}
                                                className="p-2 rounded-lg text-red-500 hover:bg-red-100 transition-colors disabled:opacity-50"
                                            >
                                                {deleting === listing.id ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Trash2 className="w-4 h-4" />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </main>
        </div>
    );
}
