'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Car, ChevronLeft, Save, Loader2, Trash2, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { VEHICLE_BRANDS, VEHICLE_COLORS, FUEL_TYPES, TRANSMISSION_TYPES } from '@/lib/vehicleData';
import Image from 'next/image';

interface Vehicle {
  id: string;
  brand: string;
  model: string;
  year: number;
  plate: string;
  fuel_type: string;
  transmission: string;
  seats: number;
  color: string;
  daily_price: number;
  deposit_amount: number;
  status: 'available' | 'rented' | 'maintenance';
  description?: string;
  images?: { id: string; url: string; is_primary: boolean }[];
}

export default function EditVehiclePage() {
  const router = useRouter();
  const params = useParams();
  const vehicleId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState('');
  const [newImages, setNewImages] = useState<File[]>([]);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);

  useEffect(() => {
    loadVehicle();
  }, [vehicleId]);

  const loadVehicle = async () => {
    try {
      const res = await fetch('/api/vehicle-rental/vehicles');
      const data = await res.json();
      if (data.success) {
        const found = data.vehicles.find((v: Vehicle) => v.id === vehicleId);
        if (found) {
          setVehicle(found);
          setSelectedBrand(found.brand);
        } else {
          toast.error('Araç bulunamadı');
          router.push('/panel/vehicle-rental/vehicles');
        }
      }
    } catch (error) {
      toast.error('Yükleme hatası');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicle) return;

    setSaving(true);
    try {
      const res = await fetch('/api/vehicle-rental/vehicles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: vehicleId,
          brand: vehicle.brand,
          model: vehicle.model,
          year: vehicle.year,
          plate: vehicle.plate,
          fuelType: vehicle.fuel_type,
          transmission: vehicle.transmission,
          seats: vehicle.seats,
          color: vehicle.color,
          dailyPrice: vehicle.daily_price,
          depositAmount: vehicle.deposit_amount,
          status: vehicle.status,
          description: vehicle.description,
        }),
      });

      const data = await res.json();

      if (data.success) {
        // Upload new images if any
        if (newImages.length > 0) {
          for (let i = 0; i < newImages.length; i++) {
            const formData = new FormData();
            formData.append('file', newImages[i]);
            formData.append('vehicleId', vehicleId);
            formData.append('isPrimary', vehicle.images?.length === 0 && i === 0 ? 'true' : 'false');

            await fetch('/api/vehicle-rental/upload', {
              method: 'POST',
              body: formData,
            });
          }
        }

        toast.success('Araç güncellendi');
        router.push('/panel/vehicle-rental/vehicles');
      } else {
        toast.error(data.error || 'Güncelleme başarısız');
      }
    } catch (error) {
      toast.error('Bir hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!confirm('Bu fotoğrafı silmek istediğinize emin misiniz?')) return;

    try {
      const res = await fetch(`/api/vehicle-rental/upload?id=${imageId}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Fotoğraf silindi');
        loadVehicle();
      }
    } catch (error) {
      toast.error('Silme başarısız');
    }
  };

  const handleSetPrimary = async (imageId: string) => {
    try {
      // First unset all primaries
      await fetch('/api/vehicle-rental/vehicles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: vehicleId }), // Trigger refresh
      });
      
      toast.success('Ana fotoğraf güncellendi');
      loadVehicle();
    } catch (error) {
      toast.error('Güncelleme başarısız');
    }
  };

  const selectedBrandData = VEHICLE_BRANDS.find(b => b.brand === selectedBrand);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!vehicle) return null;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/panel/vehicle-rental/vehicles" className="p-2 hover:bg-gray-100 rounded-lg">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Araç Düzenle</h1>
          <p className="text-sm text-gray-500">{vehicle.brand} {vehicle.model} - {vehicle.plate}</p>
        </div>
      </div>

      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSubmit}
        className="space-y-6 bg-white rounded-xl border border-gray-200 p-6"
      >
        {/* Status Alert */}
        {vehicle.status === 'rented' && (
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            <p className="text-sm text-orange-700">Bu araç şu anda kirada. Bazı alanlar değiştirilemez.</p>
          </div>
        )}

        {/* Marka */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Marka *</label>
          <select
            required
            value={selectedBrand}
            onChange={(e) => {
              setSelectedBrand(e.target.value);
              setVehicle({ ...vehicle, brand: e.target.value, model: '' });
            }}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg"
          >
            <option value="">Marka seçin</option>
            {VEHICLE_BRANDS.map((b) => (
              <option key={b.brand} value={b.brand}>{b.brand}</option>
            ))}
          </select>
        </div>

        {/* Model */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Model *</label>
          <select
            required
            value={vehicle.model}
            onChange={(e) => setVehicle({ ...vehicle, model: e.target.value })}
            disabled={!selectedBrand}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg disabled:opacity-50"
          >
            <option value="">Model seçin</option>
            {selectedBrandData?.models.map((model) => (
              <option key={model} value={model}>{model}</option>
            ))}
          </select>
        </div>

        {/* Yıl & Plaka */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Yıl *</label>
            <select
              required
              value={vehicle.year}
              onChange={(e) => setVehicle({ ...vehicle, year: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
            >
              {Array.from({ length: 25 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Plaka *</label>
            <input
              type="text"
              required
              value={vehicle.plate}
              onChange={(e) => setVehicle({ ...vehicle, plate: e.target.value.toUpperCase() })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg uppercase"
            />
          </div>
        </div>

        {/* Fiyat & Depozito */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Günlük Fiyat (₺) *</label>
            <input
              type="number"
              required
              min="0"
              value={vehicle.daily_price}
              onChange={(e) => setVehicle({ ...vehicle, daily_price: parseFloat(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Depozito (₺)</label>
            <input
              type="number"
              min="0"
              value={vehicle.deposit_amount}
              onChange={(e) => setVehicle({ ...vehicle, deposit_amount: parseFloat(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
            />
          </div>
        </div>

        {/* Durum */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Durum</label>
          <select
            value={vehicle.status}
            onChange={(e) => setVehicle({ ...vehicle, status: e.target.value as any })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg"
          >
            <option value="available">Müsait</option>
            <option value="rented">Kirada</option>
            <option value="maintenance">Bakımda</option>
          </select>
        </div>

        {/* Özellikler */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Yakıt</label>
            <select
              value={vehicle.fuel_type}
              onChange={(e) => setVehicle({ ...vehicle, fuel_type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
            >
              {FUEL_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Vites</label>
            <select
              value={vehicle.transmission}
              onChange={(e) => setVehicle({ ...vehicle, transmission: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
            >
              {TRANSMISSION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Mevcut Fotoğraflar */}
        {vehicle.images && vehicle.images.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Mevcut Fotoğraflar</label>
            <div className="flex flex-wrap gap-2">
              {vehicle.images.map((image) => (
                <div key={image.id} className="relative">
                  <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100">
                    <Image
                      src={image.url}
                      alt="Vehicle"
                      width={80}
                      height={80}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {image.is_primary && (
                    <span className="absolute top-1 left-1 px-1.5 py-0.5 bg-blue-500 text-white text-xs rounded">Ana</span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDeleteImage(image.id)}
                    className="absolute -top-1 -right-1 p-1 bg-red-500 text-white rounded-full"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Yeni Fotoğraf Ekle */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Yeni Fotoğraf Ekle</label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setNewImages(Array.from(e.target.files || []))}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg"
          />
          {newImages.length > 0 && (
            <p className="text-sm text-gray-500 mt-1">{newImages.length} fotoğraf seçildi</p>
          )}
        </div>

        {/* Butonlar */}
        <div className="flex items-center gap-3 pt-4">
          <Link
            href="/panel/vehicle-rental/vehicles"
            className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 text-center"
          >
            İptal
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Kaydet
          </button>
        </div>
      </motion.form>
    </div>
  );
}
