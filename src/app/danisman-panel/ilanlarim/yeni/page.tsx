"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
    ArrowLeft,
    Save,
    Loader2,
    Image as ImageIcon,
    MapPin,
    Home,
    Building2,
    Trees,
    Grid3X3
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useConsultantSession } from "@/hooks/useConsultantSession";
import {
    PROPERTY_TYPE_LABELS,
    PROPERTY_SUB_TYPE_LABELS,
    HEATING_LABELS
} from "@/types/emlak";
import { ImageGalleryUploader, GalleryImage } from "@/components/panel/ImageGalleryUploader";

interface FormData {
    title: string;
    description: string;
    listingType: string;
    propertyType: string;
    propertySubType: string;
    city: string;
    district: string;
    neighborhood: string;
    address: string;
    grossArea: string;
    netArea: string;
    roomCount: string;
    floor: string;
    totalFloors: string;
    buildingAge: string;
    heating: string;
    bathrooms: string;
    balcony: boolean;
    parking: boolean;
    furnished: boolean;
    price: string;
    currency: string;
    status: string;
}

export default function NewConsultantListingPage() {
    const router = useRouter();
    const { session, isLoading: sessionLoading } = useConsultantSession();

    const [loading, setLoading] = useState(false);
    const [images, setImages] = useState<GalleryImage[]>([]);

    const [form, setForm] = useState<FormData>({
        title: "",
        description: "",
        listingType: "sale",
        propertyType: "residential",
        propertySubType: "apartment",
        city: "",
        district: "",
        neighborhood: "",
        address: "",
        grossArea: "",
        netArea: "",
        roomCount: "",
        floor: "",
        totalFloors: "",
        buildingAge: "",
        heating: "natural_gas",
        bathrooms: "",
        balcony: false,
        parking: false,
        furnished: false,
        price: "",
        currency: "TRY",
        status: "active",
    });

    useEffect(() => {
        if (!sessionLoading && !session) {
            router.push('/danisman-giris');
        }
    }, [sessionLoading, session, router]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            setForm(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
        } else {
            setForm(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (!form.title.trim()) {
            toast.error('Başlık zorunlu');
            return;
        }
        if (!form.city.trim() || !form.district.trim()) {
            toast.error('İl ve ilçe zorunlu');
            return;
        }
        if (!form.grossArea || Number(form.grossArea) <= 0) {
            toast.error('Brüt m² zorunlu');
            return;
        }
        if (!form.price || Number(form.price) <= 0) {
            toast.error('Fiyat zorunlu');
            return;
        }

        setLoading(true);

        try {
            const payload = {
                title: form.title.trim(),
                description: form.description.trim(),
                listingType: form.listingType,
                propertyType: form.propertyType,
                propertySubType: form.propertySubType,
                location: {
                    city: form.city.trim(),
                    district: form.district.trim(),
                    neighborhood: form.neighborhood.trim(),
                    address: form.address.trim(),
                },
                features: {
                    grossArea: Number(form.grossArea),
                    netArea: form.netArea ? Number(form.netArea) : undefined,
                    roomCount: form.roomCount || undefined,
                    floor: form.floor ? Number(form.floor) : undefined,
                    totalFloors: form.totalFloors ? Number(form.totalFloors) : undefined,
                    buildingAge: form.buildingAge ? Number(form.buildingAge) : undefined,
                    heating: form.heating || undefined,
                    bathrooms: form.bathrooms ? Number(form.bathrooms) : undefined,
                    balcony: form.balcony,
                    parking: form.parking,
                    furnished: form.furnished,
                },
                price: Number(form.price),
                currency: form.currency,
                images: images.map(img => img.url),
                status: form.status,
            };

            const res = await fetch('/api/consultant/listings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (data.success) {
                toast.success('İlan başarıyla eklendi');
                router.push('/danisman-panel/ilanlarim');
            } else {
                toast.error(data.error || 'Kayıt başarısız');
                if (data.details) {
                    data.details.forEach((d: string) => toast.error(d));
                }
            }
        } catch (error) {
            console.error('Submit error:', error);
            toast.error('Kayıt sırasında hata oluştu');
        } finally {
            setLoading(false);
        }
    };

    const propertySubTypes = form.propertyType === 'residential'
        ? ['apartment', 'villa', 'detached', 'residence']
        : form.propertyType === 'commercial'
            ? ['shop', 'office', 'warehouse']
            : ['land', 'field'];

    if (sessionLoading || !session) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            </div>
        );
    }

    const inputClass = "w-full px-4 py-3 rounded-xl border bg-white border-gray-200 text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all";
    const labelClass = "block text-sm font-medium mb-1.5 text-gray-700";

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
                    <Link
                        href="/danisman-panel/ilanlarim"
                        className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Yeni İlan</h1>
                        <p className="text-sm text-gray-500">İlan bilgilerini girin</p>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto p-4">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Basic Info */}
                    <motion.section
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-6 rounded-2xl bg-white shadow-sm"
                    >
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900">
                            <Home className="w-5 h-5 text-purple-500" />
                            Temel Bilgiler
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className={labelClass}>Başlık *</label>
                                <input
                                    type="text"
                                    name="title"
                                    value={form.title}
                                    onChange={handleChange}
                                    placeholder="3+1 Ara Kat Daire"
                                    className={inputClass}
                                    maxLength={200}
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className={labelClass}>Açıklama</label>
                                <textarea
                                    name="description"
                                    value={form.description}
                                    onChange={handleChange}
                                    rows={3}
                                    placeholder="İlan açıklaması..."
                                    className={inputClass}
                                />
                            </div>

                            <div>
                                <label className={labelClass}>İlan Türü *</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { value: 'sale', label: 'Satılık' },
                                        { value: 'rent', label: 'Kiralık' }
                                    ].map(item => (
                                        <button
                                            key={item.value}
                                            type="button"
                                            onClick={() => setForm(prev => ({ ...prev, listingType: item.value }))}
                                            className={`py-3 rounded-xl font-medium text-sm transition-all ${form.listingType === item.value
                                                    ? "bg-purple-600 text-white"
                                                    : "bg-gray-100 text-gray-600"
                                                }`}
                                        >
                                            {item.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className={labelClass}>Emlak Türü *</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {Object.entries(PROPERTY_TYPE_LABELS).map(([value, label]) => (
                                        <button
                                            key={value}
                                            type="button"
                                            onClick={() => setForm(prev => ({
                                                ...prev,
                                                propertyType: value,
                                                propertySubType: value === 'residential' ? 'apartment' : value === 'commercial' ? 'shop' : 'land'
                                            }))}
                                            className={`py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all ${form.propertyType === value
                                                    ? "bg-purple-600 text-white"
                                                    : "bg-gray-100 text-gray-600"
                                                }`}
                                        >
                                            {value === 'residential' && <Home className="w-4 h-4" />}
                                            {value === 'commercial' && <Building2 className="w-4 h-4" />}
                                            {value === 'land' && <Trees className="w-4 h-4" />}
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className={labelClass}>Alt Tür</label>
                                <select
                                    name="propertySubType"
                                    value={form.propertySubType}
                                    onChange={handleChange}
                                    className={inputClass}
                                >
                                    {propertySubTypes.map(type => (
                                        <option key={type} value={type}>
                                            {PROPERTY_SUB_TYPE_LABELS[type] || type}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </motion.section>

                    {/* Location */}
                    <motion.section
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="p-6 rounded-2xl bg-white shadow-sm"
                    >
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900">
                            <MapPin className="w-5 h-5 text-purple-500" />
                            Konum
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>İl *</label>
                                <input
                                    type="text"
                                    name="city"
                                    value={form.city}
                                    onChange={handleChange}
                                    placeholder="Ordu"
                                    className={inputClass}
                                />
                            </div>

                            <div>
                                <label className={labelClass}>İlçe *</label>
                                <input
                                    type="text"
                                    name="district"
                                    value={form.district}
                                    onChange={handleChange}
                                    placeholder="Altınordu"
                                    className={inputClass}
                                />
                            </div>

                            <div>
                                <label className={labelClass}>Mahalle</label>
                                <input
                                    type="text"
                                    name="neighborhood"
                                    value={form.neighborhood}
                                    onChange={handleChange}
                                    placeholder="Merkez Mahallesi"
                                    className={inputClass}
                                />
                            </div>

                            <div>
                                <label className={labelClass}>Adres</label>
                                <input
                                    type="text"
                                    name="address"
                                    value={form.address}
                                    onChange={handleChange}
                                    placeholder="Atatürk Cad. No: 15"
                                    className={inputClass}
                                />
                            </div>
                        </div>
                    </motion.section>

                    {/* Features */}
                    <motion.section
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="p-6 rounded-2xl bg-white shadow-sm"
                    >
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900">
                            <Grid3X3 className="w-5 h-5 text-purple-500" />
                            Özellikler
                        </h2>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <label className={labelClass}>Brüt m² *</label>
                                <input
                                    type="number"
                                    name="grossArea"
                                    value={form.grossArea}
                                    onChange={handleChange}
                                    placeholder="120"
                                    className={inputClass}
                                    min="1"
                                />
                            </div>

                            <div>
                                <label className={labelClass}>Net m²</label>
                                <input
                                    type="number"
                                    name="netArea"
                                    value={form.netArea}
                                    onChange={handleChange}
                                    placeholder="105"
                                    className={inputClass}
                                />
                            </div>

                            <div>
                                <label className={labelClass}>Oda Sayısı</label>
                                <select
                                    name="roomCount"
                                    value={form.roomCount}
                                    onChange={handleChange}
                                    className={inputClass}
                                >
                                    <option value="">Seçin</option>
                                    {['1+0', '1+1', '2+0', '2+1', '3+1', '3+2', '4+1', '4+2', '5+1', '5+2', '6+'].map(room => (
                                        <option key={room} value={room}>{room}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className={labelClass}>Banyo</label>
                                <input
                                    type="number"
                                    name="bathrooms"
                                    value={form.bathrooms}
                                    onChange={handleChange}
                                    placeholder="2"
                                    className={inputClass}
                                    min="0"
                                />
                            </div>

                            <div>
                                <label className={labelClass}>Bulunduğu Kat</label>
                                <input
                                    type="number"
                                    name="floor"
                                    value={form.floor}
                                    onChange={handleChange}
                                    placeholder="3"
                                    className={inputClass}
                                />
                            </div>

                            <div>
                                <label className={labelClass}>Toplam Kat</label>
                                <input
                                    type="number"
                                    name="totalFloors"
                                    value={form.totalFloors}
                                    onChange={handleChange}
                                    placeholder="8"
                                    className={inputClass}
                                />
                            </div>

                            <div>
                                <label className={labelClass}>Bina Yaşı</label>
                                <input
                                    type="number"
                                    name="buildingAge"
                                    value={form.buildingAge}
                                    onChange={handleChange}
                                    placeholder="5"
                                    className={inputClass}
                                    min="0"
                                />
                            </div>

                            <div>
                                <label className={labelClass}>Isıtma</label>
                                <select
                                    name="heating"
                                    value={form.heating}
                                    onChange={handleChange}
                                    className={inputClass}
                                >
                                    {Object.entries(HEATING_LABELS).map(([value, label]) => (
                                        <option key={value} value={value}>{label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Checkboxes */}
                        <div className="flex flex-wrap gap-3 mt-4">
                            {[
                                { name: 'balcony', label: 'Balkon' },
                                { name: 'parking', label: 'Otopark' },
                                { name: 'furnished', label: 'Eşyalı' },
                            ].map(item => (
                                <label
                                    key={item.name}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer transition-all ${form[item.name as keyof FormData]
                                            ? "bg-purple-600 text-white"
                                            : "bg-gray-100 text-gray-600"
                                        }`}
                                >
                                    <input
                                        type="checkbox"
                                        name={item.name}
                                        checked={form[item.name as keyof FormData] as boolean}
                                        onChange={handleChange}
                                        className="sr-only"
                                    />
                                    {item.label}
                                </label>
                            ))}
                        </div>
                    </motion.section>

                    {/* Price */}
                    <motion.section
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="p-6 rounded-2xl bg-white shadow-sm"
                    >
                        <h2 className="text-lg font-semibold mb-4 text-gray-900">
                            💰 Fiyat
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-2">
                                <label className={labelClass}>Fiyat *</label>
                                <input
                                    type="number"
                                    name="price"
                                    value={form.price}
                                    onChange={handleChange}
                                    placeholder="2850000"
                                    className={inputClass}
                                    min="0"
                                />
                            </div>

                            <div>
                                <label className={labelClass}>Para Birimi</label>
                                <select
                                    name="currency"
                                    value={form.currency}
                                    onChange={handleChange}
                                    className={inputClass}
                                >
                                    <option value="TRY">₺ TL</option>
                                    <option value="USD">$ USD</option>
                                    <option value="EUR">€ EUR</option>
                                </select>
                            </div>
                        </div>
                    </motion.section>

                    {/* Images */}
                    <motion.section
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="p-6 rounded-2xl bg-white shadow-sm"
                    >
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900">
                            <ImageIcon className="w-5 h-5 text-purple-500" />
                            Fotoğraflar
                        </h2>

                        <ImageGalleryUploader
                            images={images}
                            onChange={setImages}
                            maxImages={10}
                            isDark={false}
                        />
                    </motion.section>

                    {/* Status */}
                    <motion.section
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="p-6 rounded-2xl bg-white shadow-sm"
                    >
                        <h2 className="text-lg font-semibold mb-4 text-gray-900">
                            📋 Durum
                        </h2>

                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { value: 'active', label: 'Aktif' },
                                { value: 'sold', label: 'Satıldı' },
                                { value: 'inactive', label: 'Pasif' },
                            ].map(item => (
                                <button
                                    key={item.value}
                                    type="button"
                                    onClick={() => setForm(prev => ({ ...prev, status: item.value }))}
                                    className={`py-3 rounded-xl font-medium text-sm transition-all ${form.status === item.value
                                            ? "bg-purple-600 text-white"
                                            : "bg-gray-100 text-gray-600"
                                        }`}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    </motion.section>

                    {/* Submit */}
                    <div className="flex justify-end gap-3 pt-4 pb-8">
                        <Link
                            href="/danisman-panel/ilanlarim"
                            className="px-6 py-3 rounded-xl font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                        >
                            İptal
                        </Link>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white font-medium rounded-xl hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Kaydediliyor...
                                </>
                            ) : (
                                <>
                                    <Save className="w-5 h-5" />
                                    İlanı Kaydet
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </main>
        </div>
    );
}
