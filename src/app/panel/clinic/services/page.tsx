'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Plus, Edit, Trash2, Search, DollarSign, Clock, Stethoscope, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useBusinessSession } from '@/hooks/useBusinessSession';

interface Category {
  id: string;
  name: string;
  icon?: string;
}

interface Service {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  duration: number;
  images: string[];
  isActive: boolean;
  categoryId: string;
  categoryName?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface ServiceFormData {
  name: string;
  description: string;
  price: string;
  duration: string;
  categoryId: string;
  isActive: boolean;
  image?: string;
}

export default function ClinicServicesPage() {
  const { businessId, loading } = useBusinessSession();
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [formData, setFormData] = useState<ServiceFormData>({
    name: '',
    description: '',
    price: '',
    duration: '30',
    categoryId: '',
    isActive: true,
    image: '',
  });

  useEffect(() => {
    if (!businessId) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [servicesRes, categoriesRes] = await Promise.all([
          fetch('/api/clinic/services'),
          fetch('/api/clinic/categories'),
        ]);

        const [servicesData, categoriesData] = await Promise.all([
          servicesRes.json(),
          categoriesRes.json(),
        ]);

        if (servicesData.success) {
          setServices(servicesData.services || []);
        }
        if (categoriesData.success) {
          setCategories(categoriesData.categories || []);
        }
      } catch (error) {
        console.error('Veriler yüklenirken hata:', error);
        toast.error('Veriler yüklenemedi');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [businessId]);

  const filteredServices = services.filter(service =>
    service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    service.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const payload = {
        name: formData.name,
        description: formData.description || undefined,
        price: parseFloat(formData.price),
        durationMinutes: parseInt(formData.duration),
        categoryId: formData.categoryId,
        isActive: formData.isActive,
        imageUrl: formData.image || undefined,
        sortOrder: 0,
      };

      const url = editingService ? `/api/clinic/services/${editingService.id}` : '/api/clinic/services';
      const method = editingService ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(editingService ? 'Hizmet güncellendi' : 'Hizmet eklendi');
        setShowModal(false);
        setEditingService(null);
        setFormData({
          name: '',
          description: '',
          price: '',
          duration: '30',
          categoryId: '',
          isActive: true,
          image: '',
        });

        const updatedRes = await fetch('/api/clinic/services');
        const updatedData = await updatedRes.json();
        if (updatedData.success) {
          setServices(updatedData.services || []);
        }
      } else {
        toast.error(data.message || 'İşlem başarısız');
      }
    } catch (error) {
      console.error('İşlem hatası:', error);
      toast.error('Bir hata oluştu');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu hizmeti silmek istediğinize emin misiniz?')) return;

    try {
      const res = await fetch(`/api/clinic/services/${id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (data.success) {
        toast.success('Hizmet silindi');
        setServices(prev => prev.filter(s => s.id !== id));
      } else {
        toast.error(data.message || 'Silme başarısız');
      }
    } catch (error) {
      console.error('Silme hatası:', error);
      toast.error('Bir hata oluştu');
    }
  };

  const openEditModal = (service: Service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description || '',
      price: service.price.toString(),
      duration: service.duration.toString(),
      categoryId: service.categoryId,
      isActive: service.isActive,
      image: service.images[0] || '',
    });
    setShowModal(true);
  };

  const openCreateModal = () => {
    setEditingService(null);
    setFormData({
      name: '',
      description: '',
      price: '',
      duration: '30',
      categoryId: categories[0]?.id || '',
      isActive: true,
      image: '',
    });
    setShowModal(true);
  };

  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Hizmetler</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Klinik hizmetleri yönetimi</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all"
        >
          <Plus className="w-4 h-4" />
          Yeni Hizmet Ekle
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Hizmet ara..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
      </div>

      {filteredServices.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
          <div className="text-6xl mb-4">💉</div>
          <h3 className="text-xl font-semibold mb-2">Hizmet Bulunamadı</h3>
          <p className="text-gray-600 dark:text-gray-400">
            {searchQuery ? 'Arama kriterlerine uygun hizmet yok' : 'Henüz hizmet eklenmemiş'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredServices.map((service, index) => (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className={`p-6 bg-white dark:bg-gray-800 rounded-2xl border ${
                service.isActive ? 'border-gray-200 dark:border-gray-700' : 'border-gray-300 dark:border-gray-600 opacity-60'
              } hover:shadow-lg transition-shadow`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">{service.name}</h3>
                  {service.categoryName && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">{service.categoryName}</span>
                  )}
                </div>
                {!service.isActive && (
                  <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
                    Pasif
                  </span>
                )}
              </div>

              {service.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                  {service.description}
                </p>
              )}

              {service.images.length > 0 && (
                <div className="mb-4">
                  <img
                    src={service.images[0]}
                    alt={service.name}
                    className="w-full h-32 object-cover rounded-lg"
                  />
                </div>
              )}

              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="w-4 h-4 text-green-500" />
                  <span className="font-semibold text-green-600 dark:text-green-400">
                    ₺{service.price.toLocaleString('tr-TR')}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Clock className="w-4 h-4" />
                  <span>{service.duration} dk</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => openEditModal(service)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
                >
                  <Edit className="w-4 h-4" />
                  Düzenle
                </button>
                <button
                  onClick={() => handleDelete(service.id)}
                  className="flex items-center justify-center gap-2 px-3 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">
                {editingService ? 'Hizmet Düzenle' : 'Yeni Hizmet Ekle'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Trash2 className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Hizmet Adı *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Kategori *</label>
                <select
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500"
                  required
                >
                  <option value="">Kategori seçin</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Fiyat (₺) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Süre (dakika) *</label>
                  <input
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Açıklama</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Görsel URL</label>
                <input
                  type="url"
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                />
                <label htmlFor="isActive" className="text-sm">Aktif</label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all"
                >
                  {editingService ? 'Güncelle' : 'Ekle'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
