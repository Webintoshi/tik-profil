'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Search, Phone, Mail, Calendar, User, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { useBusinessSession } from '@/hooks/useBusinessSession';

interface Patient {
  id: string;
  name: string;
  phone: string;
  email?: string;
  dateOfBirth?: string;
  bloodType?: string;
  notes?: string;
  totalAppointments: number;
  lastAppointment?: string;
  createdAt: string;
}

export default function ClinicPatientsPage() {
  const { businessId, loading } = useBusinessSession();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!businessId) return;

    const fetchPatients = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({ search: searchQuery });
        const res = await fetch(`/api/clinic/patients?${params}`);
        const data = await res.json();

        if (data.success) {
          setPatients(data.patients || []);
        } else {
          toast.error('Hastalar yüklenemedi');
        }
      } catch (error) {
        console.error('Hastalar yüklenirken hata:', error);
        toast.error('Bir hata oluştu');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPatients();
  }, [businessId, searchQuery]);

  const filteredPatients = patients;

  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Hastalar</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Hasta yönetimi</p>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Toplam {patients.length} hasta
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="İsim, telefon veya e-posta ile ara..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
      </div>

      {filteredPatients.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
          <div className="text-6xl mb-4">👥</div>
          <h3 className="text-xl font-semibold mb-2">Hasta Bulunamadı</h3>
          <p className="text-gray-600 dark:text-gray-400">
            {searchQuery ? 'Arama kriterlerine uygun hasta yok' : 'Henüz hasta kaydı yok'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPatients.map((patient, index) => (
            <motion.div
              key={patient.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className="p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl flex items-center justify-center text-xl">
                  {patient.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">{patient.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full text-xs">
                      {patient.totalAppointments} randevu
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                {patient.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Phone className="w-4 h-4" />
                    <span>{patient.phone}</span>
                  </div>
                )}
                {patient.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Mail className="w-4 h-4" />
                    <span className="truncate">{patient.email}</span>
                  </div>
                )}
                {patient.dateOfBirth && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Calendar className="w-4 h-4" />
                    <span>Doğum Tarihi: {new Date(patient.dateOfBirth).toLocaleDateString('tr-TR')}</span>
                  </div>
                )}
                {patient.bloodType && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <User className="w-4 h-4" />
                    <span>Kan Grubu: {patient.bloodType}</span>
                  </div>
                )}
              </div>

              {patient.lastAppointment && (
                <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg mb-4">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Son Randevu</div>
                  <div className="text-sm font-medium">
                    {new Date(patient.lastAppointment).toLocaleDateString('tr-TR')}
                  </div>
                </div>
              )}

              {patient.notes && (
                <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <div className="flex items-start gap-2">
                    <FileText className="w-4 h-4 text-purple-500 mt-0.5" />
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                      {patient.notes}
                    </p>
                  </div>
                </div>
              )}

              <div className="mt-4 text-xs text-gray-400 dark:text-gray-500">
                Kayıt Tarihi: {new Date(patient.createdAt).toLocaleDateString('tr-TR')}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
