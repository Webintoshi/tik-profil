"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Calendar, User, Phone, MessageCircle
} from "lucide-react";
import { Appointment, AppointmentStatus } from "@/types/beauty";
import { useBusinessSession } from "@/hooks/useBusinessSession";
import { toast } from "sonner";
import clsx from "clsx";

export default function BeautyAppointmentsPage() {
    const { session: business, isLoading: businessLoading } = useBusinessSession();
    const [activeTab, setActiveTab] = useState<'pending' | 'confirmed' | 'history'>('pending');
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const hasFetched = useRef(false);

    const loadAppointments = useCallback(async (businessId: string) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/beauty/appointments?businessId=${businessId}`);
            const data = await res.json();
            if (data.success) {
                setAppointments(data.appointments || []);
            }
        } catch (error) {
            console.error(error);
            toast.error("Randevular yüklenemedi");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (business?.businessId && !hasFetched.current) {
            hasFetched.current = true;
            loadAppointments(business.businessId);
        }
    }, [business?.businessId, loadAppointments]);

    const handleStatusUpdate = async (id: string, status: AppointmentStatus) => {
        const oldAppointments = [...appointments];

        // Optimistic update
        setAppointments(prev => prev.map(app =>
            app.id === id ? { ...app, status } : app
        ));

        try {
            const res = await fetch('/api/beauty/appointments', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id,
                    businessId: business?.businessId,
                    status
                })
            });
            const data = await res.json();
            if (data.success) {
                toast.success("Randevu durumu güncellendi");
            } else {
                setAppointments(oldAppointments); // Revert
                toast.error("Güncelleme başarısız");
            }
        } catch (error) {
            setAppointments(oldAppointments); // Revert
            toast.error("Bir hata oluştu");
        }
    };

    const getFilteredAppointments = () => {
        return appointments.filter(app => {
            if (activeTab === 'pending') return app.status === 'pending';
            if (activeTab === 'confirmed') return app.status === 'confirmed';
            if (activeTab === 'history') return ['completed', 'cancelled', 'rejected'].includes(app.status);
            return false;
        }).sort((a, b) => {
            // Sort pending/confirmed by date ascending (soonest first)
            // Sort history by date descending (newest first)
            const dateA = new Date(`${a.date}T${a.startTime}`).getTime();
            const dateB = new Date(`${b.date}T${b.startTime}`).getTime();

            if (activeTab === 'history') return dateB - dateA;
            return dateA - dateB;
        });
    };

    const filteredList = getFilteredAppointments();

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('tr-TR', {
            weekday: 'short', day: 'numeric', month: 'long'
        });
    };

    if (businessLoading) return <div>Yükleniyor...</div>;

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Randevular</h1>
                    <p className="text-gray-500 text-sm">Gelen randevu taleplerini yönetin</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-white p-1 rounded-xl border border-gray-200 shadow-sm w-fit mb-6">
                <button
                    onClick={() => setActiveTab('pending')}
                    className={clsx(
                        "px-4 py-2 rounded-lg text-sm font-bold transition-all relative",
                        activeTab === 'pending' ? "text-rose-600" : "text-gray-500 hover:bg-gray-50"
                    )}
                >
                    {activeTab === 'pending' && (
                        <motion.div layoutId="tab-bg" className="absolute inset-0 bg-rose-50 rounded-lg -z-10" />
                    )}
                    Bekleyenler
                    {appointments.filter(a => a.status === 'pending').length > 0 && (
                        <span className="ml-2 px-1.5 py-0.5 bg-rose-500 text-white text-xs rounded-full">
                            {appointments.filter(a => a.status === 'pending').length}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('confirmed')}
                    className={clsx(
                        "px-4 py-2 rounded-lg text-sm font-bold transition-all relative",
                        activeTab === 'confirmed' ? "text-rose-600" : "text-gray-500 hover:bg-gray-50"
                    )}
                >
                    {activeTab === 'confirmed' && (
                        <motion.div layoutId="tab-bg" className="absolute inset-0 bg-rose-50 rounded-lg -z-10" />
                    )}
                    Gelecek Randevular
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={clsx(
                        "px-4 py-2 rounded-lg text-sm font-bold transition-all relative",
                        activeTab === 'history' ? "text-rose-600" : "text-gray-500 hover:bg-gray-50"
                    )}
                >
                    {activeTab === 'history' && (
                        <motion.div layoutId="tab-bg" className="absolute inset-0 bg-rose-50 rounded-lg -z-10" />
                    )}
                    Geçmiş
                </button>
            </div>

            {/* Content */}
            {loading ? (
                <div className="py-20 text-center text-gray-400">Yükleniyor...</div>
            ) : filteredList.length === 0 ? (
                <div className="py-20 text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Calendar className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-gray-900 font-bold mb-1">Randevu Bulunamadı</h3>
                    <p className="text-gray-500 text-sm">Bu kategoride gösterilecek randevu yok.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {filteredList.map((app) => (
                        <motion.div
                            key={app.id}
                            layout
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row gap-6 items-start md:items-center"
                        >
                            {/* Date Box */}
                            <div className="flex-shrink-0 w-full md:w-auto flex md:flex-col items-center justify-center gap-2 md:gap-0 p-3 bg-rose-50 rounded-xl text-rose-600 min-w-[80px]">
                                <span className="text-xs font-bold uppercase">{new Date(app.date).toLocaleDateString('tr-TR', { month: 'short' })}</span>
                                <span className="text-2xl font-bold">{new Date(app.date).getDate()}</span>
                                <span className="text-xs font-bold bg-white px-2 py-0.5 rounded-full mt-1 shadow-sm">{app.startTime}</span>
                            </div>

                            {/* Info */}
                            <div className="flex-grow space-y-2">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-gray-900 text-lg">{app.customerName}</h3>
                                    {app.status === 'confirmed' && <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full font-bold">Onaylandı</span>}
                                    {app.status === 'cancelled' && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">İptal</span>}
                                </div>
                                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                                            <span className="text-xs">💅</span>
                                        </div>
                                        <span className="font-medium">{app.serviceName}</span>
                                        <span className="text-gray-400">({app.serviceDuration} dk)</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                                            <User className="w-3 h-3" />
                                        </div>
                                        <span>{app.staffName}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                                            <Phone className="w-3 h-3" />
                                        </div>
                                        <span>{app.customerPhone}</span>
                                    </div>
                                </div>
                                {app.note && (
                                    <div className="text-sm text-gray-500 bg-gray-50 p-2 rounded-lg mt-2 inline-block">
                                        Note: {app.note}
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 w-full md:w-auto mt-2 md:mt-0">
                                {activeTab === 'pending' && (
                                    <>
                                        <button
                                            onClick={() => handleStatusUpdate(app.id, 'rejected')}
                                            className="flex-1 md:flex-none px-4 py-2 border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50 hover:text-red-500 transition-colors"
                                        >
                                            Reddet
                                        </button>
                                        <button
                                            onClick={() => handleStatusUpdate(app.id, 'confirmed')}
                                            className="flex-1 md:flex-none px-6 py-2 bg-rose-500 text-white rounded-xl font-bold hover:bg-rose-600 shadow-lg shadow-rose-200 transition-colors"
                                        >
                                            Onayla
                                        </button>
                                    </>
                                )}
                                {activeTab === 'confirmed' && (
                                    <>
                                        <button
                                            onClick={() => handleStatusUpdate(app.id, 'cancelled')}
                                            className="flex-1 md:flex-none px-4 py-2 border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50 hover:text-red-500 transition-colors"
                                        >
                                            İptal Et
                                        </button>
                                        <a
                                            href={`https://wa.me/90${app.customerPhone.replace(/\D/g, '')}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="flex-1 md:flex-none w-10 h-10 flex items-center justify-center bg-green-500 text-white rounded-xl hover:bg-green-600 shadow-lg shadow-green-200 transition-colors"
                                        >
                                            <MessageCircle className="w-5 h-5" />
                                        </a>
                                    </>
                                )}
                                {activeTab === 'history' && (
                                    <span className="text-sm text-gray-400 font-medium px-4">
                                        İşlem Yapılamaz
                                    </span>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
