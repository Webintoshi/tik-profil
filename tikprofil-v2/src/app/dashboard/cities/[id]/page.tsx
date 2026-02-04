"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
    ArrowLeft, Save, Loader2, CheckCircle, AlertCircle,
    FileText, MapPin, Building2, Image as ImageIcon, 
    Settings, Eye, Sparkles, Tag, Globe,
    Clock, Calendar, X, Plus, Trash2,
    GripVertical, TrendingUp
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { LiquidMetalCard } from "@/components/cities/LiquidMetalCard";
import { ImageUploader } from "@/components/cities/ImageUploader";
import { PlaceImageUploader } from "@/components/cities/PlaceImageUploader";
import { CityData, Place, PLACE_CATEGORIES, calculateSEOScore } from "@/types/cities";

type TabType = 'general' | 'content' | 'places' | 'businesses' | 'gallery' | 'publish';

const TABS: { id: TabType; label: string; icon: React.ElementType; description: string }[] = [
    { id: 'general', label: 'Genel', icon: Settings, description: 'Temel bilgiler ve SEO' },
    { id: 'content', label: 'İçerik', icon: FileText, description: 'Detaylı rehber içeriği' },
    { id: 'places', label: 'Gezilecek Yerler', icon: MapPin, description: 'Turistik mekanlar' },
    { id: 'businesses', label: 'İşletmeler', icon: Building2, description: 'Öne çıkan işletmeler' },
    { id: 'gallery', label: 'Galeri', icon: ImageIcon, description: 'Fotoğraf ve videolar' },
    { id: 'publish', label: 'Yayınla', icon: Globe, description: 'Yayınlama ayarları' },
];

export default function CityEditPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<TabType>('general');
    const [unsavedChanges, setUnsavedChanges] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

    const [data, setData] = useState<CityData>({
        id: '',
        name: '',
        plate: '',
        slug: '',
        seoTitle: '',
        seoDescription: '',
        tagline: '',
        shortDescription: '',
        content: '',
        tags: [],
        coverImage: '',
        coverImageAlt: '',
        gallery: [],
        places: [],
        status: 'draft',
    });

    const [newTag, setNewTag] = useState('');

    // Load Data
    useEffect(() => {
        fetch("/api/cities")
            .then((res) => res.json())
            .then((cities) => {
                // cities array kontrolü
                if (!Array.isArray(cities)) {
                    console.error("Cities API did not return an array:", cities);
                    setLoading(false);
                    return;
                }

                const city = cities.find((c: any) => c.id === id);
                if (city) {
                    // Null güvenli places mapping
                    const cityPlaces = (city.places || []).map((p: any, i: number) => ({
                        ...p,
                        id: p.id || Date.now().toString() + i,
                        images: (p.images || [p.image]).filter(Boolean),
                        order: p.order || i
                    }));

                    setData({
                        ...data,
                        ...city,
                        seoTitle: city.seoTitle || `${city.name} Gezi Rehberi | En İyi Mekanlar`,
                        seoDescription: city.seoDescription || `${city.name} şehri için kapsamlı gezi rehberi. Gezilecek yerler, restoranlar ve daha fazlası.`,
                        tags: city.tags || [],
                        gallery: city.gallery || [],
                        places: cityPlaces,
                        status: city.status || 'draft',
                    });
                }
                setLoading(false);
            })
            .catch((error) => {
                console.error("Failed to load city data:", error);
                setLoading(false);
            });
    }, [id]);

    // Auto-save to localStorage
    useEffect(() => {
        if (!unsavedChanges) return;
        const timer = setTimeout(() => {
            localStorage.setItem(`city_draft_${id}`, JSON.stringify(data));
        }, 5000);
        return () => clearTimeout(timer);
    }, [data, unsavedChanges, id]);

    const handleSave = async () => {
        setSaving(true);
        setSaveStatus('saving');
        try {
            const res = await fetch("/api/cities", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });

            if (res.ok) {
                setUnsavedChanges(false);
                setSaveStatus('saved');
                localStorage.removeItem(`city_draft_${id}`);
            } else {
                setSaveStatus('error');
            }
        } catch (error) {
            console.error(error);
            setSaveStatus('error');
        } finally {
            setSaving(false);
            // 3 saniye sonra status'u resetle
            setTimeout(() => setSaveStatus('idle'), 3000);
        }
    };

    // Görsel için otomatik kaydetme
    const autoSaveImage = async (key: keyof CityData, value: string) => {
        setSaveStatus('saving');
        try {
            const payload = { ...data, [key]: value };
            console.log('[Auto-save] Sending:', {
                id: payload.id,
                name: payload.name,
                key,
                valueLength: value?.length,
                valuePreview: value?.substring(0, 60) + '...'
            });

            const res = await fetch("/api/cities", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const result = await res.json();
            console.log('[Auto-save] Response:', result);

            if (res.ok) {
                setSaveStatus('saved');
                setUnsavedChanges(false);
            } else {
                console.error('[Auto-save] Failed response:', result);
                setSaveStatus('error');
            }
        } catch (error) {
            console.error("[Auto-save] Exception:", error);
            setSaveStatus('error');
        } finally {
            // 3 saniye sonra status'u resetle
            setTimeout(() => setSaveStatus('idle'), 3000);
        }
    };

    const updateData = (key: keyof CityData, value: any) => {
        setData(prev => ({ ...prev, [key]: value }));
        setUnsavedChanges(true);

        // Görsel yüklenirse otomatik kaydet
        if ((key === 'coverImage' || key === 'coverImageAlt') && typeof value === 'string' && value.startsWith('https://')) {
            autoSaveImage(key, value);
        }
    };

    // Place Management
    const addPlace = () => {
        const newPlace: Place = {
            id: Date.now().toString(),
            name: '',
            category: 'manzara',
            images: [],
            shortDesc: '',
            content: '',
            rating: 5,
            order: (data.places || []).length,
        };
        updateData('places', [...(data.places || []), newPlace]);
    };

    const updatePlace = (placeId: string, key: keyof Place, value: any) => {
        const updatedPlaces = (data.places || []).map(p =>
            p.id === placeId ? { ...p, [key]: value } : p
        );
        updateData('places', updatedPlaces);

        // Place görseli yüklenirse otomatik kaydet
        if (key === 'images' && Array.isArray(value) && value.length > 0 && value[0]?.startsWith('https://')) {
            // Tüm city datasını güncelle ve kaydet
            const updatedCity = { ...data, places: updatedPlaces };
            setSaveStatus('saving');
            fetch("/api/cities", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updatedCity)
            })
            .then(res => res.json())
            .then(() => {
                setSaveStatus('saved');
                setUnsavedChanges(false);
            })
            .catch(() => setSaveStatus('error'))
            .finally(() => setTimeout(() => setSaveStatus('idle'), 3000));
        }
    };

    const removePlace = (placeId: string) => {
        updateData('places', (data.places || []).filter(p => p.id !== placeId));
    };

    // Tag Management
    const addTag = () => {
        const currentTags = data.tags || [];
        if (newTag && !currentTags.includes(newTag)) {
            updateData('tags', [...currentTags, newTag]);
            setNewTag('');
        }
    };

    const removeTag = (tag: string) => {
        updateData('tags', (data.tags || []).filter(t => t !== tag));
    };

    const seoScore = calculateSEOScore(data);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-white/10 border-t-[#fe1e50] rounded-full animate-spin" />
                    <span className="text-white/50">Rehber yükleniyor...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pb-24">
            {/* Header */}
            <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="sticky top-0 z-50 bg-[#0a0a0f]/95 backdrop-blur-xl border-b border-white/[0.08]"
            >
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link 
                                href="/dashboard/cities" 
                                className="p-2 hover:bg-white/[0.05] rounded-xl transition-colors group"
                            >
                                <ArrowLeft className="w-5 h-5 text-white/60 group-hover:text-white" />
                            </Link>
                            <div>
                                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                                    {data.name}
                                    <span className="text-sm font-normal text-white/40 px-2 py-0.5 bg-white/[0.05] rounded-lg">
                                        Plaka: {data.plate}
                                    </span>
                                    {data.status === 'published' && (
                                        <span className="text-xs px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30">
                                            Yayında
                                        </span>
                                    )}
                                </h1>
                                <p className="text-sm text-white/40">
                                    Şehir rehberini düzenliyorsunuz
                                    {unsavedChanges && <span className="text-amber-400 ml-2">• Kaydedilmemiş değişiklikler</span>}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className={`
                                flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium
                                ${seoScore >= 80 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                  seoScore >= 50 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                  'bg-red-500/10 text-red-400 border border-red-500/20'}
                            `}>
                                <TrendingUp className="w-4 h-4" />
                                SEO: {seoScore}/100
                            </div>

                            {/* Auto-save Status Indicator */}
                            {saveStatus !== 'idle' && (
                                <div className={`
                                    flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium
                                    ${saveStatus === 'saved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                      saveStatus === 'saving' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                      'bg-red-500/10 text-red-400 border border-red-500/20'}
                                `}>
                                    {saveStatus === 'saved' && <CheckCircle className="w-3.5 h-3.5" />}
                                    {saveStatus === 'saving' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                    {saveStatus === 'error' && <AlertCircle className="w-3.5 h-3.5" />}
                                    <span className="text-xs">
                                        {saveStatus === 'saved' ? 'Kaydedildi' :
                                         saveStatus === 'saving' ? 'Kaydediliyor...' :
                                         'Hata'}
                                    </span>
                                </div>
                            )}

                            <button className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white/[0.05] hover:bg-white/[0.1] text-white/80 rounded-xl transition-colors text-sm font-medium">
                                <Eye className="w-4 h-4" />
                                Önizle
                            </button>

                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex items-center gap-2 px-5 py-2 bg-[#fe1e50] hover:bg-[#fe1e50]/90 text-white rounded-xl transition-all text-sm font-bold shadow-lg shadow-[#fe1e50]/20 disabled:opacity-50"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                {saving ? 'Kaydediliyor...' : 'Kaydet'}
                            </button>
                        </div>
                    </div>

                    {/* Tab Navigation */}
                    <div className="flex gap-1 mt-4 overflow-x-auto scrollbar-hide pb-1">
                        {TABS.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`
                                        flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap
                                        ${isActive 
                                            ? 'bg-[#fe1e50] text-white shadow-lg shadow-[#fe1e50]/25' 
                                            : 'text-white/50 hover:text-white hover:bg-white/[0.05]'
                                        }
                                    `}
                                >
                                    <Icon className="w-4 h-4" />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </motion.div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 py-6">
                <AnimatePresence mode="wait">
                    {activeTab === 'general' && (
                        <TabGeneral 
                            data={data} 
                            updateData={updateData} 
                            newTag={newTag}
                            setNewTag={setNewTag}
                            addTag={addTag}
                            removeTag={removeTag}
                        />
                    )}
                    {activeTab === 'content' && (
                        <TabContent data={data} updateData={updateData} />
                    )}
                    {activeTab === 'places' && (
                        <TabPlaces 
                            data={data} 
                            addPlace={addPlace}
                            updatePlace={updatePlace}
                            removePlace={removePlace}
                        />
                    )}
                    {activeTab === 'businesses' && <TabBusinesses />}
                    {activeTab === 'gallery' && <TabGallery />}
                    {activeTab === 'publish' && (
                        <TabPublish 
                            data={data} 
                            updateData={updateData}
                            handleSave={handleSave}
                            saving={saving}
                            seoScore={seoScore}
                        />
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

// Tab Components
function TabGeneral({ 
    data, 
    updateData, 
    newTag, 
    setNewTag, 
    addTag, 
    removeTag 
}: { 
    data: CityData; 
    updateData: (key: keyof CityData, value: any) => void;
    newTag: string;
    setNewTag: (v: string) => void;
    addTag: () => void;
    removeTag: (t: string) => void;
}) {
    return (
        <motion.div
            key="general"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
            <div className="lg:col-span-2 space-y-6">
                <LiquidMetalCard>
                    <div className="p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-[#fe1e50]/10 flex items-center justify-center">
                                <Settings className="w-5 h-5 text-[#fe1e50]" />
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-lg">Temel Bilgiler</h3>
                                <p className="text-white/40 text-sm">Şehir hakkında temel bilgiler</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-white/60 mb-2">Şehir Sloganı (Tagline)</label>
                                <input
                                    type="text"
                                    value={data.tagline}
                                    onChange={(e) => updateData('tagline', e.target.value)}
                                    className="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#fe1e50]/50 transition-all"
                                    placeholder="Örn: Mavinin ve yeşilin buluştuğu oksijen diyarı"
                                />
                                <p className="text-xs text-white/30 mt-1">{data.tagline.length}/100 karakter</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-white/60 mb-2">Kısa Açıklama</label>
                                <textarea
                                    value={data.shortDescription}
                                    onChange={(e) => updateData('shortDescription', e.target.value)}
                                    rows={3}
                                    className="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#fe1e50]/50 transition-all resize-none"
                                    placeholder="Şehrin kısa özeti (150 karakter)"
                                />
                                <p className="text-xs text-white/30 mt-1">{data.shortDescription.length}/150 karakter</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-white/60 mb-2">
                                    <Tag className="w-4 h-4 inline mr-1" /> Etiketler
                                </label>
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {data.tags.map((tag) => (
                                        <span key={tag} className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#fe1e50]/10 text-[#fe1e50] rounded-lg text-sm border border-[#fe1e50]/20">
                                            {tag}
                                            <button onClick={() => removeTag(tag)} className="hover:text-white"><X className="w-3 h-3" /></button>
                                        </span>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newTag}
                                        onChange={(e) => setNewTag(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                                        className="flex-1 px-4 py-2 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#fe1e50]/50"
                                        placeholder="Yeni etiket ekle (Enter)"
                                    />
                                    <button onClick={addTag} className="px-4 py-2 bg-white/[0.05] hover:bg-white/[0.1] text-white rounded-xl transition-colors">
                                        <Plus className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </LiquidMetalCard>

                <LiquidMetalCard delay={0.1}>
                    <div className="p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                                <Globe className="w-5 h-5 text-emerald-400" />
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-lg">SEO Ayarları</h3>
                                <p className="text-white/40 text-sm">Arama motoru optimizasyonu</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-white/60 mb-2">Meta Title</label>
                                <input
                                    type="text"
                                    value={data.seoTitle}
                                    onChange={(e) => updateData('seoTitle', e.target.value)}
                                    className="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#fe1e50]/50 transition-all"
                                    placeholder="Sayfa başlığı"
                                />
                                <p className={`text-xs mt-1 ${data.seoTitle.length > 70 ? 'text-red-400' : 'text-white/30'}`}>
                                    {data.seoTitle.length}/70 karakter
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-white/60 mb-2">Meta Description</label>
                                <textarea
                                    value={data.seoDescription}
                                    onChange={(e) => updateData('seoDescription', e.target.value)}
                                    rows={3}
                                    className="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#fe1e50]/50 transition-all resize-none"
                                    placeholder="Sayfa açıklaması"
                                />
                                <p className={`text-xs mt-1 ${data.seoDescription.length > 160 ? 'text-red-400' : 'text-white/30'}`}>
                                    {data.seoDescription.length}/160 karakter
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-white/60 mb-2">Canonical URL (Opsiyonel)</label>
                                <input
                                    type="text"
                                    value={data.canonicalUrl || ''}
                                    onChange={(e) => updateData('canonicalUrl', e.target.value)}
                                    className="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#fe1e50]/50 transition-all"
                                    placeholder="https://tikprofil.com/sehir/slug"
                                />
                            </div>
                        </div>
                    </div>
                </LiquidMetalCard>
            </div>

            <div className="space-y-6">
                <LiquidMetalCard>
                    <div className="p-6">
                        <ImageUploader
                            value={data.coverImage}
                            onChange={(url) => updateData('coverImage', url)}
                            alt={data.coverImageAlt}
                            onAltChange={(alt) => updateData('coverImageAlt', alt)}
                            aspectRatio="video"
                            label="Kapak Görseli"
                            description="Drag & drop veya tıklayarak R2'ye yükle"
                        />
                    </div>
                </LiquidMetalCard>

                <LiquidMetalCard delay={0.1}>
                    <div className="p-6">
                        <h3 className="font-bold text-white text-lg mb-4">İçerik Durumu</h3>
                        <div className="space-y-3">
                            {[
                                { label: 'Gezilecek Yer', value: (data.places || []).length },
                                { label: 'Galeri', value: `${(data.gallery || []).length} fotoğraf` },
                                { label: 'Etiket', value: (data.tags || []).length },
                                { label: 'Kelime Sayısı', value: (data.content || '').length },
                            ].map((stat, i) => (
                                <div key={i} className="flex items-center justify-between py-2 border-b border-white/[0.05] last:border-0">
                                    <span className="text-white/60">{stat.label}</span>
                                    <span className="text-white font-bold">{stat.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </LiquidMetalCard>
            </div>
        </motion.div>
    );
}

function TabContent({ data, updateData }: { data: CityData; updateData: (key: keyof CityData, value: any) => void }) {
    return (
        <motion.div
            key="content"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
        >
            <LiquidMetalCard>
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                            <FileText className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <h3 className="font-bold text-white text-lg">Detaylı İçerik</h3>
                            <p className="text-white/40 text-sm">Rich text editör ile kapsamlı rehber içeriği oluşturun</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-2 p-2 bg-white/[0.03] rounded-xl border border-white/[0.05] flex-wrap">
                            {['H1', 'H2', 'B', 'I', 'Liste', 'Link', 'Görsel'].map((tool) => (
                                <button key={tool} className="px-3 py-1.5 hover:bg-white/[0.1] rounded-lg text-white/60 hover:text-white transition-colors text-sm">
                                    {tool}
                                </button>
                            ))}
                        </div>

                        <textarea
                            value={data.content || ''}
                            onChange={(e) => updateData('content', e.target.value)}
                            rows={20}
                            className="w-full px-4 py-4 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#fe1e50]/50 transition-all resize-none font-mono text-sm leading-relaxed"
                            placeholder="# Şehir Gezi Rehberi&#10;&#10;Şehrinizi tanıtan detaylı içerik..."
                        />

                        <div className="flex items-center justify-between text-sm">
                            <span className="text-white/40">
                                {(data.content || '').length} karakter | ~{Math.ceil((data.content || '').length / 200)} dk okuma
                            </span>
                            <span className={(data.content || '').length < 500 ? 'text-amber-400' : 'text-emerald-400'}>
                                {(data.content || '').length < 500 ? '⚠️ İçerik kısa' : '✓ İçerik iyi'}
                            </span>
                        </div>
                    </div>
                </div>
            </LiquidMetalCard>
        </motion.div>
    );
}

function TabPlaces({ 
    data, 
    addPlace, 
    updatePlace, 
    removePlace 
}: { 
    data: CityData; 
    addPlace: () => void;
    updatePlace: (id: string, key: keyof Place, value: any) => void;
    removePlace: (id: string) => void;
}) {
    return (
        <motion.div
            key="places"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
        >
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-white">Gezilecek Yerler</h2>
                    <p className="text-white/40 text-sm">{(data.places || []).length} mekan eklendi</p>
                </div>
                <button onClick={addPlace} className="flex items-center gap-2 px-5 py-2.5 bg-[#fe1e50] hover:bg-[#fe1e50]/90 text-white rounded-xl transition-all font-bold shadow-lg shadow-[#fe1e50]/20">
                    <Plus className="w-5 h-5" />
                    Yeni Yer Ekle
                </button>
            </div>

            <div className="space-y-4">
                {(data.places || []).map((place, index) => (
                    <LiquidMetalCard key={place.id} delay={index * 0.05}>
                        <div className="p-6">
                            <div className="flex items-start gap-4">
                                <button className="p-2 hover:bg-white/[0.05] rounded-lg text-white/30 cursor-move">
                                    <GripVertical className="w-5 h-5" />
                                </button>

                                <div className="flex-1 space-y-4">
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <input
                                            type="text"
                                            value={place.name}
                                            onChange={(e) => updatePlace(place.id, 'name', e.target.value)}
                                            className="flex-1 min-w-[200px] px-4 py-2 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white font-bold text-lg focus:outline-none focus:ring-2 focus:ring-[#fe1e50]/50"
                                            placeholder="Mekan adı"
                                        />
                                        <select
                                            value={place.category}
                                            onChange={(e) => updatePlace(place.id, 'category', e.target.value)}
                                            className="px-4 py-2 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#fe1e50]/50"
                                        >
                                            {PLACE_CATEGORIES.map(cat => (
                                                <option key={cat.value} value={cat.value}>
                                                    {cat.icon} {cat.label}
                                                </option>
                                            ))}
                                        </select>
                                        <button onClick={() => removePlace(place.id)} className="p-2 hover:bg-red-500/10 text-red-400 rounded-lg transition-colors">
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>

                                    <input
                                        type="text"
                                        value={place.shortDesc}
                                        onChange={(e) => updatePlace(place.id, 'shortDesc', e.target.value)}
                                        className="w-full px-4 py-2 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#fe1e50]/50"
                                        placeholder="Kısa açıklama"
                                    />

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="md:col-span-1">
                                            <label className="block text-xs text-white/40 mb-2">Mekan Görseli</label>
                                            <PlaceImageUploader
                                                value={place.images[0] || ''}
                                                onChange={(url) => updatePlace(place.id, 'images', [url])}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-white/40 mb-1">Açık Saatler</label>
                                            <input
                                                type="text"
                                                value={place.openingHours || ''}
                                                onChange={(e) => updatePlace(place.id, 'openingHours', e.target.value)}
                                                className="w-full px-3 py-2 bg-white/[0.05] border border-white/[0.1] rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#fe1e50]/50"
                                                placeholder="09:00 - 18:00"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-white/40 mb-1">Giriş Ücreti</label>
                                            <input
                                                type="text"
                                                value={place.entranceFee || ''}
                                                onChange={(e) => updatePlace(place.id, 'entranceFee', e.target.value)}
                                                className="w-full px-3 py-2 bg-white/[0.05] border border-white/[0.1] rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#fe1e50]/50"
                                                placeholder="Ücretsiz / 50 TL"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </LiquidMetalCard>
                ))}

                {data.places.length === 0 && (
                    <div className="text-center py-16">
                        <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-white/[0.05] flex items-center justify-center">
                            <MapPin className="w-10 h-10 text-white/20" />
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-2">Henüz Mekan Eklenmemiş</h3>
                        <p className="text-white/40 mb-6 max-w-md mx-auto">Şehir rehberinize gezilecek yerler ekleyerek ziyaretçilere daha fazla bilgi sunabilirsiniz.</p>
                        <button onClick={addPlace} className="inline-flex items-center gap-2 px-6 py-3 bg-[#fe1e50] hover:bg-[#fe1e50]/90 text-white rounded-xl transition-all font-bold shadow-lg shadow-[#fe1e50]/20">
                            <Plus className="w-5 h-5" />
                            İlk Mekanı Ekle
                        </button>
                    </div>
                )}
            </div>
        </motion.div>
    );
}

function TabBusinesses() {
    return (
        <motion.div key="businesses" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <LiquidMetalCard>
                <div className="p-12 text-center">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-white/[0.05] flex items-center justify-center">
                        <Building2 className="w-10 h-10 text-white/20" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">İşletmeler Modülü</h3>
                    <p className="text-white/40 mb-6 max-w-md mx-auto">Bu bölümde şehirdeki öne çıkan işletmeleri seçip rehbere ekleyebilirsiniz. (Yakında eklenecek)</p>
                    <span className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 text-amber-400 rounded-xl text-sm border border-amber-500/20">
                        <Clock className="w-4 h-4" /> Geliştirme aşamasında
                    </span>
                </div>
            </LiquidMetalCard>
        </motion.div>
    );
}

function TabGallery() {
    return (
        <motion.div key="gallery" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <LiquidMetalCard>
                <div className="p-12 text-center">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-white/[0.05] flex items-center justify-center">
                        <ImageIcon className="w-10 h-10 text-white/20" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">Galeri Modülü</h3>
                    <p className="text-white/40 mb-6 max-w-md mx-auto">Şehir için fotoğraf galerisi oluşturun. Drag & drop ile kolayca yükleme yapın. (Yakında eklenecek)</p>
                    <span className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 text-amber-400 rounded-xl text-sm border border-amber-500/20">
                        <Clock className="w-4 h-4" /> Geliştirme aşamasında
                    </span>
                </div>
            </LiquidMetalCard>
        </motion.div>
    );
}

function TabPublish({ 
    data, 
    updateData, 
    handleSave, 
    saving,
    seoScore 
}: { 
    data: CityData; 
    updateData: (key: keyof CityData, value: any) => void;
    handleSave: () => void;
    saving: boolean;
    seoScore: number;
}) {
    return (
        <motion.div key="publish" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="max-w-2xl mx-auto">
            <LiquidMetalCard>
                <div className="p-8">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-12 h-12 rounded-2xl bg-[#fe1e50]/10 flex items-center justify-center">
                            <Globe className="w-6 h-6 text-[#fe1e50]" />
                        </div>
                        <div>
                            <h3 className="font-bold text-white text-xl">Yayınlama Ayarları</h3>
                            <p className="text-white/40">Rehberinizi yayınlayın veya planlayın</p>
                        </div>
                    </div>

                    <div className="space-y-4 mb-8">
                        <label className="block text-sm font-medium text-white/60 mb-3">Yayın Durumu</label>
                        {[
                            { id: 'draft', label: 'Taslak', desc: 'Henüz yayınlanmadı, sadece siz görebilirsiniz', icon: FileText },
                            { id: 'published', label: 'Yayında', desc: 'Herkese açık, herkes görebilir', icon: Globe },
                            { id: 'scheduled', label: 'Planlı', desc: 'Belirli bir tarihte otomatik yayınlanacak', icon: Calendar },
                        ].map((option) => {
                            const Icon = option.icon;
                            const isSelected = data.status === option.id;
                            return (
                                <button
                                    key={option.id}
                                    onClick={() => updateData('status', option.id)}
                                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left ${
                                        isSelected ? 'bg-[#fe1e50]/10 border-[#fe1e50]/50' : 'bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.05]'
                                    }`}
                                >
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                        isSelected ? 'bg-[#fe1e50] text-white' : 'bg-white/[0.05] text-white/40'
                                    }`}>
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-semibold text-white">{option.label}</div>
                                        <div className="text-sm text-white/40">{option.desc}</div>
                                    </div>
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                        isSelected ? 'border-[#fe1e50] bg-[#fe1e50]' : 'border-white/20'
                                    }`}>
                                        {isSelected && <CheckCircle className="w-3 h-3 text-white" />}
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {data.status === 'scheduled' && (
                        <div className="mb-8 p-4 bg-white/[0.03] rounded-2xl border border-white/[0.08]">
                            <label className="block text-sm font-medium text-white/60 mb-2">Yayınlanma Tarihi</label>
                            <input type="datetime-local" className="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#fe1e50]/50" />
                        </div>
                    )}

                    <div className="mb-8">
                        <h4 className="font-semibold text-white mb-4">Yayınlama Kontrol Listesi</h4>
                        <div className="space-y-3">
                            {[
                                { label: 'Kapak görseli eklendi', check: !!data.coverImage },
                                { label: 'SEO başlığı yazıldı', check: data.seoTitle.length > 10 },
                                { label: 'SEO açıklaması yazıldı', check: data.seoDescription.length > 50 },
                                { label: 'İçerik uzunluğu yeterli', check: data.content.length > 500 },
                                { label: 'En az bir gezilecek yer eklendi', check: data.places.length > 0 },
                            ].map((item, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                                        item.check ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white/30'
                                    }`}>
                                        {item.check ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                                    </div>
                                    <span className={item.check ? 'text-white/80' : 'text-white/40'}>{item.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full py-4 bg-[#fe1e50] hover:bg-[#fe1e50]/90 text-white rounded-2xl transition-all font-bold text-lg shadow-xl shadow-[#fe1e50]/20 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                        {data.status === 'published' ? 'Güncellemeleri Yayınla' : 
                         data.status === 'scheduled' ? 'Planla' : 'Taslak Olarak Kaydet'}
                    </button>

                    <div className="mt-6 p-4 bg-white/[0.03] rounded-xl">
                        <div className="text-xs text-white/40 mb-1">Yayın URL&apos;i</div>
                        <div className="text-sm text-white/60 font-mono">https://tikprofil.com/sehir/{data.slug}</div>
                    </div>
                </div>
            </LiquidMetalCard>
        </motion.div>
    );
}
