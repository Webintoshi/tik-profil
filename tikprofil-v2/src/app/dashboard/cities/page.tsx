"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Edit, MapPin, Search } from "lucide-react";

export default function CitiesPage() {
    const [cities, setCities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    useEffect(() => {
        fetch("/api/cities")
            .then((res) => res.json())
            .then((data) => {
                setCities(data);
                setLoading(false);
            });
    }, []);

    const filteredCities = cities.filter((city) =>
        city.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Şehir Rehberi Yönetimi</h1>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Şehir Ara..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10 pr-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>

            {loading ? (
                <div className="text-center py-10">Yükleniyor...</div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="px-6 py-4 font-semibold text-gray-600">Şehir</th>
                                <th className="px-6 py-4 font-semibold text-gray-600">Durum</th>
                                <th className="px-6 py-4 font-semibold text-gray-600 text-right">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {filteredCities.map((city) => (
                                <tr key={city.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                                            {city.plate}
                                        </div>
                                        <span className="font-medium text-gray-900">{city.name}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {city.description ? (
                                            <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold">
                                                Aktif
                                            </span>
                                        ) : (
                                            <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-bold">
                                                Boş
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <Link
                                            href={`/dashboard/cities/${city.id}`}
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                                        >
                                            <Edit className="w-4 h-4" />
                                            Düzenle
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
