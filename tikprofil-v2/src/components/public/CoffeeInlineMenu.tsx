"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X, Plus, Minus, ShoppingBag, Coffee, Wifi,
    MapPin, Phone, Check, Loader2, Star, Clock, ChevronDown
} from "lucide-react";
import clsx from "clsx";
import { createPortal } from "react-dom";
import { toast } from "sonner";

// ============================================
// TYPES
// ============================================
interface Category {
    id: string;
    name: string;
    icon?: string;
    sort_order: number;
}

interface Size {
    id: string;
    name: string;
    volume_ml: number;
    price_modifier: number;
}

interface Extra {
    id: string;
    name: string;
    price_modifier: number;
}

interface ExtraGroup {
    id: string;
    name: string;
    selection_type: "single" | "multiple";
    min_selection: number;
    max_selection: number;
    is_required: boolean;
    extras: Extra[];
}

interface Product {
    id: string;
    name: string;
    description: string;
    image_url: string;
    temperature: string;
    coffee_type: string;
    caffeine_level: string;
    base_price: number;
    discount_price: number;
    calories: number;
    is_featured: boolean;
    category_id: string;
    extra_groups: ExtraGroup[];
}

interface Settings {
    wifi_name: string;
    wifi_password: string;
    loyalty_enabled: boolean;
    stamps_for_free_drink: number;
    tip_enabled: boolean;
    tip_percentages: number[];
    pickup_enabled: boolean;
    preparation_time_default: number;
    tax_rate: number;
}

interface CoffeeMenuData {
    business: {
        id: string;
        name: string;
        slug: string;
        image_url: string;
        address: string;
        phone: string;
    };
    settings: Settings;
    categories: Category[];
    sizes: Size[];
    products: Product[];
}

interface CartItem {
    product_id: string;
    product_name: string;
    product_image: string;
    size_id?: string;
    size_name?: string;
    size_price_modifier: number;
    quantity: number;
    selected_extras: Array<{ extra_group_id: string; extra_ids: string[] }>;
    extras_total: number;
    unit_price: number;
    line_total: number;
}

interface CoffeeInlineMenuProps {
    isOpen: boolean;
    businessSlug: string;
    businessName: string;
    businessId?: string;
    businessLogo?: string;
    businessPhone?: string;
    onClose: () => void;
    prefetch?: boolean;
}

// ============================================
// MAIN COMPONENT
// ============================================
export function CoffeeInlineMenu({
    isOpen,
    businessSlug,
    businessName,
    businessId,
    businessLogo,
    businessPhone,
    onClose,
    prefetch = false
}: CoffeeInlineMenuProps) {
    const [menuData, setMenuData] = useState<CoffeeMenuData | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [showCart, setShowCart] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [showWifi, setShowWifi] = useState(false);
    const [tipPercent, setTipPercent] = useState(0);
    const [submittingOrder, setSubmittingOrder] = useState(false);

    // Portal root
    const portalRoot = useRef(document.createElement('div'));
    useEffect(() => {
        document.body.appendChild(portalRoot.current);
        return () => {
            document.body.removeChild(portalRoot.current);
        };
    }, []);

    // Fetch menu data
    const fetchMenuData = useCallback(async () => {
        try {
            const res = await fetch(`/api/coffee/public-menu?slug=${businessSlug}`);
            const json = await res.json();
            if (json.success && json.data) {
                setMenuData(json.data);
                if (json.data.categories.length > 0) {
                    setSelectedCategory(json.data.categories[0].id);
                }
            }
        } catch (error) {
            console.error("Failed to fetch menu:", error);
            toast.error("Menü yüklenemedi");
        } finally {
            setLoading(false);
        }
    }, [businessSlug]);

    // Load data on mount or when prefetch is true
    useEffect(() => {
        if (isOpen || prefetch) {
            fetchMenuData();
        }
    }, [isOpen, prefetch, fetchMenuData]);

    // Reset cart when menu closes
    useEffect(() => {
        if (!isOpen) {
            setCart([]);
            setShowCart(false);
            setSelectedProduct(null);
            setTipPercent(0);
        }
    }, [isOpen]);

    // Filter products by category
    const filteredProducts = menuData?.products.filter(
        p => p.category_id === selectedCategory
    ) || [];

    // Calculate cart totals
    const subtotal = cart.reduce((sum, item) => sum + item.line_total, 0);
    const taxRate = menuData?.settings.tax_rate || 10;
    const taxAmount = (subtotal * taxRate) / 100;
    const tip = tipPercent > 0 ? (subtotal * tipPercent) / 100 : 0;
    const total = subtotal + taxAmount + tip;

    // Add to cart
    const handleAddToCart = (item: CartItem) => {
        setCart(prev => [...prev, item]);
        toast.success(`${item.product_name} sepete eklendi`);
        setSelectedProduct(null);
    };

    // Update quantity
    const updateQuantity = (index: number, delta: number) => {
        setCart(prev => prev.map((item, i) => {
            if (i === index) {
                const newQty = Math.max(1, item.quantity + delta);
                return { ...item, quantity: newQty, line_total: item.unit_price * newQty };
            }
            return item;
        }));
    };

    // Remove from cart
    const removeFromCart = (index: number) => {
        setCart(prev => prev.filter((_, i) => i !== index));
    };

    // Submit order
    const submitOrder = async () => {
        setSubmittingOrder(true);
        try {
            const res = await fetch('/api/coffee/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    business_slug: businessSlug,
                    customer_name: 'Müşteri',
                    customer_phone: '',
                    order_type: 'takeaway',
                    items: cart,
                    tip_amount: tip,
                    payment_method: 'cash'
                })
            });
            const json = await res.json();
            if (json.success) {
                toast.success('Siparişiniz alındı!');
                setCart([]);
                setShowCart(false);
            } else {
                toast.error(json.error || 'Sipariş oluşturulamadı');
            }
        } catch (error) {
            toast.error('Bir hata oluştu');
        } finally {
            setSubmittingOrder(false);
        }
    };

    if (!isOpen && !prefetch) return null;
    if (prefetch && !isOpen) return null;

    const content = (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 bg-black/50"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 30, stiffness: 300 }}
                        onClick={(e) => e.stopPropagation()}
                        className="absolute bottom-0 left-0 right-0 max-h-[90vh] bg-white rounded-t-3xl shadow-2xl overflow-hidden flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b bg-white sticky top-0 z-10">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                                    <Coffee className="w-5 h-5 text-purple-600" />
                                </div>
                                <div>
                                    <h2 className="font-bold text-gray-900">{businessName}</h2>
                                    <p className="text-xs text-gray-500">Kahve Menüsü</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {/* WiFi Button */}
                                {menuData?.settings.wifi_name && (
                                    <button
                                        onClick={() => setShowWifi(!showWifi)}
                                        className="p-2 rounded-full hover:bg-gray-100 transition"
                                        title="WiFi"
                                    >
                                        <Wifi className="w-5 h-5 text-purple-600" />
                                    </button>
                                )}
                                <button
                                    onClick={onClose}
                                    className="p-2 rounded-full hover:bg-gray-100 transition"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                        </div>

                        {/* WiFi Info */}
                        <AnimatePresence>
                            {showWifi && menuData?.settings.wifi_name && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="bg-purple-50 px-4 py-3 border-b"
                                >
                                    <p className="text-sm font-medium text-purple-900 flex items-center gap-2">
                                        <Wifi className="w-4 h-4" />
                                        WiFi: {menuData.settings.wifi_name}
                                    </p>
                                    {menuData.settings.wifi_password && (
                                        <p className="text-sm text-purple-700 ml-6">
                                            🔑 Şifre: {menuData.settings.wifi_password}
                                        </p>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto">
                            {loading ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                                </div>
                            ) : showCart ? (
                                /* Cart View */
                                <div className="p-4">
                                    <button
                                        onClick={() => setShowCart(false)}
                                        className="flex items-center gap-2 text-sm text-gray-600 mb-4"
                                    >
                                        ← Menüye dön
                                    </button>
                                    <h3 className="text-lg font-bold mb-4">Sepetim</h3>
                                    {cart.length === 0 ? (
                                        <p className="text-center text-gray-500 py-8">Sepetiniz boş</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {cart.map((item, index) => (
                                                <div key={index} className="bg-gray-50 rounded-xl p-3">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div className="flex items-center gap-3">
                                                            {item.product_image && (
                                                                <img
                                                                    src={item.product_image}
                                                                    alt={item.product_name}
                                                                    className="w-12 h-12 rounded-lg object-cover"
                                                                />
                                                            )}
                                                            <div>
                                                                <p className="font-medium">{item.product_name}</p>
                                                                {item.size_name && (
                                                                    <p className="text-sm text-purple-600">{item.size_name}</p>
                                                                )}
                                                                <p className="text-sm font-bold">{item.line_total.toFixed(2)} ₺</p>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => removeFromCart(index)}
                                                            className="p-1 text-gray-400 hover:text-red-500"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => updateQuantity(index, -1)}
                                                            disabled={item.quantity <= 1}
                                                            className="w-8 h-8 rounded-full bg-white border flex items-center justify-center disabled:opacity-30"
                                                        >
                                                            <Minus className="w-3 h-3" />
                                                        </button>
                                                        <span className="w-8 text-center">{item.quantity}</span>
                                                        <button
                                                            onClick={() => updateQuantity(index, 1)}
                                                            className="w-8 h-8 rounded-full bg-white border flex items-center justify-center"
                                                        >
                                                            <Plus className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Tip */}
                                    {menuData?.settings.tip_enabled && cart.length > 0 && (
                                        <div className="mt-4 p-3 bg-gray-50 rounded-xl">
                                            <p className="text-sm font-medium mb-2">Bahşiş</p>
                                            <div className="flex gap-2">
                                                {[0, 5, 10, 15].map(percent => (
                                                    <button
                                                        key={percent}
                                                        onClick={() => setTipPercent(percent)}
                                                        className={clsx(
                                                            "flex-1 py-2 text-sm rounded-lg transition",
                                                            tipPercent === percent
                                                                ? "bg-purple-600 text-white"
                                                                : "bg-white border hover:bg-gray-50"
                                                        )}
                                                    >
                                                        {percent === 0 ? 'Yok' : `%${percent}`}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Total */}
                                    {cart.length > 0 && (
                                        <div className="mt-4 border-t pt-4 space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span>Ara Toplam</span>
                                                <span>{subtotal.toFixed(2)} ₺</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span>KDV (%{taxRate})</span>
                                                <span>{taxAmount.toFixed(2)} ₺</span>
                                            </div>
                                            {tip > 0 && (
                                                <div className="flex justify-between text-sm text-green-600">
                                                    <span>Bahşiş</span>
                                                    <span>+{tip.toFixed(2)} ₺</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between font-bold text-lg pt-2 border-t">
                                                <span>Toplam</span>
                                                <span className="text-purple-600">{total.toFixed(2)} ₺</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Submit */}
                                    {cart.length > 0 && (
                                        <button
                                            onClick={submitOrder}
                                            disabled={submittingOrder}
                                            className="w-full mt-4 py-3 bg-purple-600 text-white rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {submittingOrder ? (
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                            ) : (
                                                <>
                                                    <ShoppingBag className="w-5 h-5" />
                                                    Siparişi Tamamla
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>
                            ) : (
                                /* Menu View */
                                <div>
                                    {/* Categories */}
                                    <div className="flex gap-2 p-4 overflow-x-auto border-b">
                                        {menuData?.categories.map(cat => (
                                            <button
                                                key={cat.id}
                                                onClick={() => setSelectedCategory(cat.id)}
                                                className={clsx(
                                                    "flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition",
                                                    selectedCategory === cat.id
                                                        ? "bg-purple-600 text-white"
                                                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                                )}
                                            >
                                                {cat.icon && <span className="mr-1">{cat.icon}</span>}
                                                {cat.name}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Products */}
                                    <div className="p-4 space-y-3">
                                        {filteredProducts.length === 0 ? (
                                            <p className="text-center text-gray-500 py-8">Bu kategoride ürün yok</p>
                                        ) : (
                                            filteredProducts.map(product => {
                                                const hasDiscount = product.discount_price && product.discount_price < product.base_price;

                                                return (
                                                    <div
                                                        key={product.id}
                                                        onClick={() => setSelectedProduct(product)}
                                                        className="bg-white border rounded-xl p-3 flex gap-3 cursor-pointer hover:shadow-md transition"
                                                    >
                                                        {product.image_url && (
                                                            <img
                                                                src={product.image_url}
                                                                alt={product.name}
                                                                className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                                                            />
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-start justify-between">
                                                                <div className="min-w-0">
                                                                    <h4 className="font-semibold text-gray-900 truncate">{product.name}</h4>
                                                                    {product.description && (
                                                                        <p className="text-sm text-gray-500 line-clamp-2">{product.description}</p>
                                                                    )}
                                                                    {/* Badges */}
                                                                    <div className="flex gap-1 mt-1 flex-wrap">
                                                                        {product.is_featured && (
                                                                            <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full flex items-center gap-1">
                                                                                <Star className="w-3 h-3" />
                                                                                Öne Çıkan
                                                                            </span>
                                                                        )}
                                                                        {product.temperature === 'hot' && (
                                                                            <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full">☕ Sıcak</span>
                                                                        )}
                                                                        {product.temperature === 'iced' && (
                                                                            <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">🧊 Soğuk</span>
                                                                        )}
                                                                        {product.temperature === 'both' && (
                                                                            <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">☕🧊 Sıcak/Soğuk</span>
                                                                        )}
                                                                        {product.calories && (
                                                                            <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                                                                                {product.calories} kcal
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div className="text-right flex-shrink-0">
                                                                    {hasDiscount ? (
                                                                        <>
                                                                            <p className="text-sm text-gray-400 line-through">{product.base_price} ₺</p>
                                                                            <p className="font-bold text-red-600">{product.discount_price} ₺</p>
                                                                        </>
                                                                    ) : (
                                                                        <p className="font-bold text-purple-600">{product.base_price} ₺</p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <ChevronDown className="w-5 h-5 text-gray-400 self-center flex-shrink-0" />
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Cart Toggle Bar */}
                        {!showCart && cart.length > 0 && (
                            <div className="p-4 border-t bg-white">
                                <button
                                    onClick={() => setShowCart(true)}
                                    className="w-full py-3 bg-purple-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2"
                                >
                                    <ShoppingBag className="w-5 h-5" />
                                    <span>Sepeti Gör ({cart.reduce((sum, i) => sum + i.quantity, 0)})</span>
                                    <span className="ml-auto">{subtotal.toFixed(2)} ₺</span>
                                </button>
                            </div>
                        )}
                    </motion.div>

                    {/* Product Detail Modal */}
                    {selectedProduct && (
                        <ProductDetailModal
                            product={selectedProduct}
                            sizes={menuData?.sizes || []}
                            onClose={() => setSelectedProduct(null)}
                            onAddToCart={handleAddToCart}
                        />
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );

    return createPortal(content, portalRoot.current);
}

// ============================================
// PRODUCT DETAIL MODAL
// ============================================
interface ProductDetailModalProps {
    product: Product;
    sizes: Size[];
    onClose: () => void;
    onAddToCart: (item: CartItem) => void;
}

function ProductDetailModal({ product, sizes, onClose, onAddToCart }: ProductDetailModalProps) {
    const [selectedSize, setSelectedSize] = useState<Size | null>(sizes[0] || null);
    const [quantity, setQuantity] = useState(1);
    const [selectedExtras, setSelectedExtras] = useState<Record<string, string[]>>({});

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = '';
        };
    }, []);

    const calculatePrice = () => {
        let price = product.base_price + (selectedSize?.price_modifier || 0);
        Object.values(selectedExtras).flat().forEach(extraId => {
            product.extra_groups.forEach(group => {
                const extra = group.extras.find(e => e.id === extraId);
                if (extra) price += extra.price_modifier;
            });
        });
        return price;
    };

    const handleExtraToggle = (groupId: string, extraId: string) => {
        const group = product.extra_groups.find(g => g.id === groupId);
        if (!group) return;

        setSelectedExtras(prev => {
            const current = prev[groupId] || [];
            if (group.selection_type === 'single') {
                return { ...prev, [groupId]: [extraId] };
            } else {
                const exists = current.includes(extraId);
                if (exists) {
                    return { ...prev, [groupId]: current.filter(id => id !== extraId) };
                } else {
                    if (group.max_selection && current.length >= group.max_selection) {
                        toast.error(`En fazla ${group.max_selection} seçebilirsiniz`);
                        return prev;
                    }
                    return { ...prev, [groupId]: [...current, extraId] };
                }
            }
        });
    };

    const handleAdd = () => {
        // Validate required groups
        const missingRequired = product.extra_groups
            .filter(g => g.is_required && (!selectedExtras[g.id] || selectedExtras[g.id].length === 0))
            .map(g => g.name);

        if (missingRequired.length > 0) {
            toast.error(`Lütfen seçiniz: ${missingRequired.join(', ')}`);
            return;
        }

        const unitPrice = calculatePrice();
        onAddToCart({
            product_id: product.id,
            product_name: product.name,
            product_image: product.image_url,
            size_id: selectedSize?.id,
            size_name: selectedSize?.name,
            size_price_modifier: selectedSize?.price_modifier || 0,
            quantity,
            selected_extras: Object.entries(selectedExtras).map(([groupId, extraIds]) => ({
                extra_group_id: groupId,
                extra_ids: extraIds
            })),
            extras_total: unitPrice - product.base_price - (selectedSize?.price_modifier || 0),
            unit_price: unitPrice,
            line_total: unitPrice * quantity
        });
        onClose();
    };

    return createPortal(
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white w-full max-w-md rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
            >
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                        <h2 className="text-xl font-bold">{product.name}</h2>
                        <p className="text-sm text-gray-500">{product.description}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Image */}
                {product.image_url && (
                    <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-48 object-cover rounded-xl mb-4"
                    />
                )}

                {/* Sizes */}
                {sizes.length > 0 && (
                    <div className="mb-6">
                        <h3 className="font-semibold mb-2">Boyut</h3>
                        <div className="grid grid-cols-4 gap-2">
                            {sizes.map(size => (
                                <button
                                    key={size.id}
                                    onClick={() => setSelectedSize(size)}
                                    className={clsx(
                                        "p-3 rounded-lg border-2 text-center transition",
                                        selectedSize?.id === size.id
                                            ? "border-purple-500 bg-purple-50"
                                            : "border-gray-200 hover:border-gray-300"
                                    )}
                                >
                                    <div className="font-semibold text-sm">{size.name}</div>
                                    <div className="text-xs text-gray-500">{size.volume_ml}ml</div>
                                    {size.price_modifier !== 0 && (
                                        <div className="text-xs">{size.price_modifier > 0 ? '+' : ''}{size.price_modifier} ₺</div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Extras */}
                {product.extra_groups.map(group => (
                    <div key={group.id} className="mb-6">
                        <h3 className="font-semibold mb-2">
                            {group.name}
                            {group.is_required && <span className="text-red-500 ml-1">*</span>}
                            {group.selection_type === 'multiple' && group.max_selection && (
                                <span className="text-gray-400 text-xs ml-1">(max {group.max_selection})</span>
                            )}
                        </h3>
                        <div className="space-y-2">
                            {group.extras.map(extra => {
                                const isSelected = selectedExtras[group.id]?.includes(extra.id);
                                return (
                                    <button
                                        key={extra.id}
                                        onClick={() => handleExtraToggle(group.id, extra.id)}
                                        className={clsx(
                                            "w-full p-3 rounded-lg border text-left flex justify-between transition",
                                            isSelected
                                                ? "border-purple-500 bg-purple-50"
                                                : "border-gray-200 hover:border-gray-300"
                                        )}
                                    >
                                        <span className="text-sm">{extra.name}</span>
                                        {extra.price_modifier !== 0 && (
                                            <span className="text-sm font-medium">
                                                {extra.price_modifier > 0 ? '+' : ''}{extra.price_modifier} ₺
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}

                {/* Quantity */}
                <div className="mb-6">
                    <h3 className="font-semibold mb-2">Adet</h3>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setQuantity(Math.max(1, quantity - 1))}
                            className="w-10 h-10 rounded-full border flex items-center justify-center hover:bg-gray-100"
                        >
                            <Minus className="w-4 h-4" />
                        </button>
                        <span className="text-xl font-semibold w-12 text-center">{quantity}</span>
                        <button
                            onClick={() => setQuantity(quantity + 1)}
                            className="w-10 h-10 rounded-full border flex items-center justify-center hover:bg-gray-100"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Total & Add */}
                <div className="border-t pt-4">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-gray-600">Toplam</span>
                        <span className="text-2xl font-bold text-purple-600">{(calculatePrice() * quantity).toFixed(2)} ₺</span>
                    </div>
                    <button
                        onClick={handleAdd}
                        className="w-full py-3 bg-purple-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-purple-700 transition"
                    >
                        <ShoppingBag className="w-5 h-5" />
                        Sepete Ekle
                    </button>
                </div>
            </motion.div>
        </div>,
        document.body
    );
}

export default CoffeeInlineMenu;
