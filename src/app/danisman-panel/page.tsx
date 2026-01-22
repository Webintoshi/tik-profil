"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
    User,
    Home,
    LogOut,
    Loader2,
    ExternalLink,
    Phone,
    Mail,
    MapPin,
    Eye
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { useConsultantSession } from "@/hooks/useConsultantSession";
import { toR2ProxyUrl } from "@/lib/publicImage";

export default function ConsultantDashboardPage() {
    const router = useRouter();
    const { session, consultant, business, isLoading, logout } = useConsultantSession();

    // Redirect if not logged in
    useEffect(() => {
        if (!isLoading && !session) {
            router.push('/danisman-giris');
        }
    }, [isLoading, session, router]);

    const handleLogout = async () => {
        await logout();
        toast.success('Çıkış yapıldı');
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            </div>
        );
    }

    if (!session || !consultant) {
        return null;
    }

    const profileUrl = business?.slug && consultant?.slug
        ? `/${business.slug}/danisman/${consultant.slug}`
        : null;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl flex items-center justify-center">
                            <User className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="font-bold text-gray-900">Danışman Paneli</h1>
                            <p className="text-xs text-gray-500">{business?.name}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                        <span className="text-sm">Çıkış</span>
                    </button>
                </div>
            </header>

            <main className="max-w-4xl mx-auto p-4 space-y-6">
                {/* Profile Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl p-6 shadow-sm"
                >
                    <div className="flex items-start gap-6">
                        {/* Photo */}
                        <div className="relative w-24 h-24 rounded-2xl overflow-hidden bg-purple-100 flex-shrink-0">
                            {consultant.photoUrl ? (
                                <Image
                                    src={toR2ProxyUrl(consultant.photoUrl)}
                                    alt={consultant.name}
                                    fill
                                    className="object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <User className="w-12 h-12 text-purple-400" />
                                </div>
                            )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                            <h2 className="text-xl font-bold text-gray-900">{consultant.name}</h2>
                            <p className="text-purple-600 font-medium">{consultant.title || 'Emlak Danışmanı'}</p>

                            <div className="mt-3 space-y-1">
                                {consultant.phone && (
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <Phone className="w-4 h-4" />
                                        <span>{consultant.phone}</span>
                                    </div>
                                )}
                                {consultant.email && (
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <Mail className="w-4 h-4" />
                                        <span>{consultant.email}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Profile Link */}
                        {profileUrl && (
                            <Link
                                href={profileUrl}
                                target="_blank"
                                className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-600 rounded-xl hover:bg-purple-200 transition-colors"
                            >
                                <Eye className="w-4 h-4" />
                                <span className="text-sm font-medium">Profili Gör</span>
                                <ExternalLink className="w-3 h-3" />
                            </Link>
                        )}
                    </div>

                    {/* Bio */}
                    {consultant.bio && (
                        <div className="mt-6 pt-6 border-t border-gray-100">
                            <h3 className="font-semibold text-gray-900 mb-2">Hakkında</h3>
                            <p className="text-gray-600 text-sm">{consultant.bio}</p>
                        </div>
                    )}
                </motion.div>

                {/* Quick Actions */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="grid grid-cols-2 gap-4"
                >
                    <Link
                        href="/danisman-panel/ilanlarim"
                        className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow group"
                    >
                        <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
                            <Home className="w-6 h-6 text-green-600" />
                        </div>
                        <h3 className="font-bold text-gray-900 group-hover:text-green-600 transition-colors">İlanlarım</h3>
                        <p className="text-sm text-gray-500 mt-1">Emlak ilanlarınızı görüntüleyin</p>
                    </Link>

                    <Link
                        href="/danisman-panel/profil"
                        className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow group"
                    >
                        <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
                            <User className="w-6 h-6 text-purple-600" />
                        </div>
                        <h3 className="font-bold text-gray-900 group-hover:text-purple-600 transition-colors">Profilim</h3>
                        <p className="text-sm text-gray-500 mt-1">Profil bilgilerinizi düzenleyin</p>
                    </Link>
                </motion.div>
            </main>
        </div>
    );
}
