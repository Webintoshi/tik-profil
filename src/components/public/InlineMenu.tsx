"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus, ShoppingCart, X, Loader2, UtensilsCrossed } from "lucide-react";
import Image from "next/image";
import clsx from "clsx";
import { createPortal } from "react-dom";
import { toR2ProxyUrl } from "@/lib/publicImage";
import { useFastfoodMenuSubscription } from "@/hooks/useMenuRealtime";

interface Category {
    id: string;
    name: string;
    icon: string;
    emoji?: string;
}

interface Product {
    id: string;
    name: string;
    description?: string;
    price: number;
    imageUrl?: string;
    image?: string;
    categoryId: string;
    inStock?: boolean;
}

interface CartItem {
    productId: string;
    name: string;
    price: number;
    quantity: number;
    image?: string;
}

interface InlineMenuProps {
    isOpen: boolean;
    businessSlug: string;
    businessName: string;
    whatsappNumber?: string;
    onClose: () => void;
}

// Premium Product Detail Modal Component
function ProductDetailModal({
    product,
    isOpen,
    onClose,
    onAddToCart
}: {
    product: Product | null;
    isOpen: boolean;
    onClose: () => void;
    onAddToCart: (product: Product, quantity: number) => void;
}) {
    const [quantity, setQuantity] = useState(1);

    useEffect(() => {
        if (isOpen) {
            setQuantity(1);
            // Prevent body scroll when modal is open
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen, product]);

    if (!product) return null;

    const total = product.price * quantity;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Elegant Backdrop with blur */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        onClick={onClose}
                        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md"
                    />

                    {/* Premium Half-screen Sheet */}
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{
                            type: "spring",
                            damping: 32,
                            stiffness: 380,
                            mass: 0.8
                        }}
                        className="fixed inset-x-0 bottom-0 z-[100] max-h-[70vh] flex flex-col"
                    >
                        {/* Glassmorphism container */}
                        <div className="bg-gradient-to-b from-white via-white to-gray-50 rounded-t-[2.5rem] shadow-[0_-20px_60px_-15px_rgba(0,0,0,0.3)] flex flex-col h-full">
                            {/* Elegant Handle */}
                            <div className="flex justify-center pt-4 pb-2">
                                <motion.div
                                    initial={{ width: 32 }}
                                    animate={{ width: 40 }}
                                    className="h-1 rounded-full bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200"
                                />
                            </div>

                            {/* Close button */}
                            <motion.button
                                whileHover={{ scale: 1.1, rotate: 90 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={onClose}
                                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100/80 backdrop-blur-sm text-gray-500 hover:bg-gray-200/80 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </motion.button>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto px-6 pb-4">
                                {/* Hero Image */}
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.1, duration: 0.3 }}
                                    className="relative w-full aspect-[16/10] mb-5 rounded-3xl overflow-hidden shadow-lg"
                                >
                                    {(product.imageUrl || product.image) ? (
                                        <Image
                                            src={toR2ProxyUrl(product.imageUrl || product.image || "")}
                                            alt={product.name}
                                            fill
                                            className="object-cover"

                                        />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 flex items-center justify-center">
                                            <span className="text-7xl">🍔</span>
                                        </div>
                                    )}
                                    {/* Subtle gradient overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
                                </motion.div>

                                {/* Product Info */}
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.15, duration: 0.3 }}
                                >
                                    <h3 className="text-2xl font-bold text-gray-900 tracking-tight">{product.name}</h3>
                                    {product.description && (
                                        <p className="text-gray-500 text-[15px] leading-relaxed mt-2 font-light">{product.description}</p>
                                    )}
                                    <div className="mt-4 flex items-baseline gap-1">
                                        <span className="text-sm text-gray-400 font-medium">₺</span>
                                        <span className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                                            {product.price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                </motion.div>
                            </div>

                            {/* Premium Footer */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2, duration: 0.3 }}
                                className="border-t border-gray-100/80 p-5 bg-white/80 backdrop-blur-xl"
                            >
                                <div className="flex items-center gap-4">
                                    {/* Elegant Quantity Selector */}
                                    <div className="flex items-center bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden">
                                        <motion.button
                                            whileTap={{ scale: 0.9 }}
                                            onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                            className="w-12 h-12 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors"
                                        >
                                            <Minus className="w-5 h-5" />
                                        </motion.button>
                                        <span className="w-10 text-center font-semibold text-gray-900 text-lg">{quantity}</span>
                                        <motion.button
                                            whileTap={{ scale: 0.9 }}
                                            onClick={() => setQuantity(quantity + 1)}
                                            className="w-12 h-12 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors"
                                        >
                                            <Plus className="w-5 h-5" />
                                        </motion.button>
                                    </div>

                                    {/* Premium Add Button with gradient */}
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => {
                                            onAddToCart(product, quantity);
                                            onClose();
                                        }}
                                        className="flex-1 py-4 px-6 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white font-semibold rounded-2xl shadow-xl shadow-gray-900/20 hover:shadow-gray-900/30 transition-all relative overflow-hidden group"
                                    >
                                        {/* Shine effect */}
                                        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                                        <span className="relative flex items-center justify-center gap-2">
                                            <span>Sepete Ekle</span>
                                            <span className="text-gray-400">•</span>
                                            <span className="text-emerald-400 font-bold">₺{total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</span>
                                        </span>
                                    </motion.button>
                                </div>
                            </motion.div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

export function InlineMenu({ isOpen, businessSlug, businessName, whatsappNumber, onClose }: InlineMenuProps) {
    const [loading, setLoading] = useState(true);
    const [categories, setCategories] = useState<Category[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [businessId, setBusinessId] = useState<string | null>(null);
    const [activeCategory, setActiveCategory] = useState<string>("");
    const [cart, setCart] = useState<CartItem[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [showProductDetail, setShowProductDetail] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const refreshMenu = useCallback(async (showLoading: boolean = false) => {
        if (showLoading) setLoading(true);
        try {
            const res = await fetch(`/api/fastfood/public-menu?businessSlug=${businessSlug}`);
            const data = await res.json();

            if (data.success && data.data) {
                const cats = (data.data.categories || []).map((cat: Category) => ({
                    ...cat,
                    icon: cat.emoji || cat.icon || '🍔'
                }));
                setCategories(cats);
                setProducts(data.data.products || []);
                setBusinessId((data.data.businessId as string) || null);
                if (cats.length > 0) {
                    setActiveCategory(cats[0].id);
                }
            }
        } catch (err) {
            console.error("Menu fetch error:", err);
        } finally {
            if (showLoading) setLoading(false);
        }
    }, [businessSlug]);

    // Fetch menu data immediately on mount (prefetch for instant UX)
    useEffect(() => {
        if (products.length > 0) return; // Already loaded
        refreshMenu(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [refreshMenu]);

    useFastfoodMenuSubscription(isOpen ? businessId : null, () => refreshMenu(false));

    // Add to cart
    const addToCart = (product: Product, quantity: number = 1) => {
        setCart(prev => {
            const existing = prev.find(item => item.productId === product.id);
            if (existing) {
                return prev.map(item =>
                    item.productId === product.id
                        ? { ...item, quantity: item.quantity + quantity }
                        : item
                );
            }
            return [...prev, {
                productId: product.id,
                name: product.name,
                price: product.price,
                quantity: quantity,
                image: product.imageUrl || product.image
            }];
        });
    };

    // Update quantity
    const updateQuantity = (productId: string, delta: number) => {
        setCart(prev => {
            return prev.map(item => {
                if (item.productId === productId) {
                    const newQty = item.quantity + delta;
                    if (newQty <= 0) return null;
                    return { ...item, quantity: newQty };
                }
                return item;
            }).filter(Boolean) as CartItem[];
        });
    };

    // Cart totals
    const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    // WhatsApp checkout
    const handleCheckout = () => {
        if (!whatsappNumber || cart.length === 0) return;

        const lines = [`🍔 *${businessName} Siparişi*`, "", "─────────────────"];
        cart.forEach((item, i) => {
            lines.push(`${i + 1}. ${item.name} x${item.quantity} - ₺${(item.price * item.quantity).toFixed(2)}`);
        });
        lines.push("─────────────────", `*TOPLAM: ₺${cartTotal.toFixed(2)}*`);

        const message = encodeURIComponent(lines.join("\n"));
        window.open(`https://wa.me/${whatsappNumber}?text=${message}`, "_blank");
    };

    // Open product detail
    const openProductDetail = (product: Product) => {
        setSelectedProduct(product);
        setShowProductDetail(true);
    };

    // Group products by category
    const productsByCategory = categories.map(cat => ({
        ...cat,
        products: products.filter(p => p.categoryId === cat.id)
    })).filter(cat => cat.products.length > 0);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
                    className="overflow-hidden w-full col-span-2"
                    style={{ marginTop: '1rem' }}
                >
                    {/* Inline Container */}
                    <div className="relative rounded-2xl overflow-hidden border border-gray-200/60 bg-white shadow-elevated">
                        {/* Background */}
                        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-gray-100" />

                        {/* Header */}
                        <div className="relative px-6 py-5 flex items-center justify-between border-b border-gray-100">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                                    <UtensilsCrossed className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">Menü</h3>
                                    <p className="text-xs text-gray-500 font-medium">{products.length} ürün listeleniyor</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-12">
                                    <Loader2 className="w-8 h-8 animate-spin text-orange-500 mb-2" />
                                    <p className="text-sm text-gray-400 font-medium">Menü yükleniyor...</p>
                                </div>
                            ) : productsByCategory.length === 0 ? (
                                <div className="text-center py-16 min-h-[200px] flex flex-col items-center justify-center">
                                    <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center mb-4">
                                        <UtensilsCrossed className="w-8 h-8 text-orange-400" />
                                    </div>
                                    <p className="text-gray-500 font-medium">Henüz ürün eklenmemiş</p>
                                    <p className="text-gray-400 text-sm mt-1">Menü ürünleri eklendiğinde burada görünecek</p>
                                </div>
                            ) : (
                                <>
                                    {/* Categories */}
                                    <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide mb-4">
                                        {productsByCategory.map((cat) => (
                                            <button
                                                key={cat.id}
                                                onClick={() => setActiveCategory(cat.id)}
                                                className={clsx(
                                                    "px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-2",
                                                    activeCategory === cat.id
                                                        ? "bg-orange-500 text-white shadow-md shadow-orange-200"
                                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                                )}
                                            >
                                                <span>{cat.icon}</span>
                                                {cat.name}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Products Grid */}
                                    <div className="space-y-3">
                                        {productsByCategory
                                            .find(cat => cat.id === activeCategory)
                                            ?.products.map((product, index) => {
                                                const cartItem = cart.find(item => item.productId === product.id);
                                                const quantity = cartItem?.quantity || 0;

                                                return (
                                                    <motion.div
                                                        key={product.id}
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: index * 0.05 }}
                                                        onClick={() => openProductDetail(product)}
                                                        className="group flex gap-4 p-3 bg-white rounded-2xl border border-gray-100 hover:border-orange-200 hover:shadow-elevated transition-all duration-250 ease-apple cursor-pointer"
                                                    >
                                                        {/* Image */}
                                                        <div className="relative w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden bg-gray-50">
                                                            {(product.imageUrl || product.image) ? (
                                                                <Image
                                                                    src={toR2ProxyUrl(product.imageUrl || product.image || "")}
                                                                    alt={product.name}
                                                                    fill
                                                                    className="object-cover rounded-2xl"

                                                                />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-3xl">🍔</div>
                                                            )}
                                                        </div>

                                                        {/* Content */}
                                                        <div className="flex-1 flex flex-col justify-between py-1">
                                                            <div>
                                                                <h4 className="font-bold text-gray-900 line-clamp-1 group-hover:text-orange-600 transition-colors">
                                                                    {product.name}
                                                                </h4>
                                                                <p className="text-xs text-gray-500 line-clamp-2 mt-1">
                                                                    {product.description}
                                                                </p>
                                                            </div>

                                                            <div className="flex items-center justify-between mt-2">
                                                                <span className="font-bold text-lg text-gray-900">
                                                                    ₺{product.price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                                                </span>

                                                                {quantity === 0 ? (
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            addToCart(product);
                                                                        }}
                                                                        className="w-9 h-9 flex items-center justify-center bg-gray-100 text-gray-600 rounded-xl hover:bg-orange-500 hover:text-white transition-all"
                                                                    >
                                                                        <Plus className="w-5 h-5" />
                                                                    </button>
                                                                ) : (
                                                                    <div
                                                                        className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl"
                                                                        onClick={(e) => e.stopPropagation()}
                                                                    >
                                                                        <button
                                                                            onClick={() => updateQuantity(product.id, -1)}
                                                                            className="w-7 h-7 flex items-center justify-center bg-white rounded-lg shadow-sm text-gray-600"
                                                                        >
                                                                            <Minus className="w-3 h-3" />
                                                                        </button>
                                                                        <span className="w-4 text-center font-bold text-gray-900 text-sm">{quantity}</span>
                                                                        <button
                                                                            onClick={() => updateQuantity(product.id, 1)}
                                                                            className="w-7 h-7 flex items-center justify-center bg-white rounded-lg shadow-sm text-gray-600"
                                                                        >
                                                                            <Plus className="w-3 h-3" />
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                );
                                            })}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Sticky Checkout Bar */}
                        <AnimatePresence>
                            {cartCount > 0 && (
                                <motion.div
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    exit={{ y: 20, opacity: 0 }}
                                    className="sticky bottom-0 p-4 bg-white border-t border-gray-100 shadow-xl z-10"
                                >
                                    <button
                                        onClick={handleCheckout}
                                        className="group w-full flex items-center justify-between p-4 bg-gray-900 text-white rounded-xl shadow-lg shadow-gray-900/25 active:scale-[0.98] transition-all duration-200 ease-apple overflow-hidden relative"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                <ShoppingCart className="w-5 h-5" />
                                                <span className="absolute -top-2 -right-2 w-4 h-4 flex items-center justify-center bg-emerald-500 text-white text-[10px] font-bold rounded-full border border-gray-900">
                                                    {cartCount}
                                                </span>
                                            </div>
                                            <span className="font-bold">Siparişi Tamamla</span>
                                        </div>
                                        <span className="font-bold text-emerald-400">
                                            ₺{cartTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                                        </span>
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Product Detail Modal (Portal) */}
                    {mounted && showProductDetail && (
                        createPortal(
                            <ProductDetailModal
                                product={selectedProduct}
                                isOpen={showProductDetail}
                                onClose={() => {
                                    setShowProductDetail(false);
                                    setSelectedProduct(null);
                                }}
                                onAddToCart={addToCart}
                            />,
                            document.body
                        )
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
}

