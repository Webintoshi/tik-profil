'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Car, Calendar, Users, DollarSign, Plus, TrendingUp, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface DashboardStats {
  totalVehicles: number;
  availableVehicles: number;
  rentedVehicles: number;
  maintenanceVehicles: number;
  todayPickups: number;
  todayReturns: number;
  monthlyRevenue: number;
  activeReservations: number;
}

export default function VehicleRentalDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalVehicles: 0,
    availableVehicles: 0,
    rentedVehicles: 0,
    maintenanceVehicles: 0,
    todayPickups: 0,
    todayReturns: 0,
    monthlyRevenue: 0,
    activeReservations: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [vehiclesRes, reservationsRes] = await Promise.all([
        fetch('/api/vehicle-rental/vehicles'),
        fetch('/api/vehicle-rental/reservations'),
      ]);

      const vehiclesData = await vehiclesRes.json();
      const reservationsData = await reservationsRes.json();

      if (vehiclesData.success) {
        const vehicles = vehiclesData.vehicles || [];
        setStats(prev => ({
          ...prev,
          totalVehicles: vehicles.length,
          availableVehicles: vehicles.filter((v: any) => v.status === 'available').length,
          rentedVehicles: vehicles.filter((v: any) => v.status === 'rented').length,
          maintenanceVehicles: vehicles.filter((v: any) => v.status === 'maintenance').length,
        }));
      }

      if (reservationsData.success) {
        const reservations = reservationsData.reservations || [];
        const today = new Date().toISOString().split('T')[0];
        
        setStats(prev => ({
          ...prev,
          activeReservations: reservations.filter((r: any) => r.status === 'confirmed').length,
          todayPickups: reservations.filter((r: any) => r.start_date === today).length,
          todayReturns: reservations.filter((r: any) => r.end_date === today).length,
          monthlyRevenue: reservations
            .filter((r: any) => r.status === 'completed' && r.created_at?.startsWith(today.slice(0, 7)))
            .reduce((sum: number, r: any) => sum + (r.total_amount || 0), 0),
        }));
      }
    } catch (error) {
      console.error('Stats load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { label: 'Toplam Araç', value: stats.totalVehicles, icon: Car, color: 'blue', link: '/panel/vehicle-rental/vehicles' },
    { label: 'Müsait', value: stats.availableVehicles, icon: Car, color: 'green', link: '/panel/vehicle-rental/vehicles' },
    { label: 'Kirada', value: stats.rentedVehicles, icon: Car, color: 'orange', link: '/panel/vehicle-rental/vehicles' },
    { label: 'Bakımda', value: stats.maintenanceVehicles, icon: AlertCircle, color: 'red', link: '/panel/vehicle-rental/vehicles' },
    { label: 'Bugün Alınacak', value: stats.todayPickups, icon: Calendar, color: 'purple', link: '/panel/vehicle-rental/calendar' },
    { label: 'Bugün Teslim', value: stats.todayReturns, icon: Calendar, color: 'pink', link: '/panel/vehicle-rental/calendar' },
    { label: 'Aktif Rezervasyon', value: stats.activeReservations, icon: Users, color: 'indigo', link: '/panel/vehicle-rental/reservations' },
    { label: 'Aylık Gelir', value: `₺${stats.monthlyRevenue.toLocaleString()}`, icon: DollarSign, color: 'emerald', link: '/panel/vehicle-rental/reservations' },
  ];

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Araç Kiralama</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Tüm araçlarınızı ve rezervasyonlarınızı yönetin</p>
        </div>
        <Link
          href="/panel/vehicle-rental/vehicles/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Yeni Araç
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Link href={stat.link}>
              <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                  <div className={`p-2 bg-${stat.color}-100 dark:bg-${stat.color}-900/30 rounded-lg`}>
                    <stat.icon className={`w-5 h-5 text-${stat.color}-600`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/panel/vehicle-rental/vehicles">
          <div className="p-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl text-white hover:shadow-lg transition-shadow">
            <Car className="w-8 h-8 mb-3" />
            <h3 className="font-bold text-lg">Araçları Yönet</h3>
            <p className="text-blue-100 text-sm">Tüm araçlarınızı görüntüleyin ve düzenleyin</p>
          </div>
        </Link>
        
        <Link href="/panel/vehicle-rental/reservations">
          <div className="p-6 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl text-white hover:shadow-lg transition-shadow">
            <Calendar className="w-8 h-8 mb-3" />
            <h3 className="font-bold text-lg">Rezervasyonlar</h3>
            <p className="text-purple-100 text-sm">Rezervasyonları görüntüleyin ve yönetin</p>
          </div>
        </Link>
        
        <Link href="/panel/vehicle-rental/calendar">
          <div className="p-6 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl text-white hover:shadow-lg transition-shadow">
            <TrendingUp className="w-8 h-8 mb-3" />
            <h3 className="font-bold text-lg">Takvim</h3>
            <p className="text-emerald-100 text-sm">Müsaitlik takvimini görüntüleyin</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
