'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Plus, Edit, Trash2, Search, Phone, Mail, Clock, User, Stethoscope, GraduationCap, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { useBusinessSession } from '@/hooks/useBusinessSession';

interface Staff {
  id: string;
  name: string;
  title: string;
  specialty?: string;
  bio?: string;
  phone?: string;
  email?: string;
  imageUrl?: string;
  workingHours?: Record<string, { start: string; end: string; isActive: boolean }>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface StaffFormData {
  name: string;
  title: string;
  specialty: string;
  bio: string;
  phone: string;
  email: string;
  imageUrl: string;
  isActive: boolean;
}

const daysOfWeek = [
  { key: 'monday', label: 'Pazartesi' },
  { key: 'tuesday', label: 'Salı' },
  { key: 'wednesday', label: 'Çarşamba' },
  { key: 'thursday', label: 'Perşembe' },
  { key: 'friday', label: 'Cuma' },
  { key: 'saturday', label: 'Cumartesi' },
  { key: 'sunday', label: 'Pazar' },
];

export default function ClinicStaffPage() {
  const { businessId, loading } = useBusinessSession();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [showWorkingHours, setShowWorkingHours] = useState(false);
  const [formData, setFormData] = useState<StaffFormData>({
    name: '',
    title: '',
    specialty: '',
    bio: '',
    phone: '',
    email: '',
    imageUrl: '',
    isActive: true,
  });

  useEffect(() => {
    if (!businessId) return;

    const fetchStaff = async () => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/clinic/staff');
        const data = await res.json();

        if (data.success) {
          setStaff(data.staff || []);
        } else {
          toast.error('Personel yüklenemedi');
        }
      } catch (error) {
        console.error('Personel yüklenirken hata:', error);
        toast.error('Bir hata oluştu');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStaff();
  }, [businessId]);

  const filteredStaff = staff.filter(member =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.specialty?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const payload = {
        name: formData.name,
        title: formData.title,
        specialty: formData.specialty || undefined,
        bio: formData.bio || undefined,
        phone: formData.phone || undefined,
        email: formData.email || undefined,
        imageUrl: formData.imageUrl || undefined,
        workingHours: {},
        isActive: formData.isActive,
      };

      const url = editingStaff ? `/api/clinic/staff/${editingStaff.id}` : '/api/clinic/staff';
      const method = editingStaff ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(editingStaff ? 'Personel güncellendi' : 'Personel eklendi');
        setShowModal(false);
        setEditingStaff(null);
        setFormData({
          name: '',
          title: '',
          specialty: '',
          bio: '',
          phone: '',
          email: '',
          imageUrl: '',
          isActive: true,
        });

        const updatedRes = await fetch('/api/clinic/staff');
        const updatedData = await updatedRes.json();
        if (updatedData.success) {
          setStaff(updatedData.staff || []);
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
    if (!confirm('Bu personeli silmek istediğinize emin misiniz?')) return;

    try {
      const res = await fetch(`/api/clinic/staff/${id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (data.success) {
        toast.success('Personel silindi');
        setStaff(prev => prev.filter(s => s.id !== id));
      } else {
        toast.error(data.message || 'Silme başarısız');
      }
    } catch (error) {
      console.error('Silme hatası:', error);
      toast.error('Bir hata oluştu');
    }
  };

  const openEditModal = (member: Staff) => {
    setEditingStaff(member);
    setFormData({
      name: member.name,
      title: member.title,
      specialty: member.specialty || '',
      bio: member.bio || '',
      phone: member.phone || '',
      email: member.email || '',
      imageUrl: member.imageUrl || '',
      isActive: member.isActive,
    });
    setShowModal(true);
  };

  const openCreateModal = () => {
    setEditingStaff(null);
    setFormData({
      name: '',
      title: '',
      specialty: '',
      bio: '',
      phone: '',
      email: '',
      imageUrl: '',
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
          <h1 className="text-2xl font-bold">Personel</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Doktor ve personel yönetimi</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all"
        >
          <Plus className="w-4 h-4" />
          Yeni Personel Ekle
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Personel ara..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
      </div>

      {filteredStaff.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
          <div className="text-6xl mb-4">👨‍⚕️</div>
          <h3 className="text-xl font-semibold mb-2">Personel Bulunamadı</h3>
          <p className="text-gray-600 dark:text-gray-400">
            {searchQuery ? 'Arama kriterlerine uygun personel yok' : 'Henüz personel eklenmemiş'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStaff.map((member, index) => (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className={`p-6 bg-white dark:bg-gray-800 rounded-2xl border ${
                member.isActive ? 'border-gray-200 dark:border-gray-700' : 'border-gray-300 dark:border-gray-600 opacity-60'
              } hover:shadow-lg transition-shadow`}
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl flex items-center justify-center text-3xl">
                  {member.imageUrl ? (
                    <img src={member.imageUrl} alt={member.name} className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    <Stethoscope className="w-8 h-8 text-purple-500" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">{member.name}</h3>
                  <p className="text-sm text-purple-600 dark:text-purple-400">{member.title}</p>
                  {member.specialty && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                      <GraduationCap className="w-3 h-3" />
                      {member.specialty}
                    </p>
                  )}
                </div>
                {!member.isActive && (
                  <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
                    Pasif
                  </span>
                )}
              </div>

              {member.bio && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                  {member.bio}
                </p>
              )}

              <div className="space-y-2 mb-4">
                {member.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Phone className="w-4 h-4" />
                    <span>{member.phone}</span>
                  </div>
                )}
                {member.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Mail className="w-4 h-4" />
                    <span className="truncate">{member.email}</span>
                  </div>
                )}
                {member.workingHours && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Clock className="w-4 h-4" />
                    <span>Çalışma saatleri ayarlandı</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => openEditModal(member)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
                >
                  <Edit className="w-4 h-4" />
                  Düzenle
                </button>
                <button
                  onClick={() => handleDelete(member.id)}
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl p-6 my-8"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">
                {editingStaff ? 'Personel Düzenle' : 'Yeni Personel Ekle'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Trash2 className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Ad Soyad *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Unvan *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Örn: Dr., Uzm. Dr., Prk. Dr."
                    className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Uzmanlık Alanı</label>
                  <input
                    type="text"
                    value={formData.specialty}
                    onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                    placeholder="Örn: Kardiyoloji, Nöroloji"
                    className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Telefon</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">E-posta</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Biografi</label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Görsel URL</label>
                <input
                  type="url"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
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
                  {editingStaff ? 'Güncelle' : 'Ekle'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
