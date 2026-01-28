'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Stethoscope, Calendar, Users, Scissors, ListChecks, Activity, DollarSign, Plus, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useBusinessSession } from '@/hooks/useBusinessSession';

interface Stats {
  categories: number;
  services: number;
  staff: number;
  appointments: number;
  patients: number;
}

export default function ClinicDashboardPage() {
  const { session, isLoading: sessionLoading } = useBusinessSession();
  const businessId = session?.businessId;
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!businessId) {
      setIsLoading(false);
      return;
    }

    const fetchStats = async () => {
      setIsLoading(true);
      try {
        const [categoriesRes, servicesRes, staffRes, appointmentsRes, patientsRes] = await Promise.all([
          fetch('/api/clinic/categories'),
          fetch('/api/clinic/services'),
          fetch('/api/clinic/staff'),
          fetch('/api/clinic/appointments'),
          fetch('/api/clinic/patients'),
        ]);

        const [categoriesData, servicesData, staffData, appointmentsData, patientsData] = await Promise.all([
          categoriesRes.json(),
          servicesRes.json(),
          staffRes.json(),
          appointmentsRes.json(),
          patientsRes.json(),
        ]);

        setStats({
          categories: categoriesData.count || 0,
          services: servicesData.count || 0,
          staff: staffData.count || 0,
          appointments: appointmentsData.count || 0,
          patients: patientsData.count || 0,
        });
      } catch (error) {
        console.error('İstatistikler yüklenirken hata:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [businessId]);

  if (sessionLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  const statsCards = [
    { label: 'Kategoriler', value: stats?.categories || 0, icon: ListChecks, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: 'Hizmetler', value: stats?.services || 0, icon: Stethoscope, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: 'Personel', value: stats?.staff || 0, icon: Users, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: 'Randevular', value: stats?.appointments || 0, icon: Calendar, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: 'Hastalar', value: stats?.patients || 0, icon: Activity, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  ];

  const quickActions = [
    { label: 'Yeni Hizmet Ekle', href: '/panel/clinic/services', icon: Plus, color: 'from-emerald-500 to-emerald-600' },
    { label: 'Kategorileri Yönet', href: '/panel/clinic/categories', icon: ListChecks, color: 'from-emerald-500 to-emerald-600' },
    { label: 'Personel Ekle', href: '/panel/clinic/staff', icon: Users, color: 'from-emerald-500 to-emerald-600' },
    { label: 'Randevuları Görüntüle', href: '/panel/clinic/appointments', icon: Calendar, color: 'from-emerald-500 to-emerald-600' },
  ];

  const revenueCards = [
    { label: 'Bu Ay Randevu', value: `${stats?.appointments || 0} adet`, icon: Calendar, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: 'Toplam Gelir', value: '₺0', icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center text-2xl">
            💉
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white transition-colors">Klinik Merkezi</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 transition-colors">Klinik yönetim paneli</p>
          </div>
        </div>
        <Link
          href="/panel/clinic/appointments"
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 hover:shadow-lg transition-all"
        >
          Randevular
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {statsCards.map((card, index) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="p-6 bg-white dark:bg-[#111111] rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 ${card.bg} rounded-xl`}>
                <card.icon className={`w-6 h-6 ${card.color}`} />
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white transition-colors mb-1">{card.value}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400 transition-colors">{card.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white transition-colors mb-4">Hızlı İşlemler</h2>
          <div className="grid grid-cols-2 gap-4">
            {quickActions.map((action, index) => (
              <motion.div
                key={action.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 + index * 0.1 }}
              >
                <Link
                  href={action.href}
                  className="flex flex-col items-center justify-center p-6 bg-white dark:bg-[#111111] rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-all group"
                >
                  <div className={`p-3 bg-gradient-to-br ${action.color} rounded-xl mb-3 group-hover:scale-110 transition-transform`}>
                    <action.icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors">{action.label}</span>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white transition-colors mb-4">Gelir & Randevu</h2>
          <div className="space-y-4">
            {revenueCards.map((card, index) => (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 + index * 0.1 }}
                className="p-6 bg-white dark:bg-[#111111] rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 transition-colors mb-1">{card.label}</div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white transition-colors">{card.value}</div>
                  </div>
                  <div className={`p-3 ${card.bg} rounded-xl`}>
                    <card.icon className={`w-6 h-6 ${card.color}`} />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {stats?.services === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="text-center py-12 bg-gray-50 dark:bg-[#111111] rounded-xl border border-gray-200 dark:border-gray-800 transition-all"
        >
          <div className="text-6xl mb-4">🏥</div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white transition-colors mb-2">Klinik Kurulumuna Başla</h3>
          <p className="text-gray-600 dark:text-gray-400 transition-colors mb-6 max-w-md mx-auto">
            Hizmetlerinizi ve personelinizi ekleyerek klinik yönetimine başlayın
          </p>
          <Link
            href="/panel/clinic/services"
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 hover:shadow-lg transition-all"
          >
            <Plus className="w-5 h-5" />
            İlk Hizmeti Ekle
          </Link>
        </motion.div>
      )}
    </div>
  );
}
