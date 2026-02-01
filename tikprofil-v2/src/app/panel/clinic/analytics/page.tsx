'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Calendar, Users, DollarSign, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useBusinessSession } from '@/hooks/useBusinessSession';

interface Analytics {
  id: string;
  period: string;
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  newPatients: number;
  totalRevenue: number;
  averageAppointmentValue: number;
}

export default function ClinicAnalyticsPage() {
  const { session, isLoading: sessionLoading } = useBusinessSession();
  const businessId = session?.businessId;
  const [analytics, setAnalytics] = useState<Analytics[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<'month' | 'year'>('month');

  useEffect(() => {
    if (!businessId) {
      setIsLoading(false);
      return;
    }

    const fetchAnalytics = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({ period });
        const res = await fetch(`/api/clinic/analytics?${params}`);
        const data = await res.json();

        if (data.success) {
          setAnalytics(data.analytics || []);
        } else {
          toast.error('Analitik veriler yüklenemedi');
        }
      } catch (error) {
        console.error('Analitik veriler yüklenirken hata:', error);
        toast.error('Bir hata oluştu');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, [businessId, period]);

  const totals = analytics.reduce((acc, curr) => ({
    totalAppointments: acc.totalAppointments + curr.totalAppointments,
    completedAppointments: acc.completedAppointments + curr.completedAppointments,
    cancelledAppointments: acc.cancelledAppointments + curr.cancelledAppointments,
    newPatients: acc.newPatients + curr.newPatients,
    totalRevenue: acc.totalRevenue + curr.totalRevenue,
    averageAppointmentValue: analytics.length > 0 ? (acc.totalRevenue + curr.totalRevenue) / (acc.completedAppointments + curr.completedAppointments) : 0,
  }), {
    totalAppointments: 0,
    completedAppointments: 0,
    cancelledAppointments: 0,
    newPatients: 0,
    totalRevenue: 0,
    averageAppointmentValue: 0,
  });

  const completionRate = totals.totalAppointments > 0
    ? ((totals.completedAppointments / totals.totalAppointments) * 100).toFixed(1)
    : '0.0';

  const cancellationRate = totals.totalAppointments > 0
    ? ((totals.cancelledAppointments / totals.totalAppointments) * 100).toFixed(1)
    : '0.0';

  const refreshData = () => {
    setPeriod(period);
  };

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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white transition-colors">Analitik</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 transition-colors">İstatistikler ve raporlar</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as 'month' | 'year')}
            className="px-3 py-2 bg-white dark:bg-[#111111] border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900 dark:text-white transition-colors"
          >
            <option value="month">Aylık</option>
            <option value="year">Yıllık</option>
          </select>
          <button
            onClick={refreshData}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Yenile
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 bg-white dark:bg-[#111111] rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl transition-colors">
              <Calendar className="w-6 h-6 text-emerald-500" />
            </div>
            <div className="flex items-center gap-1 text-emerald-600 text-sm">
              <TrendingUp className="w-4 h-4" />
              {completionRate}%
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white transition-colors mb-1">{totals.totalAppointments}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400 transition-colors">Toplam Randevu</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-6 bg-white dark:bg-[#111111] rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl transition-colors">
              <Users className="w-6 h-6 text-emerald-500" />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white transition-colors mb-1">{totals.newPatients}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400 transition-colors">Yeni Hasta</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-6 bg-white dark:bg-[#111111] rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl transition-colors">
              <DollarSign className="w-6 h-6 text-emerald-500" />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white transition-colors mb-1">₺{totals.totalRevenue.toLocaleString('tr-TR')}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400 transition-colors">Toplam Gelir</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-6 bg-white dark:bg-[#111111] rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl transition-colors">
              <TrendingUp className="w-6 h-6 text-emerald-500" />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white transition-colors mb-1">₺{Math.round(totals.averageAppointmentValue).toLocaleString('tr-TR')}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400 transition-colors">Ortalama Randevu Değeri</div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="p-6 bg-white dark:bg-[#111111] rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm transition-all"
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white transition-colors mb-4">Randevu Durumları</h2>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600 dark:text-gray-400 transition-colors">Tamamlandı</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white transition-colors">{totals.completedAppointments}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 transition-colors">
                <div
                  className="bg-emerald-500 h-2 rounded-full transition-all"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600 dark:text-gray-400 transition-colors">İptal</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white transition-colors">{totals.cancelledAppointments}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 transition-colors">
                <div
                  className="bg-red-500 h-2 rounded-full transition-all"
                  style={{ width: `${cancellationRate}%` }}
                />
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="p-6 bg-white dark:bg-[#111111] rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm transition-all"
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white transition-colors mb-4">Özet</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg transition-colors">
              <span className="text-sm text-gray-600 dark:text-gray-400 transition-colors">Tamamlama Oranı</span>
              <span className="font-semibold text-emerald-600">{completionRate}%</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg transition-colors">
              <span className="text-sm text-gray-600 dark:text-gray-400 transition-colors">İptal Oranı</span>
              <span className="font-semibold text-red-600">{cancellationRate}%</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg transition-colors">
              <span className="text-sm text-gray-600 dark:text-gray-400 transition-colors">Hasta başı ortalama</span>
              <span className="font-semibold text-gray-900 dark:text-white transition-colors">₺{totals.newPatients > 0 ? Math.round(totals.totalRevenue / totals.newPatients).toLocaleString('tr-TR') : '0'}</span>
            </div>
          </div>
        </motion.div>
      </div>

      {analytics.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="p-6 bg-white dark:bg-[#111111] rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm transition-all"
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white transition-colors mb-4">Detaylı Analitik</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 transition-colors">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400 transition-colors">Dönem</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400 transition-colors">Randevu</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400 transition-colors">Tamamlandı</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400 transition-colors">İptal</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400 transition-colors">Yeni Hasta</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400 transition-colors">Gelir</th>
                </tr>
              </thead>
              <tbody>
                {analytics.map((item, index) => (
                  <motion.tr
                    key={item.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 + index * 0.05 }}
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <td className="py-3 px-4 text-sm text-gray-900 dark:text-white transition-colors">{item.period}</td>
                    <td className="py-3 px-4 text-sm text-right text-gray-900 dark:text-white transition-colors">{item.totalAppointments}</td>
                    <td className="py-3 px-4 text-sm text-right text-emerald-600">{item.completedAppointments}</td>
                    <td className="py-3 px-4 text-sm text-right text-red-600">{item.cancelledAppointments}</td>
                    <td className="py-3 px-4 text-sm text-right text-gray-900 dark:text-white transition-colors">{item.newPatients}</td>
                    <td className="py-3 px-4 text-sm text-right font-medium text-gray-900 dark:text-white transition-colors">₺{item.totalRevenue.toLocaleString('tr-TR')}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="text-center py-12 bg-gray-50 dark:bg-[#111111] rounded-xl border border-gray-200 dark:border-gray-800 transition-all"
        >
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white transition-colors mb-2">Analitik Verisi Yok</h3>
          <p className="text-gray-600 dark:text-gray-400 transition-colors">
            Henüz yeterli veri yok. Analitik verileri zamanla oluşacaktır.
          </p>
        </motion.div>
      )}
    </div>
  );
}
