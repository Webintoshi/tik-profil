'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Save, Clock, Bell, Shield, DollarSign, CalendarDays, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useBusinessSession } from '@/hooks/useBusinessSession';

interface WorkingHours {
  start: string;
  end: string;
  isActive: boolean;
}

interface Settings {
  currency: string;
  workingHours: Record<string, WorkingHours>;
  notificationEmail: boolean;
  notificationSMS: boolean;
  appointmentReminderHours: number;
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
  { value: 'TRY', label: 'Türk Lirası (₺)', symbol: '₺' },
  { value: 'USD', label: 'Amerikan Doları ($)', symbol: '$' },
  { value: 'EUR', label: 'Euro (€)', symbol: '€' },
];

const defaultWorkingHours: Record<string, WorkingHours> = {
  monday: { start: '09:00', end: '18:00', isActive: true },
  tuesday: { start: '09:00', end: '18:00', isActive: true },
  wednesday: { start: '09:00', end: '18:00', isActive: true },
  thursday: { start: '09:00', end: '18:00', isActive: true },
  friday: { start: '09:00', end: '18:00', isActive: true },
  saturday: { start: '10:00', end: '16:00', isActive: false },
  sunday: { start: '10:00', end: '16:00', isActive: false },
};

export default function ClinicSettingsPage() {
  const { session, isLoading: sessionLoading } = useBusinessSession();
  const businessId = session?.businessId;
  
  const [settings, setSettings] = useState<Settings>({
    currency: 'TRY',
    workingHours: defaultWorkingHours,
    notificationEmail: true,
    notificationSMS: false,
    appointmentReminderHours: 24,
    newPatientWelcomeEmail: true,
    requirePhone: true,
    requireEmail: false,
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch settings on mount
  useEffect(() => {
    if (sessionLoading) return;
    
    if (!businessId) {
      setIsLoading(false);
      return;
    }

    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/clinic/settings');
        const data = await res.json();

        if (data.success && data.settings) {
          const s = data.settings;
          
          // Parse notifications object if it exists
          const notifications = s.notifications || {};
          
          setSettings({
            currency: s.currency || 'TRY',
            workingHours: s.workingHours || defaultWorkingHours,
            notificationEmail: notifications.email ?? true,
            notificationSMS: notifications.sms ?? false,
            appointmentReminderHours: notifications.appointmentReminderHours ?? 24,
            newPatientWelcomeEmail: notifications.newPatientWelcomeEmail ?? true,
            requirePhone: s.requirePhone ?? true,
            requireEmail: s.requireEmail ?? false,
          });
        }
      } catch (error) {
        console.error('Ayarlar yüklenirken hata:', error);
        toast.error('Ayarlar yüklenemedi');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [businessId, sessionLoading]);

  const updateWorkingHours = (day: string, field: keyof WorkingHours, value: string | boolean) => {
    setSettings(prev => ({
      ...prev,
      workingHours: {
        ...prev.workingHours,
        [day]: {
          ...prev.workingHours[day],
          [field]: value,
        },
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId) return;

    setIsSaving(true);

    try {
      const payload = {
        currency: settings.currency,
        currencySymbol: currencyOptions.find(c => c.value === settings.currency)?.symbol || '₺',
        workingHours: settings.workingHours,
        notifications: {
          email: settings.notificationEmail,
          sms: settings.notificationSMS,
          appointmentReminderHours: settings.appointmentReminderHours,
          newPatientWelcomeEmail: settings.newPatientWelcomeEmail,
        },
        requirePhone: settings.requirePhone,
        requireEmail: settings.requireEmail,
        isActive: true,
      };

      const res = await fetch('/api/clinic/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        toast.success('Ayarlar kaydedildi');
      } else {
        toast.error(data.error || 'Kaydetme başarısız');
      }
    } catch (error) {
      console.error('Kaydetme hatası:', error);
      toast.error('Bir hata oluştu');
    } finally {
      setIsSaving(false);
    }
  };

  if (sessionLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Ayarlar</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Klinik ayarlarınızı yönetin</p>
        </div>
        <button
          onClick={handleSubmit}
          disabled={isSaving}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* General Settings */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-[#111111] rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-white">Genel Ayarlar</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Para birimi ve temel ayarlar</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Para Birimi
            </label>
            <select
              value={settings.currency}
              onChange={(e) => setSettings(prev => ({ ...prev, currency: e.target.value }))}
              className="w-full px-3 py-2 bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            >
              {currencyOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </motion.div>

        {/* Working Hours */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-[#111111] rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <Clock className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-white">Çalışma Saatleri</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Haftalık çalışma programı</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {daysOfWeek.map((day) => {
                const daySettings = settings.workingHours[day.key] || { start: '09:00', end: '18:00', isActive: false };
                return (
                  <div 
                    key={day.key} 
                    className={`flex items-center gap-4 p-4 rounded-lg border transition-all ${
                      daySettings.isActive 
                        ? 'bg-white dark:bg-[#0a0a0a] border-gray-200 dark:border-gray-700' 
                        : 'bg-gray-50 dark:bg-gray-900/20 border-gray-100 dark:border-gray-800'
                    }`}
                  >
                    <label className="flex items-center gap-3 min-w-[140px] cursor-pointer">
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={daySettings.isActive}
                          onChange={() => updateWorkingHours(day.key, 'isActive', !daySettings.isActive)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500" />
                      </div>
                      <span className={`text-sm font-medium ${daySettings.isActive ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-500'}`}>
                        {day.label}
                      </span>
                    </label>
                    <div className={`flex items-center gap-2 ${daySettings.isActive ? 'opacity-100' : 'opacity-40'}`}>
                      <input
                        type="time"
                        value={daySettings.start}
                        onChange={(e) => updateWorkingHours(day.key, 'start', e.target.value)}
                        disabled={!daySettings.isActive}
                        className="px-3 py-1.5 bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:cursor-not-allowed"
                      />
                      <span className="text-gray-400">-</span>
                      <input
                        type="time"
                        value={daySettings.end}
                        onChange={(e) => updateWorkingHours(day.key, 'end', e.target.value)}
                        disabled={!daySettings.isActive}
                        className="px-3 py-1.5 bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* Notifications */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-[#111111] rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <Bell className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-white">Bildirimler</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">E-posta ve SMS ayarları</p>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-6">
            {/* Email Notifications */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">E-posta Bildirimleri</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Randevu onayı ve hatırlatıcılar</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notificationEmail}
                  onChange={(e) => setSettings(prev => ({ ...prev, notificationEmail: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500" />
              </label>
            </div>

            {/* SMS Notifications */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">SMS Bildirimleri</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Randevu hatırlatıcı SMS gönderimi</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notificationSMS}
                  onChange={(e) => setSettings(prev => ({ ...prev, notificationSMS: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500" />
              </label>
            </div>

            {/* Appointment Reminder Hours */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Randevu Hatırlatma Süresi (Saat Önce)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="1"
                  max="168"
                  value={settings.appointmentReminderHours}
                  onChange={(e) => setSettings(prev => ({ ...prev, appointmentReminderHours: parseInt(e.target.value) || 24 }))}
                  className="w-24 px-3 py-2 bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
                <span className="text-sm text-gray-500 dark:text-gray-400">saat önce</span>
              </div>
            </div>

            {/* Welcome Email */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">Yeni Hasta Karşılama</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">İlk kayıt olan hastalara hoş geldin e-postası</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.newPatientWelcomeEmail}
                  onChange={(e) => setSettings(prev => ({ ...prev, newPatientWelcomeEmail: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500" />
              </label>
            </div>
          </div>
        </motion.div>

        {/* Requirements */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-[#111111] rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-white">Gereksinimler</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Randevu için zorunlu alanlar</p>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-4">
            {/* Require Phone */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">Telefon Zorunlu</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Randevu alırken telefon numarası zorunlu olsun</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.requirePhone}
                  onChange={(e) => setSettings(prev => ({ ...prev, requirePhone: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500" />
              </label>
            </div>

            {/* Require Email */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">E-posta Zorunlu</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Randevu alırken e-posta adresi zorunlu olsun</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.requireEmail}
                  onChange={(e) => setSettings(prev => ({ ...prev, requireEmail: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500" />
              </label>
            </div>
          </div>
        </motion.div>
      </form>
    </div>
  );
}
