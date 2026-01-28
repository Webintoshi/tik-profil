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
  const { session, isLoading: sessionLoading } = useBusinessSession();
  const businessId = session?.businessId;
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!businessId) {
      setIsLoading(false);
      return;
    }

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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white transition-colors">Hastalar</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 transition-colors">Hasta yönetimi</p>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400 transition-colors">
          Toplam {patients.length} hasta
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500 transition-colors" />
        <input
          type="text"
          placeholder="İsim, telefon veya e-posta ile ara..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-white dark:bg-[#111111] border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 transition-colors"
        />
      </div>

      {filteredPatients.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-[#111111] rounded-xl border border-gray-200 dark:border-gray-800 transition-all">
          <div className="text-6xl mb-4">👥</div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white transition-colors mb-2">Hasta Bulunamadı</h3>
          <p className="text-gray-600 dark:text-gray-400 transition-colors">
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
              className="p-6 bg-white dark:bg-[#111111] rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-900/30 dark:to-emerald-800/20 rounded-xl flex items-center justify-center text-xl text-emerald-600 dark:text-emerald-400 transition-colors">
                  {patient.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white transition-colors mb-1">{patient.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 transition-colors">
                    <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full text-xs transition-colors">
                      {patient.totalAppointments} randevu
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                {patient.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 transition-colors">
                    <Phone className="w-4 h-4 text-gray-400 dark:text-gray-500 transition-colors" />
                    <span>{patient.phone}</span>
                  </div>
                )}
                {patient.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 transition-colors">
                    <Mail className="w-4 h-4 text-gray-400 dark:text-gray-500 transition-colors" />
                    <span className="truncate">{patient.email}</span>
                  </div>
                )}
                {patient.dateOfBirth && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 transition-colors">
                    <Calendar className="w-4 h-4 text-gray-400 dark:text-gray-500 transition-colors" />
                    <span>Doğum Tarihi: {new Date(patient.dateOfBirth).toLocaleDateString('tr-TR')}</span>
                  </div>
                )}
                {patient.bloodType && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 transition-colors">
                    <User className="w-4 h-4 text-gray-400 dark:text-gray-500 transition-colors" />
                    <span>Kan Grubu: {patient.bloodType}</span>
                  </div>
                )}
              </div>

              {patient.lastAppointment && (
                <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg mb-4 transition-colors">
                  <div className="text-xs text-gray-500 dark:text-gray-400 transition-colors mb-1">Son Randevu</div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white transition-colors">
                    {new Date(patient.lastAppointment).toLocaleDateString('tr-TR')}
                  </div>
                </div>
              )}

              {patient.notes && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg transition-colors">
                  <div className="flex items-start gap-2">
                    <FileText className="w-4 h-4 text-emerald-500 mt-0.5" />
                    <p className="text-sm text-gray-600 dark:text-gray-400 transition-colors line-clamp-2">
                      {patient.notes}
                    </p>
                  </div>
                </div>
              )}

              <div className="mt-4 text-xs text-gray-400 dark:text-gray-500 transition-colors">
                Kayıt Tarihi: {new Date(patient.createdAt).toLocaleDateString('tr-TR')}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
