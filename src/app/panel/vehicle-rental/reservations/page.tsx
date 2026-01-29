'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Users, Search, Filter, CheckCircle, XCircle, Clock, Car, Edit2 } from 'lucide-react';
import { toast } from 'sonner';
import EditReservationModal from '@/components/vehicle-rental/EditReservationModal';

interface Reservation {
  id: string;
  vehicle_id: string;
  customer_name: string;
  customer_phone: string;
  start_date: string;
  end_date: string;
  total_days: number;
  total_amount: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  vehicle: {
    brand: string;
    model: string;
    plate: string;
  };
}

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    loadReservations();
  }, []);

  const loadReservations = async () => {
    try {
      const res = await fetch('/api/vehicle-rental/reservations');
      const data = await res.json();
      if (data.success) {
        setReservations(data.reservations || []);
      }
    } catch (error) {
      toast.error('Rezervasyonlar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch('/api/vehicle-rental/reservations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });

      if (res.ok) {
        toast.success('Durum güncellendi');
        loadReservations();
      }
    } catch (error) {
      toast.error('Güncelleme başarısız');
    }
  };

  const filteredReservations = reservations.filter(r => 
    filterStatus === 'all' || r.status === filterStatus
  );

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: { label: 'Bekliyor', className: 'bg-yellow-100 text-yellow-700' },
      confirmed: { label: 'Onaylandı', className: 'bg-green-100 text-green-700' },
      completed: { label: 'Tamamlandı', className: 'bg-blue-100 text-blue-700' },
      cancelled: { label: 'İptal', className: 'bg-red-100 text-red-700' },
    };
    return badges[status as keyof typeof badges] || badges.pending;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Rezervasyonlar</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{reservations.length} rezervasyon</p>
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
        >
          <option value="all">Tümü</option>
          <option value="pending">Bekliyor</option>
          <option value="confirmed">Onaylandı</option>
          <option value="completed">Tamamlandı</option>
          <option value="cancelled">İptal</option>
        </select>
      </div>

      {/* Reservations List */}
      <div className="space-y-3">
        {filteredReservations.length === 0 && (
          <div className="text-center py-16">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Rezervasyon bulunamadı</p>
          </div>
        )}

        {filteredReservations.map((reservation, index) => (
          <motion.div
            key={reservation.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Vehicle & Customer Info */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <Car className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {reservation.vehicle.brand} {reservation.vehicle.model}
                  </h3>
                  <p className="text-sm text-gray-500">{reservation.vehicle.plate}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {reservation.customer_name} • {reservation.customer_phone}
                  </p>
                </div>
              </div>

              {/* Dates & Price */}
              <div className="text-center md:text-right">
                <p className="text-sm text-gray-500">
                  {reservation.start_date} - {reservation.end_date}
                </p>
                <p className="text-sm text-gray-500">{reservation.total_days} gün</p>
                <p className="font-bold text-lg text-blue-600">₺{reservation.total_amount}</p>
              </div>

              {/* Status & Actions */}
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(reservation.status).className}`}>
                  {getStatusBadge(reservation.status).label}
                </span>

                <button
                  onClick={() => {
                    setEditingReservation(reservation);
                    setIsEditModalOpen(true);
                  }}
                  className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
                  title="Düzenle"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                
                {reservation.status === 'pending' && (
                  <>
                    <button
                      onClick={() => updateStatus(reservation.id, 'confirmed')}
                      className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200"
                      title="Onayla"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => updateStatus(reservation.id, 'cancelled')}
                      className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                      title="İptal"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </>
                )}
                
                {reservation.status === 'confirmed' && (
                  <button
                    onClick={() => updateStatus(reservation.id, 'completed')}
                    className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200"
                    title="Tamamlandı"
                  >
                    <Clock className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Edit Modal */}
      <EditReservationModal
        reservation={editingReservation}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingReservation(null);
        }}
        onSaved={loadReservations}
      />
    </div>
  );
}
