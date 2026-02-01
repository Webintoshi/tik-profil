'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit2, Trash2, Tag, Loader2, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { VehicleRentalGuard } from '@/components/panel/VehicleRentalGuard';

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  sort_order: number;
  is_active: boolean;
}

export default function CategoriesPage() {
  return (
    <VehicleRentalGuard>
      <CategoriesPageContent />
    </VehicleRentalGuard>
  );
}

function CategoriesPageContent() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState({ name: '', icon: 'Car', color: 'blue' });
  const [editForm, setEditForm] = useState({ name: '', icon: 'Car', color: 'blue' });

  const colorOptions = [
    { value: 'blue', label: 'Mavi', className: 'bg-blue-500' },
    { value: 'green', label: 'Yeşil', className: 'bg-green-500' },
    { value: 'orange', label: 'Turuncu', className: 'bg-orange-500' },
    { value: 'red', label: 'Kırmızı', className: 'bg-red-500' },
    { value: 'purple', label: 'Mor', className: 'bg-purple-500' },
    { value: 'pink', label: 'Pembe', className: 'bg-pink-500' },
    { value: 'teal', label: 'Turkuaz', className: 'bg-teal-500' },
    { value: 'gray', label: 'Gri', className: 'bg-gray-500' },
  ];

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const res = await fetch('/api/vehicle-rental/categories');
      const data = await res.json();
      if (data.success) {
        setCategories(data.categories || []);
      }
    } catch (error) {
      toast.error('Kategoriler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newCategory.name.trim()) {
      toast.error('Kategori adı gerekli');
      return;
    }

    try {
      const res = await fetch('/api/vehicle-rental/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCategory),
      });

      if (res.ok) {
        toast.success('Kategori eklendi');
        setNewCategory({ name: '', icon: 'Car', color: 'blue' });
        loadCategories();
      }
    } catch (error) {
      toast.error('Ekleme başarısız');
    }
  };

  const handleUpdate = async (id: string) => {
    try {
      const res = await fetch('/api/vehicle-rental/categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...editForm }),
      });

      if (res.ok) {
        toast.success('Kategori güncellendi');
        setEditingId(null);
        loadCategories();
      }
    } catch (error) {
      toast.error('Güncelleme başarısız');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu kategoriyi silmek istediğinize emin misiniz?')) return;

    try {
      const res = await fetch(`/api/vehicle-rental/categories?id=${id}`, { method: 'DELETE' });

      if (res.ok) {
        toast.success('Kategori silindi');
        loadCategories();
      }
    } catch (error) {
      toast.error('Silme başarısız');
    }
  };

  const startEditing = (category: Category) => {
    setEditingId(category.id);
    setEditForm({ name: category.name, icon: category.icon, color: category.color });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Araç Kategorileri</h1>
        <p className="text-base text-gray-600 mt-2 font-semibold">Araç gruplarını yönetin</p>
      </div>

      {/* Add New Category */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="font-bold text-lg text-gray-900 mb-4">Yeni Kategori Ekle</h3>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-bold text-gray-700 mb-2">Kategori Adı</label>
            <input
              type="text"
              value={newCategory.name}
              onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
              placeholder="Örn: SUV, Ekonomi, Lüks"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-base font-medium"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Renk</label>
            <select
              value={newCategory.color}
              onChange={(e) => setNewCategory({ ...newCategory, color: e.target.value })}
              className="px-4 py-2.5 border border-gray-200 rounded-lg text-base font-medium"
            >
              {colorOptions.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
          >
            <Plus className="w-4 h-4" />
            Ekle
          </button>
        </div>
      </div>

      {/* Categories List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="grid grid-cols-12 gap-4 p-4 border-b border-gray-200 bg-gray-50 text-base font-bold text-gray-700">
          <div className="col-span-1">#</div>
          <div className="col-span-4">Kategori Adı</div>
          <div className="col-span-3">Renk</div>
          <div className="col-span-2">Durum</div>
          <div className="col-span-2 text-right">İşlemler</div>
        </div>

        {categories.length === 0 ? (
          <div className="p-8 text-center">
            <Tag className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-bold text-gray-700">Henüz kategori eklenmemiş</p>
          </div>
        ) : (
          categories.map((category, index) => (
            <motion.div
              key={category.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-12 gap-4 p-4 border-b border-gray-100 items-center hover:bg-gray-50"
            >
              {editingId === category.id ? (
                // Edit Mode
                <>
                  <div className="col-span-1 text-sm text-gray-400">{index + 1}</div>
                  <div className="col-span-4">
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full px-3 py-1 border border-gray-200 rounded-lg"
                      autoFocus
                    />
                  </div>
                  <div className="col-span-3">
                    <select
                      value={editForm.color}
                      onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
                      className="px-3 py-1 border border-gray-200 rounded-lg"
                    >
                      {colorOptions.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <span className={`inline-block w-3 h-3 rounded-full ${colorOptions.find(c => c.value === editForm.color)?.className}`} />
                  </div>
                  <div className="col-span-2 flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleUpdate(category.id)}
                      className="p-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="p-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </>
              ) : (
                // View Mode
                <>
                  <div className="col-span-1 text-base font-bold text-gray-500">{index + 1}</div>
                  <div className="col-span-4 font-bold text-lg text-gray-900">
                    {category.name}
                  </div>
                  <div className="col-span-3">
                    <span className={`inline-block w-5 h-5 rounded-full ${colorOptions.find(c => c.value === category.color)?.className}`} />
                    <span className="ml-2 text-base font-semibold text-gray-600 capitalize">{category.color}</span>
                  </div>
                  <div className="col-span-2">
                    <span className={`px-3 py-1.5 rounded-full text-sm font-bold ${category.is_active ? 'bg-gray-200 text-gray-800' : 'bg-gray-100 text-gray-500'}`}>
                      {category.is_active ? 'Aktif' : 'Pasif'}
                    </span>
                  </div>
                  <div className="col-span-2 flex items-center justify-end gap-2">
                    <button
                      onClick={() => startEditing(category)}
                      className="p-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(category.id)}
                      className="p-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
