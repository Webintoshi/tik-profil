"use client";

import { useState, useEffect, useCallback } from "react";
import {
    BarChart3,
    TrendingUp,
    BedDouble,
    Clock,
    Loader2,
} from "lucide-react";
import { useBusinessContext } from "@/components/panel/BusinessSessionContext";

interface Stats {
    totalRooms: number;
    totalRoomTypes: number;
    totalRequests: number;
    pendingRequests: number;
    roomsByStatus: Record<string, number>;
    requestsByType: Record<string, number>;
}

const STATUS_LABELS: Record<string, string> = {
    available: "Boş",
    occupied: "Dolu",
    cleaning: "Temizleniyor",
    maintenance: "Bakımda",
};

export default function HotelAnalyticsPage() {
    const session = useBusinessContext();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<Stats>({
        totalRooms: 0,
        totalRoomTypes: 0,
        totalRequests: 0,
        pendingRequests: 0,
        roomsByStatus: {},
        requestsByType: {},
    });

    const loadStats = useCallback(async () => {
        if (!session?.businessId) return;

        try {
            const [roomsRes, typesRes, requestsRes] = await Promise.all([
                fetch(`/api/hotel/rooms?businessId=${session.businessId}`),
                fetch(`/api/hotel/room-types?businessId=${session.businessId}`),
                fetch(`/api/hotel/requests?businessId=${session.businessId}`),
            ]);

            const roomsData = await roomsRes.json();
            const typesData = await typesRes.json();
            const requestsData = await requestsRes.json();

            const rooms = roomsData.rooms || [];
            const roomTypes = typesData.roomTypes || [];
            const requests = requestsData.requests || [];

            // Calculate stats
            const roomsByStatus: Record<string, number> = {};
            rooms.forEach((r: { status: string }) => {
                roomsByStatus[r.status] = (roomsByStatus[r.status] || 0) + 1;
            });

            const requestsByType: Record<string, number> = {};
            requests.forEach((r: { requestType: string }) => {
                requestsByType[r.requestType] = (requestsByType[r.requestType] || 0) + 1;
            });

            const pendingRequests = requests.filter(
                (r: { status: string }) => r.status === "pending" || r.status === "in_progress"
            ).length;

            setStats({
                totalRooms: rooms.length,
                totalRoomTypes: roomTypes.length,
                totalRequests: requests.length,
                pendingRequests,
                roomsByStatus,
                requestsByType,
            });
        } catch (error) {
            console.error("Error loading stats:", error);
        } finally {
            setLoading(false);
        }
    }, [session?.businessId]);

    useEffect(() => {
        loadStats();
    }, [loadStats]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    const occupancyRate = stats.totalRooms > 0
        ? Math.round((stats.roomsByStatus.occupied || 0) / stats.totalRooms * 100)
        : 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Otel Analizi
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                    Otelinizin performans özeti
                </p>
            </div>

            {/* Main Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                            <BedDouble className="w-5 h-5 text-blue-500" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalRooms}</p>
                    <p className="text-sm text-gray-500">Toplam Oda</p>
                </div>

                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-xl">
                            <TrendingUp className="w-5 h-5 text-green-500" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{occupancyRate}%</p>
                    <p className="text-sm text-gray-500">Doluluk Oranı</p>
                </div>

                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                            <BarChart3 className="w-5 h-5 text-purple-500" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalRequests}</p>
                    <p className="text-sm text-gray-500">Toplam Talep</p>
                </div>

                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl">
                            <Clock className="w-5 h-5 text-yellow-500" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.pendingRequests}</p>
                    <p className="text-sm text-gray-500">Bekleyen Talep</p>
                </div>
            </div>

            {/* Room Status Breakdown */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Oda Durumları
                </h3>
                <div className="space-y-3">
                    {Object.entries(stats.roomsByStatus).map(([status, count]) => {
                        const percentage = stats.totalRooms > 0 ? (count / stats.totalRooms) * 100 : 0;
                        return (
                            <div key={status}>
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-gray-600 dark:text-gray-400">
                                        {STATUS_LABELS[status] || status}
                                    </span>
                                    <span className="font-semibold text-gray-900 dark:text-white">
                                        {count} oda ({Math.round(percentage)}%)
                                    </span>
                                </div>
                                <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full ${status === "available" ? "bg-green-500" :
                                            status === "occupied" ? "bg-red-500" :
                                                status === "cleaning" ? "bg-yellow-500" :
                                                    "bg-gray-500"
                                            }`}
                                        style={{ width: `${percentage}%` }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Info */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 text-center">
                <p className="text-blue-700 dark:text-blue-400 text-sm">
                    💡 Daha detaylı analizler ve raporlar yakında eklenecek
                </p>
            </div>
        </div>
    );
}
