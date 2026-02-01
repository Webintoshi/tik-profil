"use client";

import { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import clsx from "clsx";

interface Category {
    id: string;
    name: string;
    order: number;
}

interface Product {
    id: string;
    name: string;
    description?: string;
    price: number;
    category_id: string;
    in_stock: boolean;
}

interface PrintableMenuProps {
    businessName: string;
    categories: Category[];
    products: Product[];
    onClose: () => void;
}

// Format price helper
const formatPrice = (price: number): string => {
    return new Intl.NumberFormat("tr-TR", {
        style: "currency",
        currency: "TRY",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(price);
};

export function PrintableMenu({
    businessName,
    categories,
    products,
    onClose,
}: PrintableMenuProps) {
    const printRef = useRef<HTMLDivElement>(null);

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `${businessName} - Menü`,
        onAfterPrint: onClose,
    });

    // Sort categories by order
    const sortedCategories = [...categories].sort((a, b) => a.order - b.order);

    // Get products for a category (only in-stock)
    const getCategoryProducts = (categoryId: string) =>
        products.filter((p) => p.category_id === categoryId && p.in_stock);

    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b">
                    <h2 className="text-lg font-bold text-gray-900">Menü Önizleme</h2>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100"
                        >
                            İptal
                        </button>
                        <button
                            onClick={() => handlePrint()}
                            className="px-6 py-2 rounded-lg bg-emerald-500 text-white font-semibold hover:bg-emerald-600"
                        >
                            Yazdır / PDF
                        </button>
                    </div>
                </div>

                {/* Preview */}
                <div className="flex-1 overflow-auto bg-gray-100 p-6">
                    <div
                        ref={printRef}
                        className="bg-white mx-auto shadow-lg print-content"
                        style={{ width: "210mm", minHeight: "297mm", padding: "20mm" }}
                    >
                        {/* Print Styles */}
                        <style jsx>{`
                            @media print {
                                @page {
                                    size: A4;
                                    margin: 15mm;
                                }
                                .print-content {
                                    width: 100% !important;
                                    min-height: auto !important;
                                    padding: 0 !important;
                                    box-shadow: none !important;
                                }
                            }
                        `}</style>

                        {/* Header */}
                        <div className="text-center mb-8 pb-6 border-b-2 border-purple-500">
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">
                                {businessName}
                            </h1>
                            <p className="text-gray-500 text-sm">MENÜ</p>
                        </div>

                        {/* Categories & Products */}
                        <div className="space-y-8">
                            {sortedCategories.map((category) => {
                                const categoryProducts = getCategoryProducts(category.id);
                                if (categoryProducts.length === 0) return null;

                                return (
                                    <div key={category.id} className="break-inside-avoid">
                                        {/* Category Header */}
                                        <div className="bg-gray-100 px-4 py-2 rounded-lg mb-4">
                                            <h2 className="text-lg font-bold text-gray-800 uppercase tracking-wide">
                                                {category.name}
                                            </h2>
                                        </div>

                                        {/* Products */}
                                        <div className="space-y-3">
                                            {categoryProducts.map((product) => (
                                                <div
                                                    key={product.id}
                                                    className="flex justify-between items-start py-2 border-b border-gray-100"
                                                >
                                                    <div className="flex-1 pr-4">
                                                        <h3 className="font-semibold text-gray-900">
                                                            {product.name}
                                                        </h3>
                                                        {product.description && (
                                                            <p className="text-sm text-gray-500 mt-0.5">
                                                                {product.description}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <span className="font-bold text-purple-600 whitespace-nowrap">
                                                        {formatPrice(product.price)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Footer */}
                        <div className="mt-12 pt-6 border-t text-center text-gray-400 text-xs">
                            tikprofil.com ile oluşturuldu
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
