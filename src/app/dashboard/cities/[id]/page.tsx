"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Save, Plus, Trash2, Image as ImageIcon } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { toR2ProxyUrl } from "@/lib/publicImage";

export default function CityEditPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [city, setCity] = useState<any>(null);

    // Form state
    const [tagline, setTagline] = useState("");
    const [description, setDescription] = useState("");
    const [coverImage, setCoverImage] = useState("");
    const [places, setPlaces] = useState<any[]>([]);

    useEffect(() => {
        // Tüm şehirleri çekip ID'ye göre bul (API yapımıza göre)
        fetch("/api/cities")
            .then((res) => res.json())
            .then((data) => {
                const foundCity = data.find((c: any) => c.id === id);
                if (foundCity) {
                    setCity(foundCity);
                    setTagline(foundCity.tagline || "");
                    setDescription(foundCity.description || "");
                    setCoverImage(foundCity.coverImage || "");
                    setPlaces(foundCity.places || []);
                }
                setLoading(false);
            });
    }, [id]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const updatedCity = {
                ...city,
                tagline,
                description,
                coverImage,
                places
            };

            const res = await fetch("/api/cities", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updatedCity)
            });

            if (res.ok) {
                alert("Başarıyla kaydedildi!");
                router.refresh();
            } else {
                alert("Kaydedilirken hata oluştu.");
            }
        } catch (error) {
            console.error(error);
            alert("Hata oluştu.");
        } finally {
            setSaving(false);
        }
    };

    const addPlace = () => {
        setPlaces([
            ...places,
            {
                id: Date.now().toString(),
                name: "Yeni Yer",
                image: "https://images.unsplash.com/photo-...",
                category: "Turistik"
            }
        ]);
    };

    const updatePlace = (index: number, field: string, value: string) => {
        const newPlaces = [...places];
        newPlaces[index] = { ...newPlaces[index], [field]: value };
        setPlaces(newPlaces);
    };

    const removePlace = (index: number) => {
        setPlaces(places.filter((_, i) => i !== index));
    };

    if (loading) return <div className="p-10 text-center">Yükleniyor...</div>;
    if (!city) return <div className="p-10 text-center">Şehir bulunamadı.</div>;

    return (
        <div className="p-6 max-w-5xl mx-auto pb-24">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/cities" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <ArrowLeft className="w-6 h-6 text-gray-600" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{city.name} Düzenle</h1>
                        <p className="text-gray-500 text-sm">Şehir rehberi içeriğini yönetin.</p>
                    </div>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-bold disabled:opacity-50"
                >
                    <Save className="w-5 h-5" />
                    {saving ? "Kaydediliyor..." : "Kaydet"}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Sol Kolon: Genel Bilgiler */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-4">
                        <h3 className="font-bold text-gray-800 border-b pb-2">Temel Bilgiler</h3>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Şehir Sloganı (Tagline)</label>
                            <input
                                type="text"
                                value={tagline}
                                onChange={(e) => setTagline(e.target.value)}
                                className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="Örn: Mavinin ve yeşilin buluştuğu yer..."
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tarihçe ve Tanıtım</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={6}
                                className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                placeholder="Şehrin kısa tarihçesi ve tanıtımı..."
                            />
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-4">
                        <div className="flex items-center justify-between border-b pb-2">
                            <h3 className="font-bold text-gray-800">Gezilecek Yerler</h3>
                            <button onClick={addPlace} className="text-blue-600 text-sm font-bold flex items-center gap-1 hover:bg-blue-50 px-3 py-1 rounded-lg transition-colors">
                                <Plus className="w-4 h-4" /> Ekle
                            </button>
                        </div>
                        
                        <div className="space-y-4">
                            {places.map((place, index) => (
                                <div key={index} className="flex gap-4 p-4 bg-gray-50 rounded-xl border group relative">
                                    <div className="w-24 h-24 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0 relative">
                                        {place.image ? (
                                            <Image src={place.image} alt={place.name} fill className="object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                <ImageIcon className="w-8 h-8" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <div className="grid grid-cols-2 gap-2">
                                            <input
                                                type="text"
                                                value={place.name}
                                                onChange={(e) => updatePlace(index, "name", e.target.value)}
                                                className="px-3 py-1.5 border rounded-lg text-sm"
                                                placeholder="Yer Adı"
                                            />
                                            <input
                                                type="text"
                                                value={place.category}
                                                onChange={(e) => updatePlace(index, "category", e.target.value)}
                                                className="px-3 py-1.5 border rounded-lg text-sm"
                                                placeholder="Kategori (örn: Manzara)"
                                            />
                                        </div>
                                        <input
                                            type="text"
                                            value={place.image}
                                            onChange={(e) => updatePlace(index, "image", e.target.value)}
                                            className="w-full px-3 py-1.5 border rounded-lg text-sm font-mono text-gray-500"
                                            placeholder="Görsel URL (https://...)"
                                        />
                                    </div>
                                    <button
                                        onClick={() => removePlace(index)}
                                        className="absolute top-2 right-2 p-1.5 bg-white text-red-500 rounded-lg shadow-sm border opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                            
                            {places.length === 0 && (
                                <p className="text-center text-gray-500 py-4 text-sm">Henüz yer eklenmemiş.</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sağ Kolon: Kapak Görseli */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-4 sticky top-6">
                        <h3 className="font-bold text-gray-800 border-b pb-2">Kapak Görseli</h3>
                        
                        <div className="aspect-video w-full bg-gray-100 rounded-xl overflow-hidden relative border-2 border-dashed border-gray-300 flex items-center justify-center">
                            {coverImage ? (
                                <Image src={toR2ProxyUrl(coverImage)} alt="Cover" fill className="object-cover" />
                            ) : (
                                <div className="text-center text-gray-400">
                                    <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                    <span className="text-sm">Görsel URL girin</span>
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Görsel URL</label>
                            <input
                                type="text"
                                value={coverImage}
                                onChange={(e) => setCoverImage(e.target.value)}
                                className="w-full px-3 py-2 border rounded-xl text-sm font-mono text-gray-600 focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="https://..."
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
