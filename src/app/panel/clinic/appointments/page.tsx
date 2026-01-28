'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Calendar, Clock, User, Phone, Check, X, RefreshCw, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useBusinessSession } from '@/hooks/useBusinessSession';

interface Appointment {
  id: string;
  patientName: string;
  patientPhone: string;
  patientEmail?: string;
  serviceName: string;
  doctorName?: string;
  date: string;
  timeSlot: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'rejected';
  notes?: string;
  createdAt: string;
}

type TabType = 'pending' | 'confirmed' | 'history';

export default function ClinicAppointmentsPage() {
  const { session, isLoading: sessionLoading } = useBusinessSession();
  const businessId = session?.businessId;
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!businessId) {
      setIsLoading(false);
      return;
    }

    const fetchAppointments = async () => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/clinic/appointments');
        const data = await res.json();

        if (data.success) {
          setAppointments(data.appointments || []);
        } else {
          toast.error('Randevular yüklenemedi');
        }
      } catch (error) {
        console.error('Randevular yüklenirken hata:', error);
        toast.error('Bir hata oluştu');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAppointments();
  }, [businessId]);

  const getFilteredAppointments = () => {
    return appointments.filter(app => {
      if (activeTab === 'pending') return app.status === 'pending';
      if (activeTab === 'confirmed') return app.status === 'confirmed';
      if (activeTab === 'history') return ['completed', 'cancelled', 'rejected'].includes(app.status);
      return false;
    }).sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.timeSlot}`).getTime();
      const dateB = new Date(`${b.date}T${b.timeSlot}`).getTime();
      if (activeTab === 'history') return dateB - dateA;
      return dateA - dateB;
    });
  };

  const updateStatus = async (id: string, status: Appointment['status']) => {
    const previousStatus = appointments.find(a => a.id === id)?.status;
    setAppointments(prev => prev.map(app => app.id === id ? { ...app, status } : app));

    try {
      const res = await fetch(`/api/clinic/appointments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.message || 'Güncelleme başarısız');
      }

      toast.success('Durum güncellendi');
    } catch (error) {
      setAppointments(prev => prev.map(app => app.id === id ? { ...app, status: previousStatus! } : app));
      toast.error('Güncelleme başarısız');
    }
  };

  const tabs = [
    { id: 'pending' as TabType, label: 'Bekleyen', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
    { id: 'confirmed' as TabType, label: 'Onaylandı', color: 'text-emerald-600', bgColor: 'bg-emerald-100' },
    { id: 'history' as TabType, label: 'Geçmiş', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  ];

  const filteredAppointments = getFilteredAppointments();

  if (sessionLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white transition-colors">Randevular</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 transition-colors">Randevu yönetimi</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Yenile
        </button>
      </div>

      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-800 transition-colors">
        {tabs.map(tab => {
          const count = tab.id === 'history' 
            ? appointments.filter(a => ['completed', 'cancelled', 'rejected'].includes(a.status)).length
            : appointments.filter(a => a.status === tab.id).length;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors relative ${
                activeTab === tab.id
                  ? 'text-emerald-600'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              {tab.label}
              {count > 0 && (
                <span className={`px-2 py-0.5 text-xs rounded-full ${tab.id === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}>
                  {count}
                </span>
              )}
              {activeTab === tab.id && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500"
                />
              )}
            </button>
          );
        })}
      </div>

      {filteredAppointments.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-[#111111] rounded-xl border border-gray-200 dark:border-gray-800 transition-all">
          <div className="text-6xl mb-4">📅</div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white transition-colors mb-2">Randevu Bulunamadı</h3>
          <p className="text-gray-600 dark:text-gray-400 transition-colors">
            {activeTab === 'pending' && 'Bekleyen randevu yok'}
            {activeTab === 'confirmed' && 'Onaylı randevu yok'}
            {activeTab === 'history' && 'Geçmiş randevu yok'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAppointments.map((appointment, index) => (
            <motion.div
              key={appointment.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="p-6 bg-white dark:bg-[#111111] rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400 dark:text-gray-500 transition-colors" />
                      <span className="font-semibold text-gray-900 dark:text-white transition-colors">{appointment.patientName}</span>
                    </div>
                    {appointment.patientEmail && (
                      <span className="text-sm text-gray-500 dark:text-gray-400 transition-colors">{appointment.patientEmail}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 transition-colors">
                    <div className="flex items-center gap-1">
                      <Phone className="w-4 h-4" />
                      <span>{appointment.patientPhone}</span>
                    </div>
                    <a
                      href={`https://wa.me/90${appointment.patientPhone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700"
                    >
                      <MessageCircle className="w-4 h-4" />
                      WhatsApp
                    </a>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                    appointment.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    appointment.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' :
                    appointment.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                    appointment.status === 'cancelled' ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {appointment.status === 'pending' && 'Bekliyor'}
                    {appointment.status === 'confirmed' && 'Onaylandı'}
                    {appointment.status === 'completed' && 'Tamamlandı'}
                    {appointment.status === 'cancelled' && 'İptal'}
                    {appointment.status === 'rejected' && 'Reddedildi'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-emerald-500" />
                  <span className="text-gray-600 dark:text-gray-400 transition-colors">Hizmet:</span>
                  <span className="font-medium text-gray-900 dark:text-white transition-colors">{appointment.serviceName}</span>
                </div>
                {appointment.doctorName && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4 text-emerald-500" />
                    <span className="text-gray-600 dark:text-gray-400 transition-colors">Doktor:</span>
                    <span className="font-medium text-gray-900 dark:text-white transition-colors">{appointment.doctorName}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-emerald-500" />
                  <span className="text-gray-600 dark:text-gray-400 transition-colors">Tarih:</span>
                  <span className="font-medium text-gray-900 dark:text-white transition-colors">{new Date(appointment.date).toLocaleDateString('tr-TR')}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-emerald-500" />
                  <span className="text-gray-600 dark:text-gray-400 transition-colors">Saat:</span>
                  <span className="font-medium text-gray-900 dark:text-white transition-colors">{appointment.timeSlot}</span>
                </div>
              </div>

              {appointment.notes && (
                <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-sm text-gray-600 dark:text-gray-400 transition-colors mb-4">
                  <span className="font-medium text-gray-900 dark:text-white transition-colors">Not:</span> {appointment.notes}
                </div>
              )}

              {appointment.status === 'pending' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => updateStatus(appointment.id, 'confirmed')}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
                  >
                    <Check className="w-4 h-4" />
                    Onayla
                  </button>
                  <button
                    onClick={() => updateStatus(appointment.id, 'rejected')}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Reddet
                  </button>
                </div>
              )}

              {appointment.status === 'confirmed' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => updateStatus(appointment.id, 'completed')}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
                  >
                    <Check className="w-4 h-4" />
                    Tamamlandı
                  </button>
                  <button
                    onClick={() => updateStatus(appointment.id, 'cancelled')}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                    İptal Et
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
