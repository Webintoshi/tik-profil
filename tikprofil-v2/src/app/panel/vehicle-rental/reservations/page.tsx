'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Users, Search, Filter, CheckCircle, XCircle, Clock, Car, Edit2 } from 'lucide-react';
import { toast } from 'sonner';
import EditReservationModal from '@/components/vehicle-rental/EditReservationModal';
import { VehicleRentalGuard } from '@/components/panel/VehicleRentalGuard';

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
  return (
    <VehicleRentalGuard>
      <ReservationsPageContent />
    </VehicleRentalGuard>
  );
}

function ReservationsPageContent() {
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
      pending: { label: 'Bekliyor', className: 'bg-gray-100 text-gray-700' },
      confirmed: { label: 'Onaylandı', className: 'bg-gray-200 text-gray-800' },
      completed: { label: 'Tamamlandı', className: 'bg-gray-300 text-gray-900' },
      cancelled: { label: 'İptal', className: 'bg-gray-400 text-white' },
    };
    return badges[status as keyof typeof badges] || badges.pending;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-gray-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Rezervasyonlar</h1>
          <p className="text-base text-gray-600 mt-2 font-semibold">{reservations.length} rezervasyon</p>
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm"
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
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-lg font-bold text-gray-700">Rezervasyon bulunamadı</p>
          </div>
        )}

        {filteredReservations.map((reservation, index) => (
          <motion.div
            key={reservation.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-white rounded-xl border border-gray-200 p-4"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Vehicle & Customer Info */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center">
                  <Car className="w-7 h-7 text-gray-700" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-gray-900">
                    {reservation.vehicle.brand} {reservation.vehicle.model}
                  </h3>
                  <p className="text-base font-semibold text-gray-600">{reservation.vehicle.plate}</p>
                  <p className="text-base font-bold text-gray-800 mt-2">
                    {reservation.customer_name} • <span className="font-semibold text-gray-600">{reservation.customer_phone}</span>
                  </p>
                </div>
              </div>

              {/* Dates & Price */}
              <div className="text-center md:text-right">
                <p className="text-base font-semibold text-gray-700">
                  {reservation.start_date} - {reservation.end_date}
                </p>
                <p className="text-sm font-bold text-gray-500 mt-1">{reservation.total_days} gün</p>
                <p className="font-extrabold text-2xl text-gray-900 mt-2">₺{reservation.total_amount}</p>
              </div>

              {/* Status & Actions */}
              <div className="flex items-center gap-3">
                <span className={`px-4 py-2 rounded-full text-sm font-bold ${getStatusBadge(reservation.status).className}`}>
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
