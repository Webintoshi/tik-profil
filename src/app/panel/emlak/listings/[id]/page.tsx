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
import { useTheme } from "@/components/panel/ThemeProvider";
import { useRouter, useParams } from "next/navigation";
import clsx from "clsx";
import {
    Consultant,
    PROPERTY_TYPE_LABELS,
    PROPERTY_SUB_TYPE_LABELS,
    HEATING_LABELS,
    Listing
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
    consultantId: string;
    status: string;
}

export default function EditListingPage() {
    const { isDark } = useTheme();
    const router = useRouter();
    const params = useParams();
    const listingId = params.id as string;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [consultants, setConsultants] = useState<Consultant[]>([]);
    const [images, setImages] = useState<GalleryImage[]>([]);
    const [notFound, setNotFound] = useState(false);

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
        consultantId: "",
        status: "active",
    });

    useEffect(() => {
        loadData();
    }, [listingId]);

    const loadData = async () => {
        try {
            setLoading(true);

            // Load consultants
            const consultRes = await fetch('/api/emlak/consultants');
            const consultData = await consultRes.json();
            if (consultData.success) {
                setConsultants(consultData.consultants || []);
            }

            // Load listing
            const listingRes = await fetch(`/api/emlak/listings?id=${listingId}`);
            const listingData = await listingRes.json();

            if (!listingData.success || !listingData.listing) {
                setNotFound(true);
                return;
            }

            const listing: Listing = listingData.listing;

            // Set form data
            setForm({
                title: listing.title,
                description: listing.description || "",
                listingType: listing.listingType,
                propertyType: listing.propertyType,
                propertySubType: listing.propertySubType || "apartment",
                city: listing.location.city,
                district: listing.location.district,
                neighborhood: listing.location.neighborhood || "",
                address: listing.location.address || "",
                grossArea: String(listing.features.grossArea),
                netArea: listing.features.netArea ? String(listing.features.netArea) : "",
                roomCount: listing.features.roomCount || "",
                floor: listing.features.floor ? String(listing.features.floor) : "",
                totalFloors: listing.features.totalFloors ? String(listing.features.totalFloors) : "",
                buildingAge: listing.features.buildingAge ? String(listing.features.buildingAge) : "",
                heating: listing.features.heating || "natural_gas",
                bathrooms: listing.features.bathrooms ? String(listing.features.bathrooms) : "",
                balcony: listing.features.balcony || false,
                parking: listing.features.parking || false,
                furnished: listing.features.furnished || false,
                price: String(listing.price),
                currency: listing.currency,
                consultantId: listing.consultantId || "",
                status: listing.status,
            });

            // Set images
            if (listing.images && listing.images.length > 0) {
                setImages(listing.images.map((img, index) => ({
                    id: `img-${index}`,
                    url: img.url,
                    order: img.order,
                    isMain: img.isMain,
                })));
            }
        } catch (error) {
            console.error('Load error:', error);
            toast.error('Veri yüklenirken hata oluştu');
        } finally {
            setLoading(false);
        }
    };

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

        setSaving(true);

        try {
            const payload = {
                id: listingId,
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
                images: images.map(img => ({
                    url: img.url,
                    order: img.order,
                    isMain: img.isMain,
                })),
                consultantId: form.consultantId || undefined,
                status: form.status,
            };

            const res = await fetch('/api/emlak/listings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (data.success) {
                toast.success('İlan güncellendi');
                router.push('/panel/emlak/listings');
            } else {
                toast.error(data.error || 'Güncelleme başarısız');
            }
        } catch (error) {
            console.error('Submit error:', error);
            toast.error('Güncelleme sırasında hata oluştu');
        } finally {
            setSaving(false);
        }
    };

    const propertySubTypes = form.propertyType === 'residential'
        ? ['apartment', 'villa', 'detached', 'residence']
        : form.propertyType === 'commercial'
            ? ['shop', 'office', 'warehouse']
            : ['land', 'field'];

    const inputClass = clsx(
        "w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all",
        isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-200 text-gray-900"
    );

    const labelClass = clsx(
        "block text-sm font-medium mb-1.5",
        isDark ? "text-gray-300" : "text-gray-700"
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            </div>
        );
    }

    if (notFound) {
        return (
            <div className="p-6 text-center">
                <div className="text-5xl mb-4">😕</div>
                <h2 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    İlan Bulunamadı
                </h2>
                <button
                    onClick={() => router.push('/panel/emlak/listings')}
                    className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-xl"
                >
                    İlanlara Dön
                </button>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <button
                    onClick={() => router.back()}
                    className={clsx(
                        "p-2 rounded-xl transition-colors",
                        isDark ? "hover:bg-gray-800" : "hover:bg-gray-100"
                    )}
                >
                    <ArrowLeft className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
                </button>
                <div>
                    <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        İlanı Düzenle
                    </h1>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {form.title}
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Basic Info */}
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-6 rounded-2xl ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}
                >
                    <h2 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
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
                                className={inputClass}
                            />
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
                                        className={clsx(
                                            "py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all",
                                            form.propertyType === value
                                                ? "bg-purple-600 text-white"
                                                : isDark ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-600"
                                        )}
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
                    className={`p-6 rounded-2xl ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}
                >
                    <h2 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
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
                    className={`p-6 rounded-2xl ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}
                >
                    <h2 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        <Grid3X3 className="w-5 h-5 text-purple-500" />
                        Özellikler
                    </h2>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <label className={labelClass}>Brüt m² *</label>
                            <input type="number" name="grossArea" value={form.grossArea} onChange={handleChange} className={inputClass} min="1" />
                        </div>
                        <div>
                            <label className={labelClass}>Net m²</label>
                            <input type="number" name="netArea" value={form.netArea} onChange={handleChange} className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>Oda Sayısı</label>
                            <select name="roomCount" value={form.roomCount} onChange={handleChange} className={inputClass}>
                                <option value="">Seçin</option>
                                {['1+0', '1+1', '2+0', '2+1', '3+1', '3+2', '4+1', '4+2', '5+1', '5+2', '6+'].map(room => (
                                    <option key={room} value={room}>{room}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>Banyo</label>
                            <input type="number" name="bathrooms" value={form.bathrooms} onChange={handleChange} className={inputClass} min="0" />
                        </div>
                        <div>
                            <label className={labelClass}>Bulunduğu Kat</label>
                            <input type="number" name="floor" value={form.floor} onChange={handleChange} className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>Toplam Kat</label>
                            <input type="number" name="totalFloors" value={form.totalFloors} onChange={handleChange} className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>Bina Yaşı</label>
                            <input type="number" name="buildingAge" value={form.buildingAge} onChange={handleChange} className={inputClass} min="0" />
                        </div>
                        <div>
                            <label className={labelClass}>Isıtma</label>
                            <select name="heating" value={form.heating} onChange={handleChange} className={inputClass}>
                                {Object.entries(HEATING_LABELS).map(([value, label]) => (
                                    <option key={value} value={value}>{label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-4 mt-4">
                        {[
                            { name: 'balcony', label: 'Balkon' },
                            { name: 'parking', label: 'Otopark' },
                            { name: 'furnished', label: 'Eşyalı' },
                        ].map(item => (
                            <label
                                key={item.name}
                                className={clsx(
                                    "flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer transition-all",
                                    form[item.name as keyof FormData]
                                        ? "bg-purple-600 text-white"
                                        : isDark ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-600"
                                )}
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
                    className={`p-6 rounded-2xl ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}
                >
                    <h2 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        💰 Fiyat
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2">
                            <label className={labelClass}>Fiyat *</label>
                            <input type="number" name="price" value={form.price} onChange={handleChange} className={inputClass} min="0" />
                        </div>
                        <div>
                            <label className={labelClass}>Para Birimi</label>
                            <select name="currency" value={form.currency} onChange={handleChange} className={inputClass}>
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
                    className={`p-6 rounded-2xl ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}
                >
                    <h2 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        <ImageIcon className="w-5 h-5 text-purple-500" />
                        Fotoğraflar
                    </h2>

                    <ImageGalleryUploader
                        images={images}
                        onChange={setImages}
                        maxImages={10}
                        isDark={isDark}
                    />
                </motion.section>

                {/* Consultant & Status */}
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className={`p-6 rounded-2xl ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}
                >
                    <h2 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        👤 Danışman & Durum
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>Danışman</label>
                            <select name="consultantId" value={form.consultantId} onChange={handleChange} className={inputClass}>
                                <option value="">Danışman seçin (opsiyonel)</option>
                                {consultants.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>Durum</label>
                            <select name="status" value={form.status} onChange={handleChange} className={inputClass}>
                                <option value="active">Aktif</option>
                                <option value="sold">Satıldı</option>
                                <option value="inactive">Pasif</option>
                            </select>
                        </div>
                    </div>
                </motion.section>

                {/* Submit */}
                <div className="flex justify-end gap-3 pt-4">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className={clsx(
                            "px-6 py-3 rounded-xl font-medium transition-colors",
                            isDark ? "bg-gray-700 text-white hover:bg-gray-600" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        )}
                    >
                        İptal
                    </button>
                    <button
                        type="submit"
                        disabled={saving}
                        className="px-6 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white font-medium rounded-xl hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        Kaydet
                    </button>
                </div>
            </form>
        </div>
    );
}
