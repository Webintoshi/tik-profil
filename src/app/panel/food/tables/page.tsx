"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Plus,
    Trash2,
    Edit3,
    Check,
    X,
    QrCode,
    Copy,
    Download,
    ScanLine,
    Loader2
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useTheme } from "@/components/panel/ThemeProvider";
import { useBusinessSession } from "@/hooks/useBusinessSession";
import clsx from "clsx";
import { toast } from "sonner";
import {
    FBTable,
    subscribeToTables,
    createTable,
    updateTable,
    deleteTable,
    getTableQRUrl,
    getBusinessById
} from "@/lib/services/foodService";

export default function TablesPage() {
    const { isDark } = useTheme();
    const { session, isLoading: sessionLoading } = useBusinessSession();

    const [tables, setTables] = useState<FBTable[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [businessSlug, setBusinessSlug] = useState("");
    const [newTableName, setNewTableName] = useState("");
    const [editingTable, setEditingTable] = useState<string | null>(null);
    const [editingName, setEditingName] = useState("");
    const [selectedTable, setSelectedTable] = useState<FBTable | null>(null);
    const [isAdding, setIsAdding] = useState(false);

    // Theme colors
    const cardBg = isDark ? "bg-[#111]" : "bg-white";
    const borderColor = isDark ? "border-[#222]" : "border-gray-200";
    const textPrimary = isDark ? "text-white" : "text-gray-900";
    const textSecondary = isDark ? "text-gray-400" : "text-gray-600";
    const inputBg = isDark ? "bg-[#0a0a0a] border-[#222]" : "bg-gray-50 border-gray-200";

    // Load business info and subscribe to tables
    useEffect(() => {
        if (!session?.businessId) return;

        // Get business slug
        getBusinessById(session.businessId).then(business => {
            if (business?.slug) {
                setBusinessSlug(business.slug);
            }
        });

        // Subscribe to real-time tables
        const unsubscribe = subscribeToTables(session.businessId, (data) => {
            setTables(data);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [session?.businessId]);

    // Add table
    const handleAddTable = async () => {
        if (!newTableName.trim() || !session?.businessId) {
            toast.error("Masa adı girin");
            return;
        }

        setIsAdding(true);
        try {
            await createTable(session.businessId, newTableName.trim());
            setNewTableName("");
            toast.success("Masa eklendi");
        } catch (error) {
            console.error("Error adding table:", error);
            toast.error("Masa eklenirken hata oluştu");
        } finally {
            setIsAdding(false);
        }
    };

    // Save table edit
    const saveTableEdit = async () => {
        if (!editingName.trim() || !editingTable) return;

        try {
            await updateTable(editingTable, editingName.trim());
            setEditingTable(null);
            toast.success("Masa güncellendi");
        } catch (error) {
            console.error("Error updating table:", error);
            toast.error("Güncelleme hatası");
        }
    };

    // Delete table
    const handleDeleteTable = async (id: string) => {
        if (!confirm("Bu masayı silmek istediğinize emin misiniz?")) return;

        try {
            await deleteTable(id);
            toast.success("Masa silindi");
        } catch (error) {
            console.error("Error deleting table:", error);
            toast.error("Silme hatası");
        }
    };

    // Copy QR URL
    const copyQRUrl = (table: FBTable) => {
        const url = getTableQRUrl(businessSlug, table.id);
        navigator.clipboard.writeText(url);
        toast.success("Link kopyalandı!");
    };

    // Download QR
    const downloadQR = (table: FBTable) => {
        const svg = document.getElementById(`qr-${table.id}`);
        if (!svg) return;

        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const img = new Image();

        img.onload = () => {
            canvas.width = 512;
            canvas.height = 512;
            ctx?.drawImage(img, 0, 0, 512, 512);
            const pngFile = canvas.toDataURL("image/png");
            const downloadLink = document.createElement("a");
            downloadLink.download = `${table.name}-qr.png`;
            downloadLink.href = pngFile;
            downloadLink.click();
        };

        img.src = "data:image/svg+xml;base64," + btoa(svgData);
        toast.success("QR kod indirildi!");
    };

    // Loading state
    if (sessionLoading || isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen p-6">
            {/* Header */}
            <div className="mb-8">
                <h1 className={clsx("text-2xl font-bold mb-2", textPrimary)}>
                    🪑 Masa Düzeni
                </h1>
                <p className={textSecondary}>
                    QR menü için masalarınızı ekleyin ve yönetin
                </p>
            </div>

            {/* Add Table Form */}
            <div className={clsx("rounded-2xl border p-4 mb-6", cardBg, borderColor)}>
                <div className="flex gap-3">
                    <input
                        type="text"
                        value={newTableName}
                        onChange={(e) => setNewTableName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddTable()}
                        placeholder="Yeni masa adı (ör: Bahçe 5, Teras 1, VIP)"
                        className={clsx(
                            "flex-1 px-4 py-3 rounded-xl border-2 transition-colors focus:outline-none focus:border-emerald-500",
                            inputBg, textPrimary
                        )}
                        disabled={isAdding}
                    />
                    <button
                        onClick={handleAddTable}
                        disabled={isAdding}
                        className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-medium rounded-xl transition-colors flex items-center gap-2"
                    >
                        {isAdding ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Plus className="w-5 h-5" />
                        )}
                        Masa Ekle
                    </button>
                </div>
            </div>

            {/* Tables Grid */}
            {tables.length === 0 ? (
                <div className={clsx("text-center py-16 rounded-2xl border", cardBg, borderColor)}>
                    <QrCode className={clsx("w-12 h-12 mx-auto mb-4", textSecondary)} />
                    <p className={textSecondary}>Henüz masa eklenmemiş</p>
                    <p className={clsx("text-sm mt-1", textSecondary)}>
                        Yukarıdan ilk masanızı ekleyin
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                    <AnimatePresence>
                        {tables.map((table) => (
                            <motion.div
                                key={table.id}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className={clsx(
                                    "rounded-lg border p-2 transition-all hover:shadow-md",
                                    cardBg, borderColor
                                )}
                            >
                                {/* Table Name */}
                                <div className="flex items-center justify-between mb-2">
                                    {editingTable === table.id ? (
                                        <div className="flex items-center gap-1 flex-1">
                                            <input
                                                type="text"
                                                value={editingName}
                                                onChange={(e) => setEditingName(e.target.value)}
                                                onKeyDown={(e) => e.key === "Enter" && saveTableEdit()}
                                                className={clsx("flex-1 px-2 py-1 rounded-md border text-xs", inputBg, textPrimary)}
                                                autoFocus
                                            />
                                            <button onClick={saveTableEdit} className="p-1 text-emerald-500 hover:bg-emerald-500/10 rounded">
                                                <Check className="w-3 h-3" />
                                            </button>
                                            <button onClick={() => setEditingTable(null)} className="p-1 text-gray-500 hover:bg-gray-500/10 rounded">
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <span className={clsx("font-semibold text-sm truncate", textPrimary)}>{table.name}</span>
                                            <div className="flex items-center gap-0.5">
                                                <button
                                                    onClick={() => {
                                                        setEditingTable(table.id);
                                                        setEditingName(table.name);
                                                    }}
                                                    className="p-1 hover:bg-gray-500/10 rounded"
                                                >
                                                    <Edit3 className="w-3 h-3 text-gray-500" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteTable(table.id)}
                                                    className="p-1 hover:bg-red-500/10 rounded"
                                                >
                                                    <Trash2 className="w-3 h-3 text-red-500" />
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Stats */}
                                <div className={clsx("flex items-center gap-1 text-[10px] mb-2", textSecondary)}>
                                    <ScanLine className="w-2.5 h-2.5" />
                                    <span>{table.scan_count} tarama</span>
                                </div>

                                {/* QR Code - Always visible */}
                                {businessSlug && (
                                    <div
                                        className="bg-white p-1.5 rounded-md mb-1.5 cursor-pointer hover:shadow-md transition-shadow"
                                        onClick={() => setSelectedTable(table)}
                                    >
                                        <QRCodeSVG
                                            id={`qr-${table.id}`}
                                            value={getTableQRUrl(businessSlug, table.id)}
                                            size={64}
                                            level="H"
                                            className="w-full h-auto"
                                        />
                                    </div>
                                )}

                                {/* Actions - Always visible */}
                                {businessSlug && (
                                    <div className="grid grid-cols-2 gap-1">
                                        <button
                                            onClick={() => copyQRUrl(table)}
                                            className={clsx(
                                                "py-1 px-1.5 rounded text-[9px] font-medium flex items-center justify-center gap-0.5 transition-colors",
                                                isDark ? "bg-white/5 hover:bg-white/10" : "bg-gray-100 hover:bg-gray-200"
                                            )}
                                        >
                                            <Copy className="w-2.5 h-2.5" />
                                            Kopyala
                                        </button>
                                        <button
                                            onClick={() => downloadQR(table)}
                                            className="py-1 px-1.5 rounded text-[9px] font-medium flex items-center justify-center gap-0.5 bg-emerald-500 hover:bg-emerald-600 text-white transition-colors"
                                        >
                                            <Download className="w-2.5 h-2.5" />
                                            İndir
                                        </button>
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {/* QR Preview Modal */}
            <AnimatePresence>
                {selectedTable && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSelectedTable(null)}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className={clsx(
                                "w-full max-w-sm rounded-3xl p-4 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto",
                                cardBg
                            )}
                        >
                            <h3 className={clsx("text-lg font-bold mb-4 text-center", textPrimary)}>
                                {selectedTable.name}
                            </h3>
                            <div className="bg-white p-6 rounded-2xl mb-4">
                                <QRCodeSVG
                                    value={getTableQRUrl(businessSlug, selectedTable.id)}
                                    size={256}
                                    level="H"
                                    className="w-full h-auto"
                                />
                            </div>
                            <p className={clsx("text-sm text-center mb-4 break-all", textSecondary)}>
                                {getTableQRUrl(businessSlug, selectedTable.id)}
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => {
                                        copyQRUrl(selectedTable);
                                        setSelectedTable(null);
                                    }}
                                    className={clsx(
                                        "py-3 rounded-xl font-medium flex items-center justify-center gap-2",
                                        isDark ? "bg-white/10" : "bg-gray-100"
                                    )}
                                >
                                    <Copy className="w-4 h-4" />
                                    Kopyala
                                </button>
                                <button
                                    onClick={() => {
                                        downloadQR(selectedTable);
                                        setSelectedTable(null);
                                    }}
                                    className="py-3 rounded-xl font-medium bg-emerald-500 text-white flex items-center justify-center gap-2"
                                >
                                    <Download className="w-4 h-4" />
                                    İndir
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
