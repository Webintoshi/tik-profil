'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Plus, Edit, Trash2, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import { useBusinessSession } from '@/hooks/useBusinessSession';

interface Category {
  id: string;
  name: string;
  nameEn?: string;
  icon?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CategoryFormData {
  name: string;
  nameEn: string;
  icon: string;
  isActive: boolean;
}

const iconOptions = [
  { value: '🏥', label: 'Hastane' },
  { value: '🦷', label: 'Diş' },
  { value: '👁️', label: 'Göz' },
  { value: '🩺', label: 'Genel' },
  { value: '🧬', label: 'Laboratuvar' },
  { value: '💉', label: 'Aşı' },
  { value: '🧠', label: 'Nöroloji' },
  { value: '❤️', label: 'Kardiyoloji' },
  { value: '🦴', label: 'Ortopedi' },
  { value: '🤰', label: 'Kadın Doğum' },
  { value: '👶', label: 'Pediatri' },
  { value: '🎯', label: 'Cildiye' },
  { value: '🩹', label: 'Cerrahi' },
  { value: '🌡️', label: 'İç Hastalıkları' },
  { value: '🧪', label: 'Patoloji' },
  { value: '🔬', label: 'Radyoloji' },
  { value: '💊', label: 'Eczane' },
  { value: '🚑', label: 'Acil' },
  { value: '🧘', label: 'Fizyoterapi' },
  { value: '👂', label: 'KBB' },
];

export default function ClinicCategoriesPage() {
  const { businessId, loading } = useBusinessSession();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    nameEn: '',
    icon: '🏥',
    isActive: true,
  });

  useEffect(() => {
    if (!businessId) return;

    const fetchCategories = async () => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/clinic/categories');
        const data = await res.json();

        if (data.success) {
          setCategories(data.categories || []);
        } else {
          toast.error('Kategoriler yüklenemedi');
        }
      } catch (error) {
        console.error('Kategoriler yüklenirken hata:', error);
        toast.error('Bir hata oluştu');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategories();
  }, [businessId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const payload = {
        name: formData.name,
        nameEn: formData.nameEn || undefined,
        icon: formData.icon,
        isActive: formData.isActive,
        sortOrder: 0,
      };

      const url = editingCategory ? `/api/clinic/categories/${editingCategory.id}` : '/api/clinic/categories';
      const method = editingCategory ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(editingCategory ? 'Kategori güncellendi' : 'Kategori eklendi');
        setShowModal(false);
        setEditingCategory(null);
        setFormData({
          name: '',
          nameEn: '',
          icon: '🏥',
          isActive: true,
        });

        const updatedRes = await fetch('/api/clinic/categories');
        const updatedData = await updatedRes.json();
        if (updatedData.success) {
          setCategories(updatedData.categories || []);
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
    if (!confirm('Bu kategoriyi silmek istediğinize emin misiniz?')) return;

    try {
      const res = await fetch(`/api/clinic/categories/${id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (data.success) {
        toast.success('Kategori silindi');
        setCategories(prev => prev.filter(c => c.id !== id));
      } else {
        toast.error(data.message || 'Silme başarısız');
      }
    } catch (error) {
      console.error('Silme hatası:', error);
      toast.error('Bir hata oluştu');
    }
  };

  const openEditModal = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      nameEn: category.nameEn || '',
      icon: category.icon || '🏥',
      isActive: category.isActive,
    });
    setShowModal(true);
  };

  const openCreateModal = () => {
    setEditingCategory(null);
    setFormData({
      name: '',
      nameEn: '',
      icon: '🏥',
      isActive: true,
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
          <h1 className="text-2xl font-bold">Kategoriler</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Klinik kategorileri yönetimi</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all"
        >
          <Plus className="w-4 h-4" />
          Yeni Kategori Ekle
        </button>
      </div>

      {categories.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
          <div className="text-6xl mb-4">📁</div>
          <h3 className="text-xl font-semibold mb-2">Kategori Bulunamadı</h3>
          <p className="text-gray-600 dark:text-gray-400">Henüz kategori eklenmemiş</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((category, index) => (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className={`p-6 bg-white dark:bg-gray-800 rounded-2xl border ${
                category.isActive ? 'border-gray-200 dark:border-gray-700' : 'border-gray-300 dark:border-gray-600 opacity-60'
              } hover:shadow-lg transition-shadow`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="text-4xl">{category.icon || '🏥'}</div>
                  <div>
                    <h3 className="font-semibold">{category.name}</h3>
                    {category.nameEn && (
                      <span className="text-sm text-gray-500 dark:text-gray-400">{category.nameEn}</span>
                    )}
                  </div>
                </div>
                {!category.isActive && (
                  <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
                    Pasif
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => openEditModal(category)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
                >
                  <Edit className="w-4 h-4" />
                  Düzenle
                </button>
                <button
                  onClick={() => handleDelete(category.id)}
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
                {editingCategory ? 'Kategori Düzenle' : 'Yeni Kategori Ekle'}
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
                <label className="block text-sm font-medium mb-1">İkon</label>
                <div className="grid grid-cols-5 gap-2">
                  {iconOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, icon: option.value })}
                      className={`p-2 text-2xl rounded-lg transition-colors ${
                        formData.icon === option.value
                          ? 'bg-purple-100 dark:bg-purple-900/30 border-2 border-purple-500'
                          : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                      title={option.label}
                    >
                      {option.value}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Kategori Adı *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">İngilizce Adı</label>
                <input
                  type="text"
                  value={formData.nameEn}
                  onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
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
                  {editingCategory ? 'Güncelle' : 'Ekle'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
