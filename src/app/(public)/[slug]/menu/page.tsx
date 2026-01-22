"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { CartProvider, useCart } from "@/contexts/CartContext";
import { MenuHeader } from "@/components/public/menu/MenuHeader";
import { CategoryPills } from "@/components/public/menu/CategoryPills";
import { ProductCard } from "@/components/public/menu/ProductCard";
import { CartBar } from "@/components/public/menu/CartBar";
import { ProductDetail } from "@/components/public/menu/ProductDetail";
import { CartSheet } from "@/components/public/menu/CartSheet";
import CheckoutSheet from "@/components/public/menu/CheckoutSheet";
import { useFastfoodMenuSubscription } from "@/hooks/useMenuRealtime";

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
    whatsapp?: string;
}

// Main menu content component (uses context)
function MenuContent() {
    const params = useParams();
    const slug = params.slug as string;
    const cart = useCart();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [business, setBusiness] = useState<Business | null>(null);
    const [categories, setCategories] = useState<Category[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [extras, setExtras] = useState<Extra[]>([]);
    const [businessId, setBusinessId] = useState<string | null>(null);

    const [activeCategory, setActiveCategory] = useState<string>("");
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [isProductDetailOpen, setIsProductDetailOpen] = useState(false);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

    const categoryRefs = useRef<Map<string, HTMLElement>>(new Map());
    const observerRef = useRef<IntersectionObserver | null>(null);

    const refreshMenu = useCallback(async (showLoading: boolean = false) => {
        try {
            if (showLoading) setLoading(true);

            const res = await fetch(`/api/fastfood/public-menu?businessSlug=${slug}`);
            const data = await res.json();

            if (!data.success) {
                setError(data.error || "Menü yüklenemedi");
                return;
            }

            setBusiness({
                id: data.data.businessId,
                name: data.data.businessName || "İşletme",
                whatsapp: data.data.whatsapp
            });
            setBusinessId(data.data.businessId || null);
            setCategories(data.data.categories || []);
            setProducts(data.data.products || []);
            cart.setBusinessSlug(slug);
            cart.setBusinessName(data.data.businessName || "İşletme");
            cart.setWhatsappNumber(data.data.whatsapp || "");

            if (data.data.categories && data.data.categories.length > 0) {
                setActiveCategory(data.data.categories[0].id);
            }

            try {
                const extrasRes = await fetch(`/api/fastfood/extras?businessSlug=${slug}`);
                const extrasData = await extrasRes.json();
                if (extrasData.success && extrasData.extras) {
                    setExtras(extrasData.extras);
                }
            } catch {
            }

            setError(null);
        } catch (err) {
            console.error("Menu fetch error:", err);
            setError("Menü yüklenirken bir hata oluştu");
        } finally {
            if (showLoading) setLoading(false);
        }
    }, [slug, cart]);

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
        // Attach extras to product
        const productWithExtras = {
            ...product,
            extras: extras.filter(e => true) // For now, show all extras. Can filter by product later.
        };
        setSelectedProduct(productWithExtras);
        setIsProductDetailOpen(true);
    };

    // Quick add to cart (no extras)
    const quickAddToCart = (product: Product) => {
        cart.addItem({
            productId: product.id,
            name: product.name,
            basePrice: product.price,
            quantity: 1,
            selectedExtras: [],
            image: product.imageUrl
        });
    };

    // Add to cart from detail
    const addToCartFromDetail = (item: {
        productId: string;
        name: string;
        basePrice: number;
        quantity: number;
        selectedExtras: { id: string; name: string; price: number }[];
        selectedSize?: { id: string; name: string; priceModifier: number };
        note: string;
        image?: string;
    }) => {
        cart.addItem(item);
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
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 animate-spin text-violet-500 mx-auto mb-4" />
                    <p className="text-gray-500">Menü yükleniyor...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                        <span className="text-3xl">😕</span>
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-2">Menü Yüklenemedi</h2>
                    <p className="text-gray-500">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <MenuHeader businessSlug={slug} title={business?.name || "Menü"} />

            {/* Category Pills */}
            {productsByCategory.length > 0 && (
                <CategoryPills
                    categories={productsByCategory.map(c => ({ id: c.id, name: c.name, icon: c.icon }))}
                    activeId={activeCategory}
                    onSelect={scrollToCategory}
                />
            )}

            {/* Product List */}
            <div className="px-4 pb-32 pt-4">
                {productsByCategory.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                            <span className="text-4xl">🍽️</span>
                        </div>
                        <h2 className="text-lg font-semibold text-gray-900 mb-2">Menü Hazırlanıyor</h2>
                        <p className="text-gray-500">Yakında ürünler eklenecek</p>
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
                                <div className="sticky top-[105px] z-30 bg-gray-50/95 backdrop-blur-sm py-3 -mx-4 px-4">
                                    <h2 className="text-xl font-bold text-gray-900">
                                        {category.icon} {category.name}
                                    </h2>
                                    <p className="text-sm text-gray-500 mt-0.5">
                                        {category.products.length} ürün
                                    </p>
                                </div>

                                {/* Products */}
                                <div className="space-y-3 mt-2">
                                    {category.products.map((product) => (
                                        <ProductCard
                                            key={product.id}
                                            product={product}
                                            onTap={() => openProductDetail(product)}
                                            onQuickAdd={() => quickAddToCart(product)}
                                        />
                                    ))}
                                </div>
                            </section>
                        ))}
                    </div>
                )}
            </div>

            {/* Cart Bar */}
            <CartBar
                itemCount={cart.itemCount}
                total={cart.total}
                onOpen={() => setIsCartOpen(true)}
            />

            {/* Product Detail */}
            <ProductDetail
                product={selectedProduct}
                isOpen={isProductDetailOpen}
                onClose={() => {
                    setIsProductDetailOpen(false);
                    setSelectedProduct(null);
                }}
                onAddToCart={addToCartFromDetail}
            />

            {/* Cart Sheet */}
            <CartSheet
                isOpen={isCartOpen}
                onClose={() => setIsCartOpen(false)}
                onCheckout={() => setIsCheckoutOpen(true)}
            />

            {/* Checkout Sheet */}
            <CheckoutSheet
                isOpen={isCheckoutOpen}
                onClose={() => setIsCheckoutOpen(false)}
            />
        </div>
    );
}

// Page wrapper with CartProvider
export default function FastFoodMenuPage() {
    return (
        <CartProvider>
            <MenuContent />
        </CartProvider>
    );
}
