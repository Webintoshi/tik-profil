'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Car, ChevronLeft, Upload, X, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { VEHICLE_BRANDS, VEHICLE_COLORS, FUEL_TYPES, TRANSMISSION_TYPES } from '@/lib/vehicleData';

export default function NewVehiclePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [formData, setFormData] = useState({
    brand: '',
    model: '',
    year: new Date().getFullYear(),
    plate: '',
    fuelType: 'benzin',
    transmission: 'otomatik',
    seats: 5,
    color: 'Beyaz',
    dailyPrice: '',
    depositAmount: '',
    description: '',
  });

  const selectedBrandData = VEHICLE_BRANDS.find(b => b.brand === selectedBrand);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create vehicle
      const res = await fetch('/api/vehicle-rental/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand: formData.brand,
          model: formData.model,
          year: formData.year,
          plate: formData.plate,
          fuelType: formData.fuelType,
          transmission: formData.transmission,
          seats: formData.seats,
          color: formData.color,
          dailyPrice: parseFloat(formData.dailyPrice),
          depositAmount: parseFloat(formData.depositAmount) || 0,
          description: formData.description,
        }),
      });

      const data = await res.json();

      if (data.success) {
        // Upload images if any
        if (images.length > 0 && data.vehicle?.id) {
          await uploadImages(data.vehicle.id);
        }

        toast.success('Araç başarıyla eklendi');
        router.push('/panel/vehicle-rental/vehicles');
      } else {
        toast.error(data.error || 'Ekleme başarısız');
      }
    } catch (error) {
      toast.error('Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const uploadImages = async (vehicleId: string) => {
    for (let i = 0; i < images.length; i++) {
      const file = images[i];
      const formData = new FormData();
      formData.append('file', file);
      formData.append('vehicleId', vehicleId);
      formData.append('isPrimary', i === 0 ? 'true' : 'false');

      await fetch('/api/vehicle-rental/upload', {
        method: 'POST',
        body: formData,
      });
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setImages([...images, ...Array.from(e.target.files)]);
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/panel/vehicle-rental/vehicles"
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Yeni Araç Ekle</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Araç bilgilerini girin</p>
        </div>
      </div>

      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSubmit}
        className="space-y-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6"
      >
        {/* 1. Marka */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Marka <span className="text-red-500">*</span>
          </label>
          <select
            required
            value={selectedBrand}
            onChange={(e) => {
              setSelectedBrand(e.target.value);
              setFormData({ ...formData, brand: e.target.value, model: '' });
            }}
            className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg"
          >
            <option value="">Marka seçin</option>
            {VEHICLE_BRANDS.map((b) => (
              <option key={b.brand} value={b.brand}>{b.brand}</option>
            ))}
          </select>
        </div>

        {/* 2. Model */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Model <span className="text-red-500">*</span>
          </label>
          <select
            required
            value={formData.model}
            onChange={(e) => setFormData({ ...formData, model: e.target.value })}
            disabled={!selectedBrand}
            className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-50"
          >
            <option value="">Model seçin</option>
            {selectedBrandData?.models.map((model) => (
              <option key={model} value={model}>{model}</option>
            ))}
          </select>
        </div>

        {/* 3. Yıl */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Yıl <span className="text-red-500">*</span>
          </label>
          <select
            required
            value={formData.year}
            onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
            className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg"
          >
            {Array.from({ length: 25 }, (_, i) => new Date().getFullYear() - i).map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>

        {/* 4. Plaka */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Plaka <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="34 ABC 123"
            value={formData.plate}
            onChange={(e) => setFormData({ ...formData, plate: e.target.value.toUpperCase() })}
            className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg uppercase"
          />
        </div>

        {/* 5. Günlük Fiyat */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Günlük Fiyat (₺) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            required
            min="0"
            placeholder="750"
            value={formData.dailyPrice}
            onChange={(e) => setFormData({ ...formData, dailyPrice: e.target.value })}
            className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg"
          />
        </div>

        {/* Ek Bilgiler (Opsiyonel) */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Yakıt</label>
            <select
              value={formData.fuelType}
              onChange={(e) => setFormData({ ...formData, fuelType: e.target.value })}
              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg"
            >
              {FUEL_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Vites</label>
            <select
              value={formData.transmission}
              onChange={(e) => setFormData({ ...formData, transmission: e.target.value })}
              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg"
            >
              {TRANSMISSION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 6. Fotoğraflar */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Fotoğraflar</label>
          <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageChange}
              className="hidden"
              id="vehicle-images"
            />
            <label
              htmlFor="vehicle-images"
              className="flex flex-col items-center justify-center cursor-pointer py-4"
            >
              <Upload className="w-8 h-8 text-gray-400 mb-2" />
              <span className="text-sm text-gray-500">Fotoğraf yüklemek için tıklayın</span>
            </label>
          </div>
          
          {/* Image Preview */}
          {images.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {images.map((file, index) => (
                <div key={index} className="relative">
                  <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Car className="w-8 h-8 text-gray-400" />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute -top-1 -right-1 p-1 bg-red-500 text-white rounded-full"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-3 pt-4">
          <Link
            href="/panel/vehicle-rental/vehicles"
            className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-center"
          >
            İptal
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Kaydediliyor...
              </>
            ) : (
              'Kaydet'
            )}
          </button>
        </div>
      </motion.form>
    </div>
  );
}
