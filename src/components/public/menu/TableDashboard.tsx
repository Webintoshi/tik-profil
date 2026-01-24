import { useState } from "react";
import { Wifi, Check } from "lucide-react";
import { clsx } from "clsx";
import { toast } from "sonner";

interface TableDashboardProps {
    tableId: string;
    tableName?: string;
    wifiPassword?: string;
    theme?: string;
}

export function TableDashboard({
    tableId,
    tableName,
    wifiPassword,
    theme = 'modern'
}: TableDashboardProps) {
    const [copied, setCopied] = useState(false);

    const handleCopyWifi = () => {
        if (!wifiPassword) return;
        navigator.clipboard.writeText(wifiPassword);
        setCopied(true);
        toast.success("WiFi şifresi kopyalandı!");
        setTimeout(() => setCopied(false), 2000);
    };

    if (!wifiPassword) return null;

    return (
        <div className="sticky top-0 z-40 px-4 py-4 bg-white border-b border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs animate-pulse" style={{ backgroundColor: '#fe1e50', color: 'white' }}>
                        {tableName ? tableName.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() : "M"}
                    </div>
                    <div>
                        <p className="text-xs font-medium text-gray-500">Masa Servisi</p>
                        <p className="text-sm font-bold text-gray-900">{tableName || "Masa " + tableId.slice(0, 4)}</p>
                    </div>
                </div>

                {wifiPassword && (
                    <button
                        onClick={handleCopyWifi}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all active:scale-95 bg-gray-100 hover:bg-gray-200 text-gray-700"
                    >
                        {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Wifi className="w-3.5 h-3.5" />}
                        {copied ? "Kopyalandı" : "WiFi"}
                    </button>
                )}
            </div>
        </div>
    );
}
