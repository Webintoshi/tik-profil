"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader, GlassCard, Button } from "@/components/ui";
import {
    Plus, Edit2, Trash2, X, Check, Loader2, Search,
    MapPin, Phone, User, Bike, Car, Footprints, Battery,
    ToggleLeft, ToggleRight
} from "lucide-react";
import {
    type Courier,
    type VehicleType,
    type CourierStatus,
    subscribeToCouriers,
    createCourier,
    updateCourier,
    deleteCourier,
    VEHICLE_LABELS,
    VEHICLE_COLORS,
    STATUS_LABELS,
    STATUS_COLORS
} from "@/lib/courierService";
import clsx from "clsx";

export default function CouriersPage() {
    const [couriers, setCouriers] = useState<Courier[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCourier, setSelectedCourier] = useState<Courier | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingItem, setEditingItem] = useState<Courier | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const isSupabaseConfigured = Boolean(
            process.env.NEXT_PUBLIC_SUPABASE_URL &&
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        );

        if (isSupabaseConfigured) {
            const unsubscribe = subscribeToCouriers((data) => {
                setCouriers(data);
            });
            return () => unsubscribe();
        }
    }, []);

    const filteredCouriers = couriers.filter(c =>
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone.includes(searchQuery) ||
        c.region.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleDelete = async (id: string) => {
        if (!confirm("Bu kuryeyi silmek istediğinize emin misiniz?")) return;
        try {
            await deleteCourier(id);
            setCouriers(prev => prev.filter(c => c.id !== id));
            if (selectedCourier?.id === id) setSelectedCourier(null);
        } catch (error) {
            console.error("Delete error:", error);
        }
    };

    const getVehicleIcon = (type: VehicleType) => {
        switch (type) {
            case "motosiklet": return Bike;
            case "bisiklet": return Bike;
            case "ticari": return Car;
            case "yaya": return Footprints;
        }
    };

    const getBatteryColor = (level: number) => {
        if (level >= 60) return "#34C759";
        if (level >= 30) return "#FF9500";
        return "#FF3B30";
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Kurye Yönetimi"
                description={`${couriers.length} kurye · ${couriers.filter(c => c.status === "online").length} çevrimiçi`}
                action={
                    <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setShowAddModal(true)}>
                        Yeni Kurye Ekle
                    </Button>
                }
            />

            {/* Split View */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Left: Courier List */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-dark-500" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Kurye ara..."
                            className="w-full pl-12 pr-4 py-3 rounded-xl bg-dark-800 border border-dark-700 text-dark-100 placeholder-dark-500 focus:outline-none focus:border-accent-blue transition-colors"
                        />
                    </div>

                    {/* Courier List */}
                    <GlassCard padding="none" className="max-h-[600px] overflow-y-auto">
                        <AnimatePresence mode="popLayout">
                            {filteredCouriers.map((courier) => {
                                const VehicleIcon = getVehicleIcon(courier.vehicleType);
                                const isSelected = selectedCourier?.id === courier.id;

                                return (
                                    <motion.div
                                        key={courier.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        onClick={() => setSelectedCourier(courier)}
                                        className={clsx(
                                            "flex items-center gap-4 p-4 border-b border-dark-700/30 cursor-pointer transition-colors",
                                            isSelected ? "bg-accent-blue/10" : "hover:bg-dark-800/50"
                                        )}
                                    >
                                        {/* Avatar with vehicle ring */}
                                        <div className="relative">
                                            <div
                                                className="h-12 w-12 rounded-full bg-dark-700 flex items-center justify-center"
                                                style={{ boxShadow: `0 0 0 2px ${VEHICLE_COLORS[courier.vehicleType]}` }}
                                            >
                                                <User className="h-6 w-6 text-dark-300" />
                                            </div>
                                            {/* Status dot */}
                                            <div
                                                className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-dark-900"
                                                style={{ backgroundColor: STATUS_COLORS[courier.status] }}
                                            />
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-dark-100">
                                                    {courier.firstName} {courier.lastName}
                                                </span>
                                                {!courier.isActive && (
                                                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-500/15 text-red-500">Pasif</span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 text-xs text-dark-400 mt-1">
                                                <span className="flex items-center gap-1">
                                                    <MapPin className="h-3 w-3" />
                                                    {courier.region}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <VehicleIcon className="h-3 w-3" style={{ color: VEHICLE_COLORS[courier.vehicleType] }} />
                                                    {VEHICLE_LABELS[courier.vehicleType]}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Battery indicator */}
                                        <div className="flex flex-col items-center gap-1">
                                            <Battery className="h-4 w-4" style={{ color: getBatteryColor(courier.batteryLevel) }} />
                                            <span className="text-[10px] text-dark-500">{courier.batteryLevel}%</span>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>

                        {filteredCouriers.length === 0 && (
                            <div className="text-center py-12 text-dark-500">
                                {searchQuery ? "Sonuç bulunamadı" : "Henüz kurye eklenmemiş"}
                            </div>
                        )}
                    </GlassCard>
                </div>

                {/* Right: Map Placeholder / Detail */}
                <div className="lg:col-span-3">
                    <GlassCard className="h-[600px] flex flex-col">
                        {selectedCourier ? (
                            <>
                                {/* Courier Detail Header */}
                                <div className="flex items-center justify-between pb-4 border-b border-dark-700/50">
                                    <div className="flex items-center gap-4">
                                        <div
                                            className="h-14 w-14 rounded-full bg-dark-700 flex items-center justify-center"
                                            style={{ boxShadow: `0 0 0 3px ${VEHICLE_COLORS[selectedCourier.vehicleType]}` }}
                                        >
                                            <User className="h-7 w-7 text-dark-300" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold text-dark-100">
                                                {selectedCourier.firstName} {selectedCourier.lastName}
                                            </h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span
                                                    className="px-2 py-0.5 rounded-full text-xs font-medium"
                                                    style={{
                                                        backgroundColor: `${STATUS_COLORS[selectedCourier.status]}20`,
                                                        color: STATUS_COLORS[selectedCourier.status]
                                                    }}
                                                >
                                                    {STATUS_LABELS[selectedCourier.status]}
                                                </span>
                                                <span
                                                    className="px-2 py-0.5 rounded-full text-xs font-medium"
                                                    style={{
                                                        backgroundColor: `${VEHICLE_COLORS[selectedCourier.vehicleType]}20`,
                                                        color: VEHICLE_COLORS[selectedCourier.vehicleType]
                                                    }}
                                                >
                                                    {VEHICLE_LABELS[selectedCourier.vehicleType]}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setEditingItem(selectedCourier)}
                                            className="p-2 rounded-lg bg-dark-700 text-dark-300 hover:bg-dark-600"
                                        >
                                            <Edit2 className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(selectedCourier.id)}
                                            className="p-2 rounded-lg bg-dark-700 text-red-500 hover:bg-red-500/10"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Info Grid */}
                                <div className="grid grid-cols-2 gap-4 py-4 border-b border-dark-700/50">
                                    <div className="flex items-center gap-3">
                                        <Phone className="h-5 w-5 text-dark-500" />
                                        <div>
                                            <p className="text-xs text-dark-500">Telefon</p>
                                            <p className="text-sm text-dark-200">{selectedCourier.phone}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <MapPin className="h-5 w-5 text-dark-500" />
                                        <div>
                                            <p className="text-xs text-dark-500">Bölge</p>
                                            <p className="text-sm text-dark-200">{selectedCourier.region}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <User className="h-5 w-5 text-dark-500" />
                                        <div>
                                            <p className="text-xs text-dark-500">Kullanıcı Adı</p>
                                            <p className="text-sm text-dark-200 font-mono">{selectedCourier.username}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Battery className="h-5 w-5" style={{ color: getBatteryColor(selectedCourier.batteryLevel) }} />
                                        <div>
                                            <p className="text-xs text-dark-500">Günlük Durum</p>
                                            <p className="text-sm text-dark-200">{selectedCourier.batteryLevel}%</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Map Placeholder */}
                                <div className="flex-1 mt-4 rounded-xl bg-dark-800 border border-dark-700 flex items-center justify-center">
                                    <div className="text-center">
                                        <MapPin className="h-12 w-12 text-dark-600 mx-auto mb-3" />
                                        <p className="text-dark-400 font-medium">Harita Görünümü</p>
                                        <p className="text-xs text-dark-500 mt-1">Konum verisi bekleniyor...</p>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex items-center justify-center">
                                <div className="text-center">
                                    <Bike className="h-16 w-16 text-dark-600 mx-auto mb-4" />
                                    <p className="text-dark-400 font-medium">Kurye Seçin</p>
                                    <p className="text-xs text-dark-500 mt-1">Detayları görüntülemek için listeden bir kurye seçin</p>
                                </div>
                            </div>
                        )}
                    </GlassCard>
                </div>
            </div>

            {/* Add/Edit Modal */}
            <AnimatePresence>
                {(showAddModal || editingItem) && (
                    <CourierModal
                        item={editingItem}
                        onClose={() => {
                            setShowAddModal(false);
                            setEditingItem(null);
                        }}
                        onSave={async (data) => {
                            setIsLoading(true);
                            try {
                                if (editingItem) {
                                    await updateCourier(editingItem.id, data);
                                    setCouriers(prev => prev.map(c =>
                                        c.id === editingItem.id ? { ...c, ...data } : c
                                    ));
                                    if (selectedCourier?.id === editingItem.id) {
                                        setSelectedCourier({ ...selectedCourier, ...data });
                                    }
                                } else {
                                    const id = await createCourier(data);
                                    setCouriers(prev => [...prev, { ...data, id, createdAt: new Date() }]);
                                }
                                setShowAddModal(false);
                                setEditingItem(null);
                            } catch (error) {
                                console.error("Save error:", error);
                            }
                            setIsLoading(false);
                        }}
                        isLoading={isLoading}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

// Courier Modal
function CourierModal({
    item,
    onClose,
    onSave,
    isLoading
}: {
    item: Courier | null;
    onClose: () => void;
    onSave: (data: Omit<Courier, "id" | "createdAt">) => void;
    isLoading: boolean;
}) {
    const [firstName, setFirstName] = useState(item?.firstName || "");
    const [lastName, setLastName] = useState(item?.lastName || "");
    const [phone, setPhone] = useState(item?.phone || "");
    const [tcKimlik, setTcKimlik] = useState(item?.tcKimlik || "");
    const [vehicleType, setVehicleType] = useState<VehicleType>(item?.vehicleType || "motosiklet");
    const [region, setRegion] = useState(item?.region || "");
    const [username, setUsername] = useState(item?.username || "");
    const [password, setPassword] = useState("");
    const [isActive, setIsActive] = useState(item?.isActive ?? true);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSave({
            firstName,
            lastName,
            phone,
            tcKimlik: tcKimlik || undefined,
            vehicleType,
            region,
            status: item?.status || "offline",
            isActive,
            username: username || `${firstName.toLowerCase()}.${lastName.toLowerCase()}`,
            passwordHash: password ? btoa(password) : item?.passwordHash || "",
            batteryLevel: item?.batteryLevel || 100,
            lastLocation: item?.lastLocation,
        });
    };

    return (
        <>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 z-50 bg-dark-950/80 backdrop-blur-md"
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto pointer-events-none"
            >
                <div
                    onClick={(e) => e.stopPropagation()}
                    className="w-full max-w-lg rounded-2xl border border-dark-700/50 max-h-[90vh] overflow-y-auto pointer-events-auto"
                    style={{ background: "rgba(28, 28, 30, 0.95)", backdropFilter: "blur(40px)" }}
                >
                    {/* Header */}
                    <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-dark-700/50 bg-dark-900/90 backdrop-blur">
                        <h2 className="text-lg font-semibold text-dark-100">
                            {item ? "Kurye Düzenle" : "Yeni Kurye Ekle"}
                        </h2>
                        <button onClick={onClose} className="p-2 rounded-lg hover:bg-dark-700">
                            <X className="h-5 w-5 text-dark-400" />
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="p-6 space-y-5">
                        {/* Kimlik Section */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-medium text-dark-400">Kimlik Bilgileri</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-dark-300 mb-2">Ad</label>
                                    <input
                                        type="text"
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        required
                                        className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-dark-700 text-dark-100 focus:outline-none focus:border-accent-blue"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-dark-300 mb-2">Soyad</label>
                                    <input
                                        type="text"
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        required
                                        className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-dark-700 text-dark-100 focus:outline-none focus:border-accent-blue"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-dark-300 mb-2">Telefon</label>
                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        placeholder="5XX XXX XX XX"
                                        required
                                        className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-dark-700 text-dark-100 placeholder-dark-500 focus:outline-none focus:border-accent-blue"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-dark-300 mb-2">TC Kimlik (Opsiyonel)</label>
                                    <input
                                        type="text"
                                        value={tcKimlik}
                                        onChange={(e) => setTcKimlik(e.target.value)}
                                        maxLength={11}
                                        className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-dark-700 text-dark-100 focus:outline-none focus:border-accent-blue"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Vehicle & Region */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-medium text-dark-400">Araç & Bölge</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-dark-300 mb-2">Araç Tipi</label>
                                    <select
                                        value={vehicleType}
                                        onChange={(e) => setVehicleType(e.target.value as VehicleType)}
                                        className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-dark-700 text-dark-100 focus:outline-none focus:border-accent-blue"
                                    >
                                        <option value="motosiklet">Motosiklet</option>
                                        <option value="bisiklet">Bisiklet</option>
                                        <option value="ticari">Ticari Araç</option>
                                        <option value="yaya">Yaya</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-dark-300 mb-2">Bölge</label>
                                    <input
                                        type="text"
                                        value={region}
                                        onChange={(e) => setRegion(e.target.value)}
                                        placeholder="Örn: Kadıköy"
                                        required
                                        className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-dark-700 text-dark-100 placeholder-dark-500 focus:outline-none focus:border-accent-blue"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Credentials */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-medium text-dark-400">Giriş Bilgileri</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-dark-300 mb-2">Kullanıcı Adı</label>
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        placeholder="ad.soyad"
                                        className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-dark-700 text-dark-100 placeholder-dark-500 focus:outline-none focus:border-accent-blue font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-dark-300 mb-2">
                                        {item ? "Yeni Şifre (boş bırakın)" : "Şifre"}
                                    </label>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required={!item}
                                        className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-dark-700 text-dark-100 focus:outline-none focus:border-accent-blue"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Status */}
                        <div className="flex items-center justify-between pt-2">
                            <span className="text-sm font-medium text-dark-300">Kurye Durumu</span>
                            <button
                                type="button"
                                onClick={() => setIsActive(!isActive)}
                                className={clsx(
                                    "flex items-center gap-2 px-4 py-2 rounded-xl transition-colors",
                                    isActive
                                        ? "bg-accent-green/15 text-accent-green"
                                        : "bg-dark-700 text-dark-400"
                                )}
                            >
                                {isActive ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
                                {isActive ? "Aktif" : "Pasif"}
                            </button>
                        </div>

                        {/* Submit */}
                        <div className="flex gap-3 pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-4 py-3 rounded-xl bg-dark-700 text-dark-200 hover:bg-dark-600 font-medium transition-colors"
                            >
                                İptal
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading || !firstName || !lastName || !phone || !region}
                                className="flex-1 px-4 py-3 rounded-xl bg-accent-blue text-white font-medium hover:bg-accent-blue/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
                                {item ? "Güncelle" : "Kaydet"}
                            </button>
                        </div>
                    </form>
                </div>
            </motion.div>
        </>
    );
}
