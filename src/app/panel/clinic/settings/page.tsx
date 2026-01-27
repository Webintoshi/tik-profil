'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Save, Clock, Bell, Globe, Shield, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { useBusinessSession } from '@/hooks/useBusinessSession';

interface Settings {
  currency: string;
  workingHours: Record<string, { start: string; end: string; isActive: boolean }>;
  notificationEmail: boolean;
  notificationSMS: boolean;
  appointmentReminderHours: number;
  newPatientWelcomeEmail: boolean;
  requirePhone: boolean;
  requireEmail: boolean;
}

interface SettingsFormData {
  currency: string;
  notificationEmail: boolean;
  notificationSMS: boolean;
  appointmentReminderHours: string;
  newPatientWelcomeEmail: boolean;
  requirePhone: boolean;
  requireEmail: boolean;
}

const daysOfWeek = [
  { key: 'monday', label: 'Pazartesi' },
  { key: 'tuesday', label: 'Salı' },
  { key: 'wednesday', label: 'Çarşamba' },
  { key: 'thursday', label: 'Perşembe' },
  { key: 'friday', label: 'Cuma' },
  { key: 'saturday', label: 'Cumartesi' },
  { key: 'sunday', label: 'Pazar' },
];

const currencyOptions = [
  { value: 'TRY', label: 'Türk Lirası (₺)' },
  { value: 'USD', label: 'Amerikan Doları ($)' },
  { value: 'EUR', label: 'Euro (€)' },
];

export default function ClinicSettingsPage() {
  const { businessId, loading } = useBusinessSession();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<SettingsFormData>({
    currency: 'TRY',
    notificationEmail: true,
    notificationSMS: false,
    appointmentReminderHours: '24',
    newPatientWelcomeEmail: true,
    requirePhone: true,
    requireEmail: false,
  });

  useEffect(() => {
    if (!businessId) return;

    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/clinic/settings');
        const data = await res.json();

        if (data.success && data.settings) {
          setSettings(data.settings);
          setFormData({
            currency: data.settings.currency || 'TRY',
            notificationEmail: data.settings.notificationEmail ?? true,
            notificationSMS: data.settings.notificationSMS ?? false,
            appointmentReminderHours: data.settings.appointmentReminderHours?.toString() || '24',
            newPatientWelcomeEmail: data.settings.newPatientWelcomeEmail ?? true,
            requirePhone: data.settings.requirePhone ?? true,
            requireEmail: data.settings.requireEmail ?? false,
          });
        }
      } catch (error) {
        console.error('Ayarlar yüklenirken hata:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [businessId]);

  const updateWorkingHours = (day: string, field: 'start' | 'end', value: string) => {
    if (!settings) return;
    setSettings({
      ...settings,
      workingHours: {
        ...settings.workingHours,
        [day]: {
          ...settings.workingHours[day],
          [field]: value,
        },
      },
    });
  };

  const toggleWorkingDay = (day: string) => {
    if (!settings) return;
    setSettings({
      ...settings,
      workingHours: {
        ...settings.workingHours,
        [day]: {
          ...settings.workingHours[day],
          isActive: !settings.workingHours[day]?.isActive,
        },
      },
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    setIsSaving(true);

    try {
      const payload = {
        currency: formData.currency,
        workingHours: settings.workingHours,
        notificationEmail: formData.notificationEmail,
        notificationSMS: formData.notificationSMS,
        appointmentReminderHours: parseInt(formData.appointmentReminderHours),
        newPatientWelcomeEmail: formData.newPatientWelcomeEmail,
        requirePhone: formData.requirePhone,
        requireEmail: formData.requireEmail,
      };

      const res = await fetch('/api/clinic/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        toast.success('Ayarlar kaydedildi');
      } else {
        toast.error(data.message || 'Kaydetme başarısız');
      }
    } catch (error) {
      console.error('Kaydetme hatası:', error);
      toast.error('Bir hata oluştu');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || isLoading || !settings) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Ayarlar</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Klinik ayarları</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <DollarSign className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <h2 className="text-lg font-semibold">Genel Ayarlar</h2>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Para Birimi</label>
            <select
              value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              {currencyOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-lg font-semibold">Çalışma Saatleri</h2>
          </div>

          <div className="space-y-4">
            {daysOfWeek.map((day) => (
              <div key={day.key} className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <div className="flex items-center gap-2 min-w-[140px]">
                  <input
                    type="checkbox"
                    id={day.key}
                    checked={settings.workingHours[day.key]?.isActive ?? false}
                    onChange={() => toggleWorkingDay(day.key)}
                    className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <label htmlFor={day.key} className="text-sm font-medium">
                    {day.label}
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={settings.workingHours[day.key]?.start || '09:00'}
                    onChange={(e) => updateWorkingHours(day.key, 'start', e.target.value)}
                    className="px-2 py-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
                  />
                  <span className="text-gray-400">-</span>
                  <input
                    type="time"
                    value={settings.workingHours[day.key]?.end || '18:00'}
                    onChange={(e) => updateWorkingHours(day.key, 'end', e.target.value)}
                    className="px-2 py-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Bell className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-lg font-semibold">Bildirimler</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
              <div>
                <div className="font-medium">E-posta Bildirimleri</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Randevu onayı ve hatırlatıcılar</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.notificationEmail}
                  onChange={(e) => setFormData({ ...formData, notificationEmail: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600" />
              </label>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
              <div>
                <div className="font-medium">SMS Bildirimleri</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Randevu hatırlatıcı SMS gönderimi</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.notificationSMS}
                  onChange={(e) => setFormData({ ...formData, notificationSMS: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600" />
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Randevu Hatırlatıcı (Saat Önce)</label>
              <input
                type="number"
                value={formData.appointmentReminderHours}
                onChange={(e) => setFormData({ ...formData, appointmentReminderHours: e.target.value })}
                className="w-32 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
              <div>
                <div className="font-medium">Yeni Hasta Karşılama E-postası</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">İlk kayıt olan hastalara hoş geldin e-postası</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.newPatientWelcomeEmail}
                  onChange={(e) => setFormData({ ...formData, newPatientWelcomeEmail: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600" />
              </label>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <Shield className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <h2 className="text-lg font-semibold">Gereksinimler</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
              <div>
                <div className="font-medium">Telefon Zorunlu</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Randevu alırken telefon numarası zorunlu olsun</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.requirePhone}
                  onChange={(e) => setFormData({ ...formData, requirePhone: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600" />
              </label>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
              <div>
                <div className="font-medium">E-posta Zorunlu</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Randevu alırken e-posta adresi zorunlu olsun</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.requireEmail}
                  onChange={(e) => setFormData({ ...formData, requireEmail: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600" />
              </label>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex justify-end"
        >
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Kaydediliyor...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Kaydet
              </>
            )}
          </button>
        </motion.div>
      </form>
    </div>
  );
}
