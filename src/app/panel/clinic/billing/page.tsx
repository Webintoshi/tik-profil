'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Plus, FileText, Download, Search, Calendar, DollarSign, Check, X, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useBusinessSession } from '@/hooks/useBusinessSession';

interface Invoice {
  id: string;
  invoiceNumber: string;
  patientId: string;
  patientName: string;
  appointmentId?: string;
  items: Array<{
    serviceId: string;
    serviceName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  paymentMethod: 'cash' | 'credit_card' | 'bank_transfer' | 'insurance';
  paymentStatus: 'pending' | 'partial' | 'paid' | 'cancelled';
  paidAmount: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface InvoiceFormData {
  patientId: string;
  appointmentId?: string;
  items: Array<{
    serviceId: string;
    quantity: string;
    unitPrice: string;
  }>;
  discountAmount: string;
  paymentMethod: string;
  notes: string;
}

export default function ClinicBillingPage() {
  const { session, isLoading: sessionLoading } = useBusinessSession();
  const businessId = session?.businessId;
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<InvoiceFormData>({
    patientId: '',
    appointmentId: '',
    items: [{ serviceId: '', quantity: '1', unitPrice: '0' }],
    discountAmount: '0',
    paymentMethod: 'cash',
    notes: '',
  });

  useEffect(() => {
    if (!businessId) {
      setIsLoading(false);
      return;
    }

    const fetchInvoices = async () => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/clinic/billing');
        const data = await res.json();

        if (data.success) {
          setInvoices(data.invoices || []);
        } else {
          toast.error('Faturalar yüklenemedi');
        }
      } catch (error) {
        console.error('Faturalar yüklenirken hata:', error);
        toast.error('Bir hata oluştu');
      } finally {
        setIsLoading(false);
      }
    };

    fetchInvoices();
  }, [businessId]);

  const filteredInvoices = invoices.filter(invoice =>
    invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    invoice.patientName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const items = formData.items.map(item => ({
        serviceId: item.serviceId,
        quantity: parseInt(item.quantity),
        unitPrice: parseFloat(item.unitPrice),
        totalPrice: parseInt(item.quantity) * parseFloat(item.unitPrice),
      }));

      const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
      const discountAmount = parseFloat(formData.discountAmount);
      const totalAmount = subtotal - discountAmount;

      const payload = {
        patientId: formData.patientId,
        appointmentId: formData.appointmentId || undefined,
        items,
        subtotal,
        discountAmount,
        totalAmount,
        paymentMethod: formData.paymentMethod,
        paymentStatus: 'pending' as const,
        paidAmount: 0,
        notes: formData.notes || undefined,
      };

      const res = await fetch('/api/clinic/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        toast.success('Fatura oluşturuldu');
        setShowModal(false);
        setFormData({
          patientId: '',
          appointmentId: '',
          items: [{ serviceId: '', quantity: '1', unitPrice: '0' }],
          discountAmount: '0',
          paymentMethod: 'cash',
          notes: '',
        });

        const updatedRes = await fetch('/api/clinic/billing');
        const updatedData = await updatedRes.json();
        if (updatedData.success) {
          setInvoices(updatedData.invoices || []);
        }
      } else {
        toast.error(data.message || 'Fatura oluşturulamadı');
      }
    } catch (error) {
      console.error('Fatura oluşturma hatası:', error);
      toast.error('Bir hata oluştu');
    }
  };

  const updatePaymentStatus = async (id: string, status: Invoice['paymentStatus'], paidAmount?: number) => {
    try {
      const res = await fetch(`/api/clinic/billing/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentStatus: status,
          paidAmount: paidAmount !== undefined ? paidAmount : undefined,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success('Durum güncellendi');
        setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, paymentStatus: status, paidAmount: paidAmount ?? inv.paidAmount } : inv));
      } else {
        toast.error(data.message || 'Güncelleme başarısız');
      }
    } catch (error) {
      console.error('Güncelleme hatası:', error);
      toast.error('Bir hata oluştu');
    }
  };

  const deleteInvoice = async (id: string) => {
    if (!confirm('Bu faturayı silmek istediğinize emin misiniz?')) return;

    try {
      const res = await fetch(`/api/clinic/billing/${id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (data.success) {
        toast.success('Fatura silindi');
        setInvoices(prev => prev.filter(inv => inv.id !== id));
      } else {
        toast.error(data.message || 'Silme başarısız');
      }
    } catch (error) {
      console.error('Silme hatası:', error);
      toast.error('Bir hata oluştu');
    }
  };

  if (sessionLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  const paymentStatusConfig = {
    pending: { label: 'Bekliyor', color: 'text-yellow-600', bg: 'bg-yellow-100', icon: Clock },
    partial: { label: 'Kısmi', color: 'text-orange-600', bg: 'bg-orange-100', icon: Clock },
    paid: { label: 'Ödendi', color: 'text-emerald-600', bg: 'bg-emerald-100', icon: Check },
    cancelled: { label: 'İptal', color: 'text-red-600', bg: 'bg-red-100', icon: X },
  };

  const paymentMethodConfig = {
    cash: 'Nakit',
    credit_card: 'Kredi Kartı',
    bank_transfer: 'Banka Havalesi',
    insurance: 'Sigorta',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white transition-colors">Faturalar</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 transition-colors">Fatura ve ödeme yönetimi</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 hover:shadow-lg transition-all"
        >
          <Plus className="w-4 h-4" />
          Yeni Fatura
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500 transition-colors" />
        <input
          type="text"
          placeholder="Fatura no veya hasta adı ile ara..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-white dark:bg-[#111111] border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 transition-colors"
        />
      </div>

      {filteredInvoices.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-[#111111] rounded-xl border border-gray-200 dark:border-gray-800 transition-all">
          <div className="text-6xl mb-4">📄</div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white transition-colors mb-2">Fatura Bulunamadı</h3>
          <p className="text-gray-600 dark:text-gray-400 transition-colors">
            {searchQuery ? 'Arama kriterlerine uygun fatura yok' : 'Henüz fatura oluşturulmamış'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredInvoices.map((invoice, index) => {
            const statusConfig = paymentStatusConfig[invoice.paymentStatus];
            const StatusIcon = statusConfig.icon;
            const remainingAmount = invoice.totalAmount - invoice.paidAmount;

            return (
              <motion.div
                key={invoice.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-6 bg-white dark:bg-[#111111] rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl transition-colors">
                      <FileText className="w-6 h-6 text-emerald-500" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white transition-colors">{invoice.invoiceNumber}</h3>
                        <span className={`px-2 py-1 text-xs rounded-full ${statusConfig.bg} ${statusConfig.color}`}>
                          {statusConfig.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 transition-colors">{invoice.patientName}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-emerald-600">
                      ₺{invoice.totalAmount.toLocaleString('tr-TR')}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 transition-colors">
                      {new Date(invoice.createdAt).toLocaleDateString('tr-TR')}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 transition-colors mb-1">Ara Toplam</div>
                    <div className="font-medium text-gray-900 dark:text-white transition-colors">₺{invoice.subtotal.toLocaleString('tr-TR')}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 transition-colors mb-1">İndirim</div>
                    <div className="font-medium text-red-600">
                      -₺{invoice.discountAmount.toLocaleString('tr-TR')}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 transition-colors mb-1">Ödenen</div>
                    <div className="font-medium text-emerald-600">
                      ₺{invoice.paidAmount.toLocaleString('tr-TR')}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 transition-colors mb-1">Kalan</div>
                    <div className="font-medium text-orange-600">
                      ₺{remainingAmount.toLocaleString('tr-TR')}
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg mb-4 transition-colors">
                  <div className="text-xs text-gray-500 dark:text-gray-400 transition-colors mb-2">Hizmetler</div>
                  <div className="space-y-1">
                    {invoice.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm text-gray-900 dark:text-gray-200 transition-colors">
                        <span>{item.serviceName} x{item.quantity}</span>
                        <span>₺{item.totalPrice.toLocaleString('tr-TR')}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 transition-colors">
                    <DollarSign className="w-4 h-4" />
                    <span>{paymentMethodConfig[invoice.paymentMethod]}</span>
                  </div>
                  <div className="flex gap-2">
                    {invoice.paymentStatus === 'pending' && (
                      <button
                        onClick={() => updatePaymentStatus(invoice.id, 'paid', invoice.totalAmount)}
                        className="flex items-center gap-2 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
                      >
                        <Check className="w-4 h-4" />
                        Öde
                      </button>
                    )}
                    <button
                      onClick={() => deleteInvoice(invoice.id)}
                      className="flex items-center gap-2 px-3 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg bg-white dark:bg-[#111111] rounded-xl p-6 my-8 shadow-lg"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white transition-colors">Yeni Fatura</h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400 transition-colors" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors mb-1">Hasta ID</label>
                <input
                  type="text"
                  value={formData.patientId}
                  onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-[#111111] border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors mb-1">Randevu ID (Opsiyonel)</label>
                <input
                  type="text"
                  value={formData.appointmentId}
                  onChange={(e) => setFormData({ ...formData, appointmentId: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-[#111111] border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors mb-1">Hizmetler</label>
                {formData.items.map((item, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      placeholder="Hizmet ID"
                      value={item.serviceId}
                      onChange={(e) => {
                        const newItems = [...formData.items];
                        newItems[index].serviceId = e.target.value;
                        setFormData({ ...formData, items: newItems });
                      }}
                      className="flex-1 px-3 py-2 bg-white dark:bg-[#111111] border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 transition-colors"
                      required
                    />
                    <input
                      type="number"
                      placeholder="Adet"
                      value={item.quantity}
                      onChange={(e) => {
                        const newItems = [...formData.items];
                        newItems[index].quantity = e.target.value;
                        setFormData({ ...formData, items: newItems });
                      }}
                      className="w-20 px-3 py-2 bg-white dark:bg-[#111111] border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 transition-colors"
                      required
                    />
                    <input
                      type="number"
                      placeholder="Fiyat"
                      value={item.unitPrice}
                      onChange={(e) => {
                        const newItems = [...formData.items];
                        newItems[index].unitPrice = e.target.value;
                        setFormData({ ...formData, items: newItems });
                      }}
                      className="w-24 px-3 py-2 bg-white dark:bg-[#111111] border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 transition-colors"
                      required
                    />
                    {formData.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const newItems = formData.items.filter((_, i) => i !== index);
                          setFormData({ ...formData, items: newItems });
                        }}
                        className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, items: [...formData.items, { serviceId: '', quantity: '1', unitPrice: '0' }] })}
                  className="text-sm text-emerald-600 hover:text-emerald-700 hover:underline"
                >
                  + Hizmet Ekle
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors mb-1">İndirim (₺)</label>
                  <input
                    type="number"
                    value={formData.discountAmount}
                    onChange={(e) => setFormData({ ...formData, discountAmount: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-[#111111] border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors mb-1">Ödeme Yöntemi</label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-[#111111] border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900 dark:text-white transition-colors"
                  >
                    <option value="cash">Nakit</option>
                    <option value="credit_card">Kredi Kartı</option>
                    <option value="bank_transfer">Banka Havalesi</option>
                    <option value="insurance">Sigorta</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors mb-1">Not</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 bg-white dark:bg-[#111111] border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 transition-colors"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 hover:shadow-lg transition-all"
                >
                  Oluştur
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
