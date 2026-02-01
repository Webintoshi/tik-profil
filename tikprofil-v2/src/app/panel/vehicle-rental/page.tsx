'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Car, Calendar, Users, DollarSign, Plus, TrendingUp, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { VehicleRentalGuard } from '@/components/panel/VehicleRentalGuard';

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
  return (
    <VehicleRentalGuard>
      <DashboardContent />
    </VehicleRentalGuard>
  );
}

function DashboardContent() {
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

  // Module authorization check
  useEffect(() => {
    const checkModuleAccess = async () => {
      try {
        const res = await fetch('/api/panel/profile');
        const data = await res.json();
        
        if (data.success && data.profile) {
          const modules = data.profile.modules || [];
          const hasAccess = modules.some((m: string) => VEHICLE_RENTAL_MODULES.includes(m.toLowerCase()));
          
          if (!hasAccess) {
            router.push('/panel');
            return;
          }
          setIsAuthorized(true);
          loadStats();
        } else {
          router.push('/panel');
        }
      } catch (error) {
        console.error('Module check error:', error);
        router.push('/panel');
      }
    };
    
    checkModuleAccess();
  }, [router]);

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
    { label: 'Toplam Araç', value: stats.totalVehicles, icon: Car, link: '/panel/vehicle-rental/vehicles' },
    { label: 'Müsait', value: stats.availableVehicles, icon: Car, link: '/panel/vehicle-rental/vehicles' },
    { label: 'Kirada', value: stats.rentedVehicles, icon: Car, link: '/panel/vehicle-rental/vehicles' },
    { label: 'Bakımda', value: stats.maintenanceVehicles, icon: AlertCircle, link: '/panel/vehicle-rental/vehicles' },
    { label: 'Bugün Alınacak', value: stats.todayPickups, icon: Calendar, link: '/panel/vehicle-rental/calendar' },
    { label: 'Bugün Teslim', value: stats.todayReturns, icon: Calendar, link: '/panel/vehicle-rental/calendar' },
    { label: 'Aktif Rezervasyon', value: stats.activeReservations, icon: Users, link: '/panel/vehicle-rental/reservations' },
    { label: 'Aylık Gelir', value: `₺${stats.monthlyRevenue.toLocaleString()}`, icon: DollarSign, link: '/panel/vehicle-rental/reservations' },
  ];

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Araç Kiralama</h1>
          <p className="text-base text-gray-600 mt-2 font-medium">Tüm araçlarınızı ve rezervasyonlarınızı yönetin</p>
        </div>
        <Link
          href="/panel/vehicle-rental/vehicles/new"
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
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
              <div className="p-4 bg-white rounded-xl border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <stat.icon className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    <p className="text-xs text-gray-500">{stat.label}</p>
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
          <div className="p-6 bg-white border border-gray-200 rounded-xl hover:shadow-lg transition-shadow">
            <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center mb-4">
              <Car className="w-7 h-7 text-gray-800" />
            </div>
            <h3 className="font-bold text-xl text-gray-900">Araçları Yönet</h3>
            <p className="text-gray-600 text-base font-medium mt-1">Tüm araçlarınızı görüntüleyin ve düzenleyin</p>
          </div>
        </Link>
        
        <Link href="/panel/vehicle-rental/reservations">
          <div className="p-6 bg-white border border-gray-200 rounded-xl hover:shadow-lg transition-shadow">
            <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center mb-4">
              <Calendar className="w-7 h-7 text-gray-800" />
            </div>
            <h3 className="font-bold text-xl text-gray-900">Rezervasyonlar</h3>
            <p className="text-gray-600 text-base font-medium mt-1">Rezervasyonları görüntüleyin ve yönetin</p>
          </div>
        </Link>
        
        <Link href="/panel/vehicle-rental/calendar">
          <div className="p-6 bg-white border border-gray-200 rounded-xl hover:shadow-lg transition-shadow">
            <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center mb-4">
              <TrendingUp className="w-7 h-7 text-gray-800" />
            </div>
            <h3 className="font-bold text-xl text-gray-900">Takvim</h3>
            <p className="text-gray-600 text-base font-medium mt-1">Müsaitlik takvimini görüntüleyin</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
