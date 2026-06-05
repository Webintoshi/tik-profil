"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { MenuHeader } from "@/components/public/menu/MenuHeader";
import { CategoryPills } from "@/components/public/menu/CategoryPills";
import { ProductCard } from "@/components/public/menu/ProductCard";
import { ProductDetail } from "@/components/public/menu/ProductDetail";
import { useFastfoodMenuSubscription } from "@/hooks/useMenuRealtime";
import {
    getPublicMenuFallbackState,
    type PublicMenuFallbackState,
} from "@/lib/public/menuState";

// Types
interface Category {
    id: string;
    name: string;
    icon: string;
    sortOrder: number;
}

interface Extra {
    id: string;
    groupId: string;
    name: string;
    price: number;
}

interface Product {
    id: string;
    name: string;
    description?: string;
    price: number;
    imageUrl?: string;
    categoryId: string;
    inStock?: boolean;
    sortOrder?: number;
    extras?: Extra[];
}

interface Business {
    id: string;
    name: string;
    logoUrl?: string;
    whatsapp?: string;
}

// Main menu content component (uses context)
function MenuContent() {
    const params = useParams();
    const searchParams = useSearchParams();
    const slug = params.slug as string;

    const [loading, setLoading] = useState(true);
    const [menuIssue, setMenuIssue] = useState<PublicMenuFallbackState | null>(null);
    const [business, setBusiness] = useState<Business | null>(null);
    const [categories, setCategories] = useState<Category[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [businessId, setBusinessId] = useState<string | null>(null);
    const [menuTheme, setMenuTheme] = useState<"modern" | "classic">("modern");

    // Table Management Settings
    const [wifiPassword, setWifiPassword] = useState("");
    const [tableId, setTableId] = useState<string | null>(null);
    const [tableName, setTableName] = useState<string>("");

    // Capture table ID from URL
    useEffect(() => {
        const tid = searchParams.get('table');
        if (tid) {
            setTableId(tid);
        }
    }, [searchParams]);

    const [activeCategory, setActiveCategory] = useState<string>("");
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [isProductDetailOpen, setIsProductDetailOpen] = useState(false);

    const categoryRefs = useRef<Map<string, HTMLElement>>(new Map());
    const observerRef = useRef<IntersectionObserver | null>(null);

    const refreshMenu = useCallback(async (showLoading: boolean = false) => {
        try {
            if (showLoading) setLoading(true);

            // Validate slug before fetching
            if (!slug) {
                setMenuIssue(getPublicMenuFallbackState(400, "businessSlug required"));
                setLoading(false);
                return;
            }

            // Fetch menu data
            const url = `/api/fastfood/public-menu?businessSlug=${encodeURIComponent(slug)}${tableId ? `&tableId=${encodeURIComponent(tableId)}` : ''}`;
            const res = await fetch(url);

            if (!res.ok) {
                const payload = await res.json().catch(() => null);
                setMenuIssue(getPublicMenuFallbackState(res.status, payload));
                setBusiness(null);
                setBusinessId(null);
                setCategories([]);
                setProducts([]);
                return;
            }

            const data = await res.json();

            if (!data.success) {
                setMenuIssue(getPublicMenuFallbackState(res.status, data));
                return;
            }

            setBusiness({
                id: data.data.businessId,
                name: data.data.businessName || "İşletme",
                logoUrl: data.data.businessLogoUrl,
                whatsapp: data.data.whatsapp
            });
            setBusinessId(data.data.businessId || null);
            setCategories(data.data.categories || []);
            setProducts(data.data.products || []);
            setTableName(data.data.tableName || "");

            if (data.data.categories && data.data.categories.length > 0) {
                setActiveCategory(data.data.categories[0].id);
            }

            // Fetch settings for theme and table features
            try {
                const settingsRes = await fetch(`/api/fastfood/public-settings?businessSlug=${slug}`);
                const settingsData = await settingsRes.json();
                if (settingsData.success && settingsData.settings) {
                    setMenuTheme(settingsData.settings.menuTheme || "modern");
                    setWifiPassword(settingsData.settings.wifiPassword || "");
                }
            } catch (err) {
                console.error("Failed to load settings", err);
            }

            setMenuIssue(null);
        } catch (err) {
            console.error("[Menu] Fetch error:", err);
            if (err instanceof TypeError && err.message === 'Failed to fetch') {
                setMenuIssue({
                    kind: "error",
                    title: "Menü Yüklenemedi",
                    message: "Sunucuya bağlanılamadı. Lütfen daha sonra tekrar deneyin.",
                    retryable: true,
                });
            } else {
                setMenuIssue(getPublicMenuFallbackState(undefined, err));
            }
        } finally {
            if (showLoading) setLoading(false);
        }
    }, [slug, tableId]);

    useEffect(() => {
        refreshMenu(true);
    }, [refreshMenu]);

    useFastfoodMenuSubscription(businessId, () => refreshMenu(false));

    // Category scroll detection
    useEffect(() => {
        if (categories.length === 0) return;

        observerRef.current = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const categoryId = entry.target.getAttribute("data-category-id");
                        if (categoryId) {
                            setActiveCategory(categoryId);
                        }
                    }
                });
            },
            {
                root: null,
                rootMargin: "-100px 0px -75% 0px",
                threshold: 0
            }
        );

        categoryRefs.current.forEach((el) => {
            if (observerRef.current) {
                observerRef.current.observe(el);
            }
        });

        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
        };
    }, [categories]);

    // Scroll to category
    const scrollToCategory = useCallback((categoryId: string) => {
        const element = categoryRefs.current.get(categoryId);
        if (element) {
            const headerOffset = 120; // Header + pills height
            const elementPosition = element.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

            window.scrollTo({
                top: offsetPosition,
                behavior: "smooth"
            });
        }
    }, []);

    // Open product detail
    const openProductDetail = (product: Product) => {
        setSelectedProduct(product);
        setIsProductDetailOpen(true);
    };

    // Group products by category
    const productsByCategory = categories.map(cat => ({
        ...cat,
        products: products
            .filter(p => p.categoryId === cat.id)
            .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
    })).filter(cat => cat.products.length > 0);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4 text-orange-500" />
                    <p className="text-gray-600">Menü yükleniyor...</p>
                </div>
            </div>
        );
    }

    if (menuIssue) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
                <div className="text-center">
                    <div
                        className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${menuIssue.kind === "not-ready" ? "bg-gray-200" : "bg-red-500/20"}`}
                    >
                        <span className="text-3xl">
                            {menuIssue.kind === "not-ready" ? "🍽️" : "😕"}
                        </span>
                    </div>
                    <h2 className="text-lg font-semibold mb-2 text-gray-900">{menuIssue.title}</h2>
                    <p className="text-gray-600">{menuIssue.message}</p>
                    {menuIssue.retryable && (
                        <button
                            onClick={() => refreshMenu(true)}
                            className="mt-4 inline-flex items-center justify-center rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
                        >
                            Tekrar Dene
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <MenuHeader
                businessSlug={slug}
                title={business?.name || "Menü"}
                logoUrl={business?.logoUrl}
                tableName={tableName || tableId || undefined}
                wifiPassword={wifiPassword}
            />

            {/* Category Pills */}
            {productsByCategory.length > 0 && (
                <CategoryPills
                    categories={productsByCategory.map(c => ({ id: c.id, name: c.name, icon: c.icon }))}
                    activeId={activeCategory}
                    onSelect={scrollToCategory}
                    theme={menuTheme}
                />
            )}

            {/* Product List */}
            <div className="px-4 pt-4 pb-8">
                {productsByCategory.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 bg-gray-200">
                            <span className="text-4xl">🍽️</span>
                        </div>
                        <h2 className="text-lg font-semibold mb-2 text-gray-900">Menü Hazırlanıyor</h2>
                        <p className="text-gray-600">Yakında ürünler eklenecek</p>
                    </div>
                ) : (
                    <div className="space-y-6 max-w-2xl mx-auto">
                        {productsByCategory.map((category) => (
                            <section
                                key={category.id}
                                ref={(el) => {
                                    if (el) categoryRefs.current.set(category.id, el);
                                }}
                                data-category-id={category.id}
                            >
                                {/* Category Header */}
                                <div className="sticky top-[105px] z-30 py-3 -mx-4 px-4 backdrop-blur-md border-b bg-white/95 border-gray-100">
                                    <h2 className="text-xl font-bold flex items-center gap-2 text-gray-900">
                                        <span>{category.icon}</span>
                                        <span>{category.name}</span>
                                    </h2>
                                    <p className="text-sm mt-0.5 ml-8 text-gray-500">
                                        {category.products.length} ürün
                                    </p>
                                </div>

                                {/* Products */}
                                <div className="flex flex-col gap-4 mt-4">
                                    {category.products.map((product) => (
                                        <ProductCard
                                            key={product.id}
                                            product={product}
                                            onTap={() => openProductDetail(product)}
                                            theme={menuTheme}
                                            viewOnly={true}
                                        />
                                    ))}
                                </div>
                            </section>
                        ))}
                    </div>
                )}
            </div>

            {/* Product Detail */}
            <ProductDetail
                product={selectedProduct}
                isOpen={isProductDetailOpen}
                onClose={() => {
                    setIsProductDetailOpen(false);
                    setSelectedProduct(null);
                }}
            />
        </div>
    );
}

export default function FastFoodMenuPage() {
    return <MenuContent />;
}
