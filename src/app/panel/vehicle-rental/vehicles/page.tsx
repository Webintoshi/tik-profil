'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Car, Plus, Search, Filter, Edit2, Trash2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from 'sonner';

interface Vehicle {
  id: string;
  brand: string;
  model: string;
  year: number;
  plate: string;
  color: string;
  fuel_type: string;
  transmission: string;
  seats: number;
  daily_price: number;
  deposit_amount: number;
  status: 'available' | 'rented' | 'maintenance';
  description?: string;
  category?: { name: string };
  images?: { url: string; is_primary: boolean }[];
}

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    loadVehicles();
  }, []);

  const loadVehicles = async () => {
    try {
      const res = await fetch('/api/vehicle-rental/vehicles');
      const data = await res.json();
      if (data.success) {
        setVehicles(data.vehicles || []);
      }
    } catch (error) {
      console.error('Load error:', error);
      toast.error('Araçlar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu aracı silmek istediğinize emin misiniz?')) return;

    try {
      const res = await fetch(`/api/vehicle-rental/vehicles?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success('Araç silindi');
        loadVehicles();
      } else {
        toast.error('Silme başarısız');
      }
    } catch (error) {
      toast.error('Bir hata oluştu');
    }
  };

  const filteredVehicles = vehicles.filter(vehicle => {
    const matchesSearch = 
      vehicle.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vehicle.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vehicle.plate.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || vehicle.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const badges = {
      available: { label: 'Müsait', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
      rented: { label: 'Kirada', className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
      maintenance: { label: 'Bakımda', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
    };
    return badges[status as keyof typeof badges] || badges.available;
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Araçlarım</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{vehicles.length} araç</p>
        </div>
        <Link
          href="/panel/vehicle-rental/vehicles/new"
          className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Yeni Araç Ekle
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Araç ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
        >
          <option value="all">Tümü</option>
          <option value="available">Müsait</option>
          <option value="rented">Kirada</option>
          <option value="maintenance">Bakımda</option>
        </select>
      </div>

      {/* Empty State */}
      {filteredVehicles.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Car className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">Araç bulunamadı</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {searchQuery ? 'Arama kriterlerine uygun araç yok' : 'Henüz araç eklenmemiş'}
          </p>
          {!searchQuery && (
            <Link
              href="/panel/vehicle-rental/vehicles/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              İlk Aracını Ekle
            </Link>
          )}
        </div>
      )}

      {/* Vehicles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredVehicles.map((vehicle, index) => (
          <motion.div
            key={vehicle.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow"
          >
            {/* Image */}
            <div className="relative h-40 bg-gray-100 dark:bg-gray-700">
              {vehicle.images && vehicle.images.length > 0 ? (
                <Image
                  src={vehicle.images.find(img => img.is_primary)?.url || vehicle.images[0].url}
                  alt={`${vehicle.brand} ${vehicle.model}`}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Car className="w-12 h-12 text-gray-300" />
                </div>
              )}
              <div className="absolute top-3 left-3">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(vehicle.status).className}`}>
                  {getStatusBadge(vehicle.status).label}
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">{vehicle.brand} {vehicle.model}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{vehicle.year} • {vehicle.plate}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-blue-600 dark:text-blue-400">₺{vehicle.daily_price}</p>
                  <p className="text-xs text-gray-400">/gün</p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-4">
                <span>{vehicle.fuel_type === 'benzin' ? 'Benzin' : vehicle.fuel_type === 'dizel' ? 'Dizel' : vehicle.fuel_type}</span>
                <span>•</span>
                <span>{vehicle.transmission === 'otomatik' ? 'Otomatik' : 'Manuel'}</span>
                <span>•</span>
                <span>{vehicle.seats} Koltuk</span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {/* Edit logic */}}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm"
                >
                  <Edit2 className="w-4 h-4" />
                  Düzenle
                </button>
                <button
                  onClick={() => handleDelete(vehicle.id)}
                  className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
