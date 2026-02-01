'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Car } from 'lucide-react';
import { VehicleRentalGuard } from '@/components/panel/VehicleRentalGuard';

interface Reservation {
  id: string;
  vehicle_id: string;
  start_date: string;
  end_date: string;
  customer_name: string;
  status: string;
  vehicle: {
    brand: string;
    model: string;
    plate: string;
  };
}

export default function CalendarPage() {
  return (
    <VehicleRentalGuard>
      <CalendarPageContent />
    </VehicleRentalGuard>
  );
}

function CalendarPageContent() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [reservations, setReservations] = useState<Reservation[]>([]);

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
      console.error('Load error:', error);
    }
  };

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getReservationsForDate = (dateStr: string) => {
    return reservations.filter(r => {
      const start = new Date(r.start_date);
      const end = new Date(r.end_date);
      const check = new Date(dateStr);
      return check >= start && check <= end;
    });
  };

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const monthName = currentDate.toLocaleString('tr-TR', { month: 'long', year: 'numeric' });

  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Müsaitlik Takvimi</h1>
          <p className="text-base text-gray-600 mt-2 font-semibold">Araç rezervasyon takvimi</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="font-medium min-w-[140px] text-center">{monthName}</span>
          <button
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 border-b border-gray-200">
          {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map((day) => (
            <div key={day} className="p-4 text-center text-base font-bold text-gray-700">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7">
          {days.map((day, index) => {
            if (day === null) {
              return <div key={`empty-${index}`} className="min-h-[100px] border-b border-r border-gray-100" />;
            }

            const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayReservations = getReservationsForDate(dateStr);
            const isToday = new Date().toISOString().split('T')[0] === dateStr;

            return (
              <div
                key={day}
                className={`min-h-[100px] p-2 border-b border-r border-gray-100 ${
                  isToday ? 'bg-gray-50' : ''
                }`}
              >
                <span className={`text-base font-extrabold ${isToday ? 'text-gray-900' : 'text-gray-800'}`}>
                  {day}
                </span>
                
                {dayReservations.length > 0 && (
                  <div className="mt-1 space-y-1">
                    {dayReservations.slice(0, 3).map((res) => (
                      <div
                        key={res.id}
                        className="text-xs font-bold p-1.5 bg-gray-200 text-gray-800 rounded truncate"
                      >
                        {res.vehicle.plate}
                      </div>
                    ))}
                    {dayReservations.length > 3 && (
                      <div className="text-xs font-bold text-gray-600">+{dayReservations.length - 3} daha</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-base font-semibold">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-100 rounded" />
          <span className="text-gray-700">Bugün</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-200 rounded" />
          <span className="text-gray-700">Dolu</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-white border border-gray-200 rounded" />
          <span className="text-gray-700">Boş</span>
        </div>
      </div>
    </div>
  );
}
