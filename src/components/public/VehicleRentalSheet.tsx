"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Car, Calendar, User, Phone, MessageCircle, ChevronLeft, Check, Loader2 } from "lucide-react";
import clsx from "clsx";

interface Vehicle {
  id: string;
  brand: string;
  model: string;
  year: number;
  daily_price: number;
  fuel_type: string;
  transmission: string;
  seats: number;
  images?: { url: string; is_primary: boolean }[];
}

interface VehicleRentalSheetProps {
  isOpen: boolean;
  businessSlug: string;
  businessName: string;
  whatsappNumber?: string;
  onClose: () => void;
}

export default function VehicleRentalSheet({
  isOpen,
  businessSlug,
  businessName,
  whatsappNumber,
  onClose,
}: VehicleRentalSheetProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<'list' | 'form'>('list');
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [days, setDays] = useState(1);
  const [formData, setFormData] = useState({ name: '', phone: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadVehicles();
    }
  }, [isOpen, businessSlug]);

  const loadVehicles = async () => {
    setLoading(true);
    try {
      // Use public API endpoint
      const res = await fetch(`/api/vehicle-rental/public-vehicles?businessSlug=${businessSlug}`);
      const data = await res.json();
      if (data.success) {
        setVehicles(data.vehicles || []);
      }
    } catch (error) {
      console.error('Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectVehicle = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setStep('form');
  };

  const handleSubmit = async () => {
    if (!selectedVehicle || !formData.name || !formData.phone || !selectedDate) return;

    setSubmitting(true);

    // Calculate end date
    const start = new Date(selectedDate);
    const end = new Date(start);
    end.setDate(start.getDate() + days - 1);

    const message = `Merhaba ${businessName}! 👋

Araç kiralama talebim var:

🚗 Araç: ${selectedVehicle.brand} ${selectedVehicle.model} (${selectedVehicle.year})
📅 Başlangıç: ${selectedDate}
📅 Bitiş: ${end.toISOString().split('T')[0]}
⏱️ Süre: ${days} gün
💰 Tahmini Tutar: ₺${(days * selectedVehicle.daily_price).toLocaleString()}

👤 Müşteri: ${formData.name}
📱 Telefon: ${formData.phone}

Onayınızı bekliyorum.`;

    const phone = whatsappNumber?.replace(/\D/g, '') || '';
    const url = `https://wa.me/${phone.startsWith('90') ? phone : '90' + phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');

    setSubmitting(false);
    onClose();
  };

  // Generate next 30 days
  const dates = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    return date.toISOString().split('T')[0];
  });

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="overflow-hidden w-full col-span-2 mt-4"
    >
      <div className="relative rounded-2xl overflow-hidden border border-purple-200/60 bg-white shadow-xl">
        {/* Header */}
        <div className="relative px-5 py-4 flex items-center justify-between border-b border-purple-100">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-purple-600 flex items-center justify-center text-white shadow-lg">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-lg">{businessName}</h3>
              <p className="text-xs text-purple-500 font-medium">Araç Kiralama</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:bg-purple-100 hover:text-purple-500 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="relative p-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-10 h-10 border-3 border-purple-500 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-sm text-purple-400 font-medium">Araçlar yükleniyor...</p>
            </div>
          ) : step === 'list' ? (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <h3 className="font-bold text-gray-900">Müsait Araçlar</h3>
                <p className="text-sm text-gray-500">Kiralamak istediğiniz aracı seçin</p>
              </div>

              {vehicles.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-3">
                    <Car className="w-8 h-8 text-purple-400" />
                  </div>
                  <p className="text-gray-500">Henüz araç eklenmemiş</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {vehicles.map((vehicle) => (
                    <button
                      key={vehicle.id}
                      onClick={() => handleSelectVehicle(vehicle)}
                      className="w-full p-4 bg-white border border-gray-200 rounded-xl flex items-center gap-3 hover:border-purple-400 hover:bg-purple-50/50 transition-all text-left"
                    >
                      <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                        <Car className="w-6 h-6 text-purple-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 truncate">
                          {vehicle.brand} {vehicle.model}
                        </h4>
                        <p className="text-sm text-gray-500">
                          {vehicle.year} • {vehicle.transmission === 'otomatik' ? 'Otomatik' : 'Manuel'} • {vehicle.seats} Koltuk
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-purple-600">₺{vehicle.daily_price}</p>
                        <p className="text-xs text-gray-400">/gün</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Back Button */}
              <button
                onClick={() => setStep('list')}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-purple-600 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Araç Listesine Dön
              </button>

              {/* Selected Vehicle */}
              {selectedVehicle && (
                <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                      <Car className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">
                        {selectedVehicle.brand} {selectedVehicle.model}
                      </h4>
                      <p className="text-sm text-purple-600 font-medium">
                        ₺{selectedVehicle.daily_price} / gün
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Date Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Başlangıç Tarihi
                </label>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {dates.map((date) => {
                    const dayName = new Date(date).toLocaleDateString('tr-TR', { weekday: 'short' });
                    const dayNum = new Date(date).getDate();
                    const isSelected = selectedDate === date;
                    
                    return (
                      <button
                        key={date}
                        onClick={() => setSelectedDate(date)}
                        className={clsx(
                          "flex-shrink-0 w-16 py-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all",
                          isSelected
                            ? "border-purple-600 bg-purple-600 text-white"
                            : "border-gray-200 bg-white text-gray-700 hover:border-purple-300"
                        )}
                      >
                        <span className="text-xs font-medium">{dayName}</span>
                        <span className="text-lg font-bold">{dayNum}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Days Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kaç Gün? <span className="text-gray-400">(Toplam: ₺{selectedVehicle ? (days * selectedVehicle.daily_price).toLocaleString() : 0})</span>
                </label>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setDays(Math.max(1, days - 1))}
                    className="w-10 h-10 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50"
                  >
                    -
                  </button>
                  <span className="text-xl font-bold w-8 text-center">{days}</span>
                  <button
                    onClick={() => setDays(days + 1)}
                    className="w-10 h-10 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Name Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ad Soyad <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Adınız Soyadınız"
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Phone Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Telefon <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="05XX XXX XX XX"
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                onClick={handleSubmit}
                disabled={!formData.name || !formData.phone || !selectedDate || submitting}
                className={clsx(
                  "w-full py-4 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all",
                  formData.name && formData.phone && selectedDate && !submitting
                    ? "bg-purple-600 hover:bg-purple-700 shadow-lg"
                    : "bg-gray-300 cursor-not-allowed"
                )}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Gönderiliyor...
                  </>
                ) : (
                  <>
                    <MessageCircle className="w-5 h-5" />
                    WhatsApp ile Gönder
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
