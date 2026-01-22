"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, ShoppingBag, X, Plus, Minus, MessageCircle, Loader2, UtensilsCrossed, Wifi, Copy, Check } from "lucide-react";
import { formatPrice, getCategories, getProducts, getTableById, getMenuSettings } from "@/lib/services/foodService";
import { MenuSettings, DEFAULT_MENU_SETTINGS, getAccentColor, getStyleConfig, normalizeStyleId, ColorId } from "@/lib/menuStyles";
import { toR2ProxyUrl } from "@/lib/publicImage";
import { useRestaurantMenuSubscription } from "@/hooks/useMenuRealtime";

// ============================================
// TYPES
// ============================================
interface MenuCategory {
    id: string;
    name: string;
}

interface MenuProduct {
    id: string;
    category_id: string;
    name: string;
    description?: string;
    price: number;
    image?: string;
    in_stock: boolean;
}

interface CartItem {
    product: MenuProduct;
    quantity: number;
}

interface RestaurantMenuClientProps {
    businessSlug: string;
    businessId: string;
    businessName: string;
    businessLogo?: string;
    businessWhatsapp?: string;
    businessPhone?: string;
}

// ============================================
// COMPONENT
// ============================================
export function RestaurantMenuClient({
    businessSlug,
    businessId,
    businessName,
    businessLogo,
    businessWhatsapp,
}: RestaurantMenuClientProps) {
    const searchParams = useSearchParams();
    const tableId = searchParams.get("table");

    // State for dynamically loaded settings
    const [menuSettings, setMenuSettings] = useState<MenuSettings>(DEFAULT_MENU_SETTINGS);
    const [categories, setCategories] = useState<MenuCategory[]>([]);
    const [products, setProducts] = useState<MenuProduct[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState<string>("");
    const [cart, setCart] = useState<CartItem[]>([]);
    const [showCart, setShowCart] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<MenuProduct | null>(null);
    const [tableName, setTableName] = useState<string | null>(null);
    const [wifiCopied, setWifiCopied] = useState(false);

    // Refs for scroll navigation
    const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const headerRef = useRef<HTMLDivElement | null>(null);

    // Get style configuration based on loaded settings
    const styleConfig = getStyleConfig(menuSettings.styleId);
    const accentColor = getAccentColor(menuSettings.accentColorId);

    const refreshMenu = useCallback(async (showLoading: boolean = false) => {
        if (!businessId) return;

        try {
            if (showLoading) setIsLoading(true);
            const [categoriesData, productsData, settingsData] = await Promise.all([
                getCategories(businessId),
                getProducts(businessId),
                getMenuSettings(businessId)
            ]);

            const cats = categoriesData.map(c => ({ id: c.id, name: c.name }));
            const prods = productsData.map(p => ({
                id: p.id,
                category_id: p.category_id,
                name: p.name,
                description: p.description,
                price: p.price,
                image: p.image,
                in_stock: p.in_stock
            }));

            if (settingsData) {
                setMenuSettings({
                    styleId: normalizeStyleId(settingsData.style_id || "modern"),
                    accentColorId: (settingsData.accent_color_id || "emerald") as ColorId,
                    showAvatar: settingsData.show_avatar ?? DEFAULT_MENU_SETTINGS.showAvatar,
                    waiterCallEnabled: settingsData.waiter_call_enabled ?? DEFAULT_MENU_SETTINGS.waiterCallEnabled,
                    cartEnabled: settingsData.cart_enabled ?? DEFAULT_MENU_SETTINGS.cartEnabled,
                    whatsappOrderEnabled: settingsData.whatsapp_order_enabled ?? DEFAULT_MENU_SETTINGS.whatsappOrderEnabled,
                    wifiPassword: settingsData.wifi_password || undefined,
                });
            }

            setCategories(cats);
            setProducts(prods);
            if (cats.length > 0) setActiveCategory(cats[0].id);
        } catch (error) {
            console.error("Error loading menu:", error);
        } finally {
            if (showLoading) setIsLoading(false);
        }
    }, [businessId]);

    useEffect(() => {
        refreshMenu(true);
    }, [refreshMenu]);

    useRestaurantMenuSubscription(businessId, () => refreshMenu(false));

    // Load table name
    useEffect(() => {
        if (!tableId) return;
        const loadTable = async () => {
            try {
                const table = await getTableById(tableId);
                if (table) setTableName(table.name);
            } catch (error) {
                console.error("Error loading table:", error);
            }
        };
        loadTable();
    }, [tableId]);

    // Scroll to category
    const scrollToCategory = (categoryId: string) => {
        setActiveCategory(categoryId);
        const element = categoryRefs.current[categoryId];
        const header = headerRef.current;

        if (element && header) {
            const headerHeight = header.offsetHeight;
            const elementPosition = element.getBoundingClientRect().top + window.scrollY;
            window.scrollTo({
                top: elementPosition - headerHeight - 16,
                behavior: "smooth"
            });
        }
    };

    // Get products for a category
    const getProductsForCategory = (categoryId: string) => {
        return products.filter(p => p.category_id === categoryId);
    };

    // Cart calculations
    const cartTotal = useMemo(() =>
        cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
        [cart]
    );

    const cartCount = useMemo(() =>
        cart.reduce((sum, item) => sum + item.quantity, 0),
        [cart]
    );

    // Cart functions
    const addToCart = (product: MenuProduct) => {
        if (!product.in_stock || !menuSettings.cartEnabled) return;
        setCart(prev => {
            const existing = prev.find(item => item.product.id === product.id);
            if (existing) {
                return prev.map(item =>
                    item.product.id === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            return [...prev, { product, quantity: 1 }];
        });
    };

    const removeFromCart = (productId: string) => {
        setCart(prev => {
            const existing = prev.find(item => item.product.id === productId);
            if (existing && existing.quantity > 1) {
                return prev.map(item =>
                    item.product.id === productId
                        ? { ...item, quantity: item.quantity - 1 }
                        : item
                );
            }
            return prev.filter(item => item.product.id !== productId);
        });
    };

    const getCartItemQuantity = (productId: string) => {
        return cart.find(item => item.product.id === productId)?.quantity || 0;
    };

    // WhatsApp messages
    const generateOrderMessage = () => {
        const items = cart.map(item => `${item.quantity}x ${item.product.name}`).join(", ");
        const message = `👋 Sipariş!\n📍 Masa: ${tableName || "Belirtilmedi"}\n🛒 Ürünler: ${items}\n💰 Toplam: ${formatPrice(cartTotal)}\n\n_Tık Profil üzerinden gönderilmiştir_\nhttps://tikprofil.com`;
        return encodeURIComponent(message);
    };

    const generateWaiterCallMessage = () => {
        const message = `🔔 Bakar mısınız?\n📍 ${tableName || "Masa"} servis bekliyor.\n\n_Tık Profil üzerinden gönderilmiştir_\nhttps://tikprofil.com`;
        return encodeURIComponent(message);
    };

    // Copy WiFi password to clipboard
    const copyWifiPassword = async () => {
        if (!menuSettings.wifiPassword) return;
        try {
            await navigator.clipboard.writeText(menuSettings.wifiPassword);
            setWifiCopied(true);
            setTimeout(() => setWifiCopied(false), 2000);
        } catch (error) {
            console.error("Failed to copy WiFi password:", error);
        }
    };

    // If no table param, don't show menu
    if (!tableId) return null;

    // Loading state
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: styleConfig.colors.background }}>
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 animate-spin" style={{ color: accentColor.value }} />
                    <p className="text-sm font-medium animate-pulse" style={{ color: styleConfig.colors.textSecondary }}>
                        Menü yükleniyor...
                    </p>
                </div>
            </div>
        );
    }

    // Empty state
    if (categories.length === 0) {
        return (
            <div
                className="min-h-screen flex flex-col items-center justify-center p-6"
                style={{ backgroundColor: styleConfig.colors.background }}
            >
                <UtensilsCrossed className="w-16 h-16 mb-4" style={{ color: styleConfig.colors.textSecondary }} />
                <h2 className="text-xl font-bold mb-2" style={{ color: styleConfig.colors.text }}>Menü Hazırlanıyor</h2>
                <p className="text-center" style={{ color: styleConfig.colors.textSecondary }}>
                    {businessName} menüsü henüz eklenmemiş.
                </p>
            </div>
        );
    }

    // ============================================
    // PILL PRODUCT CARD - Apple-style THICK pills
    // ============================================
    const PillProductCard = ({ product }: { product: MenuProduct }) => {
        const quantity = getCartItemQuantity(product.id);
        const isInCart = quantity > 0;

        return (
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedProduct(product)}
                className="flex items-center gap-4 p-4 cursor-pointer transition-all"
                style={{
                    backgroundColor: styleConfig.colors.cardBg,
                    borderRadius: "24px",
                    boxShadow: "0 6px 24px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.06)",
                    opacity: product.in_stock ? 1 : 0.5,
                    border: `1px solid ${styleConfig.colors.border}`,
                }}
            >
                {/* Product Image - Larger for thick pills */}
                {product.image ? (
                    <img
                        src={toR2ProxyUrl(product.image)}
                        alt={product.name}
                        className="w-24 h-24 rounded-2xl object-cover flex-shrink-0"
                        style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.12)" }}
                    />
                ) : (
                    <div
                        className="w-24 h-24 rounded-2xl flex-shrink-0 flex items-center justify-center"
                        style={{ backgroundColor: styleConfig.colors.border }}
                    >
                        <UtensilsCrossed className="w-10 h-10" style={{ color: styleConfig.colors.textSecondary }} />
                    </div>
                )}

                {/* Product Info */}
                <div className="flex-1 min-w-0 py-1">
                    <h3
                        className="font-semibold text-base truncate"
                        style={{ color: styleConfig.colors.text }}
                    >
                        {product.name}
                    </h3>
                    {product.description && (
                        <p
                            className="text-sm mt-0.5 line-clamp-2 leading-snug"
                            style={{ color: styleConfig.colors.textSecondary }}
                        >
                            {product.description}
                        </p>
                    )}
                    <p
                        className="font-bold text-lg mt-1"
                        style={{ color: accentColor.value }}
                    >
                        {formatPrice(product.price)}
                    </p>
                </div>

                {/* Add Button */}
                {menuSettings.cartEnabled && product.in_stock && (
                    <div className="flex-shrink-0">
                        {isInCart ? (
                            <div
                                className="flex items-center gap-1 p-1 rounded-full"
                                style={{ backgroundColor: `${accentColor.value}15` }}
                            >
                                <button
                                    onClick={() => removeFromCart(product.id)}
                                    className="w-9 h-9 rounded-full flex items-center justify-center transition-transform active:scale-90"
                                    style={{ backgroundColor: styleConfig.colors.border }}
                                >
                                    <Minus className="w-4 h-4" style={{ color: styleConfig.colors.text }} />
                                </button>
                                <span
                                    className="w-8 text-center font-bold text-base"
                                    style={{ color: styleConfig.colors.text }}
                                >
                                    {quantity}
                                </span>
                                <button
                                    onClick={() => addToCart(product)}
                                    className="w-9 h-9 rounded-full flex items-center justify-center transition-transform active:scale-90"
                                    style={{ backgroundColor: accentColor.value }}
                                >
                                    <Plus className="w-4 h-4" style={{ color: accentColor.textOnColor }} />
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => addToCart(product)}
                                className="px-5 py-2.5 rounded-full font-semibold text-sm transition-all active:scale-95"
                                style={{
                                    backgroundColor: accentColor.value,
                                    color: accentColor.textOnColor,
                                    boxShadow: `0 4px 14px ${accentColor.value}40`
                                }}
                            >
                                Ekle
                            </button>
                        )}
                    </div>
                )}
            </motion.div>
        );
    };

    // ============================================
    // GRID PRODUCT CARD - Apple-style grid cards
    // ============================================
    const GridProductCard = ({ product }: { product: MenuProduct }) => {
        const quantity = getCartItemQuantity(product.id);
        const isInCart = quantity > 0;

        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setSelectedProduct(product)}
                className="overflow-hidden cursor-pointer transition-all"
                style={{
                    backgroundColor: styleConfig.colors.cardBg,
                    borderRadius: "20px",
                    boxShadow: "0 2px 16px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)",
                    opacity: product.in_stock ? 1 : 0.5,
                    border: `1px solid ${styleConfig.colors.border}`,
                }}
            >
                {/* Product Image */}
                {product.image ? (
                    <div className="aspect-square overflow-hidden">
                        <img
                            src={toR2ProxyUrl(product.image)}
                            alt={product.name}
                            className="w-full h-full object-cover"
                        />
                    </div>
                ) : (
                    <div
                        className="aspect-square flex items-center justify-center"
                        style={{ backgroundColor: styleConfig.colors.border }}
                    >
                        <UtensilsCrossed className="w-10 h-10" style={{ color: styleConfig.colors.textSecondary }} />
                    </div>
                )}

                {/* Product Info */}
                <div className="p-3">
                    <h3
                        className="font-semibold text-sm truncate"
                        style={{ color: styleConfig.colors.text }}
                    >
                        {product.name}
                    </h3>
                    {product.description && (
                        <p
                            className="text-xs mt-0.5 line-clamp-1"
                            style={{ color: styleConfig.colors.textSecondary }}
                        >
                            {product.description}
                        </p>
                    )}
                    <div className="flex justify-between items-center mt-2">
                        <p
                            className="font-bold"
                            style={{ color: accentColor.value }}
                        >
                            {formatPrice(product.price)}
                        </p>
                        {menuSettings.cartEnabled && product.in_stock && (
                            isInCart ? (
                                <div className="flex items-center gap-0.5">
                                    <button
                                        onClick={() => removeFromCart(product.id)}
                                        className="w-7 h-7 rounded-full flex items-center justify-center"
                                        style={{ backgroundColor: styleConfig.colors.border }}
                                    >
                                        <Minus className="w-3 h-3" style={{ color: styleConfig.colors.text }} />
                                    </button>
                                    <span className="w-5 text-center text-sm font-bold" style={{ color: styleConfig.colors.text }}>{quantity}</span>
                                    <button
                                        onClick={() => addToCart(product)}
                                        className="w-7 h-7 rounded-full flex items-center justify-center"
                                        style={{ backgroundColor: accentColor.value }}
                                    >
                                        <Plus className="w-3 h-3" style={{ color: accentColor.textOnColor }} />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => addToCart(product)}
                                    className="w-9 h-9 rounded-full flex items-center justify-center transition-transform active:scale-90"
                                    style={{
                                        backgroundColor: accentColor.value,
                                        boxShadow: `0 2px 8px ${accentColor.value}30`
                                    }}
                                >
                                    <Plus className="w-4 h-4" style={{ color: accentColor.textOnColor }} />
                                </button>
                            )
                        )}
                    </div>
                </div>
            </motion.div>
        );
    };

    // ============================================
    // PHOTO LIST CARD - Image on RIGHT (photo-list layout)
    // ============================================
    const PhotoListCard = ({ product }: { product: MenuProduct }) => {
        const quantity = getCartItemQuantity(product.id);
        const isInCart = quantity > 0;

        return (
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedProduct(product)}
                className="flex items-center gap-4 p-4 cursor-pointer transition-all"
                style={{
                    backgroundColor: styleConfig.colors.cardBg,
                    borderRadius: styleConfig.cardStyle.borderRadius,
                    boxShadow: styleConfig.cardStyle.shadow,
                    opacity: product.in_stock ? 1 : 0.5,
                    border: `1px solid ${styleConfig.colors.border}`,
                }}
            >
                {/* Product Info - LEFT */}
                <div className="flex-1 min-w-0 py-1">
                    <h3
                        className="font-semibold text-base"
                        style={{
                            color: styleConfig.colors.text,
                            fontSize: styleConfig.typography.nameSize,
                            fontWeight: styleConfig.typography.nameWeight
                        }}
                    >
                        {product.name}
                    </h3>
                    {product.description && (
                        <p
                            className="mt-1 line-clamp-2 leading-snug"
                            style={{
                                color: styleConfig.colors.textSecondary,
                                fontSize: styleConfig.typography.descriptionSize
                            }}
                        >
                            {product.description}
                        </p>
                    )}
                    <p
                        className="font-bold mt-2"
                        style={{
                            color: accentColor.value,
                            fontSize: styleConfig.typography.priceSize
                        }}
                    >
                        {formatPrice(product.price)}
                    </p>
                </div>

                {/* Product Image - RIGHT */}
                {product.image ? (
                    <img
                        src={toR2ProxyUrl(product.image)}
                        alt={product.name}
                        className="w-24 h-24 rounded-2xl object-cover flex-shrink-0"
                        style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.12)" }}
                    />
                ) : (
                    <div
                        className="w-24 h-24 rounded-2xl flex-shrink-0 flex items-center justify-center"
                        style={{ backgroundColor: styleConfig.colors.border }}
                    >
                        <UtensilsCrossed className="w-10 h-10" style={{ color: styleConfig.colors.textSecondary }} />
                    </div>
                )}
            </motion.div>
        );
    };

    // ============================================
    // MINIMAL LIST CARD - Text only, no images (list layout)
    // ============================================
    const MinimalListCard = ({ product }: { product: MenuProduct }) => {
        return (
            <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => setSelectedProduct(product)}
                className="flex items-center justify-between py-4 cursor-pointer border-b"
                style={{
                    borderColor: styleConfig.colors.border,
                    opacity: product.in_stock ? 1 : 0.5,
                }}
            >
                <div className="flex-1 min-w-0 pr-4">
                    <h3
                        className="font-medium"
                        style={{
                            color: styleConfig.colors.text,
                            fontSize: styleConfig.typography.nameSize
                        }}
                    >
                        {product.name}
                    </h3>
                    {product.description && (
                        <p
                            className="mt-0.5 line-clamp-1"
                            style={{
                                color: styleConfig.colors.textSecondary,
                                fontSize: styleConfig.typography.descriptionSize
                            }}
                        >
                            {product.description}
                        </p>
                    )}
                </div>
                <p
                    className="font-medium flex-shrink-0"
                    style={{
                        color: styleConfig.colors.textSecondary,
                        fontSize: styleConfig.typography.priceSize
                    }}
                >
                    {formatPrice(product.price)}
                </p>
            </motion.div>
        );
    };

    // ============================================
    // HERO PRODUCT CARD - Single column, large image (hero layout)
    // ============================================
    const HeroProductCard = ({ product }: { product: MenuProduct }) => {
        const quantity = getCartItemQuantity(product.id);
        const isInCart = quantity > 0;

        return (
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedProduct(product)}
                className="overflow-hidden cursor-pointer transition-all"
                style={{
                    backgroundColor: styleConfig.colors.cardBg,
                    borderRadius: styleConfig.cardStyle.borderRadius,
                    boxShadow: styleConfig.cardStyle.shadow,
                    opacity: product.in_stock ? 1 : 0.5,
                    border: `1px solid ${styleConfig.colors.border}`,
                }}
            >
                {/* Large Product Image */}
                {product.image ? (
                    <div className="aspect-[16/10] overflow-hidden">
                        <img
                            src={toR2ProxyUrl(product.image)}
                            alt={product.name}
                            className="w-full h-full object-cover"
                        />
                    </div>
                ) : (
                    <div
                        className="aspect-[16/10] flex items-center justify-center"
                        style={{ backgroundColor: styleConfig.colors.border }}
                    >
                        <UtensilsCrossed className="w-16 h-16" style={{ color: styleConfig.colors.textSecondary }} />
                    </div>
                )}

                {/* Product Info */}
                <div className="p-4">
                    <h3
                        className="font-semibold"
                        style={{
                            color: styleConfig.colors.text,
                            fontSize: styleConfig.typography.nameSize,
                            fontWeight: styleConfig.typography.nameWeight
                        }}
                    >
                        {product.name}
                    </h3>
                    {product.description && (
                        <p
                            className="mt-1 line-clamp-2"
                            style={{
                                color: styleConfig.colors.textSecondary,
                                fontSize: styleConfig.typography.descriptionSize
                            }}
                        >
                            {product.description}
                        </p>
                    )}
                    <div className="flex justify-between items-center mt-3">
                        <p
                            className="font-bold"
                            style={{
                                color: accentColor.value,
                                fontSize: styleConfig.typography.priceSize
                            }}
                        >
                            {formatPrice(product.price)}
                        </p>
                        {menuSettings.cartEnabled && product.in_stock && (
                            isInCart ? (
                                <div
                                    className="flex items-center gap-1 p-1 rounded-full"
                                    style={{ backgroundColor: `${accentColor.value}15` }}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <button
                                        onClick={() => removeFromCart(product.id)}
                                        className="w-9 h-9 rounded-full flex items-center justify-center"
                                        style={{ backgroundColor: styleConfig.colors.border }}
                                    >
                                        <Minus className="w-4 h-4" style={{ color: styleConfig.colors.text }} />
                                    </button>
                                    <span className="w-8 text-center font-bold" style={{ color: styleConfig.colors.text }}>{quantity}</span>
                                    <button
                                        onClick={() => addToCart(product)}
                                        className="w-9 h-9 rounded-full flex items-center justify-center"
                                        style={{ backgroundColor: accentColor.value }}
                                    >
                                        <Plus className="w-4 h-4" style={{ color: accentColor.textOnColor }} />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={(e) => { e.stopPropagation(); addToCart(product); }}
                                    className="px-5 py-2.5 rounded-full font-semibold text-sm transition-all active:scale-95"
                                    style={{
                                        backgroundColor: accentColor.value,
                                        color: accentColor.textOnColor,
                                        boxShadow: `0 4px 14px ${accentColor.value}40`
                                    }}
                                >
                                    Ekle
                                </button>
                            )
                        )}
                    </div>
                </div>
            </motion.div>
        );
    };

    // Render products based on layout
    const renderProductCard = (product: MenuProduct) => {
        switch (styleConfig.layout) {
            case "hero":
                return <HeroProductCard key={product.id} product={product} />;
            case "photo-list":
                return <PhotoListCard key={product.id} product={product} />;
            case "list":
                return <MinimalListCard key={product.id} product={product} />;
            case "pill":
                return <PillProductCard key={product.id} product={product} />;
            default:
                return <GridProductCard key={product.id} product={product} />;
        }
    };

    // Get grid class based on layout
    const getGridClass = () => {
        switch (styleConfig.layout) {
            case "hero":
            case "photo-list":
            case "pill":
            case "list":
                return "space-y-4";
            case "compact-grid":
                return "grid grid-cols-3 gap-2";
            default:
                return "grid grid-cols-2 gap-3";
        }
    };

    return (
        <div
            className="min-h-screen pb-28"
            style={{
                backgroundColor: styleConfig.colors.background,
                fontFamily: 'var(--font-lora), "SF Pro Text", -apple-system, BlinkMacSystemFont, sans-serif'
            }}
        >
            {/* ============================================ */}
            {/* HEADER - Logo, Top Bar (scrolls away) */}
            {/* ============================================ */}
            <div
                ref={headerRef}
                style={{
                    backgroundColor: styleConfig.colors.cardBg,
                    borderBottom: `0.5px solid ${styleConfig.colors.border}`,
                }}
            >
                {/* Top Bar - Table name right, Waiter Call */}
                <div className="px-4 pt-3 pb-2 flex items-center justify-between">
                    {/* Left: Waiter Call */}
                    {menuSettings.waiterCallEnabled && businessWhatsapp ? (
                        <a
                            href={`https://wa.me/${businessWhatsapp}?text=${generateWaiterCallMessage()}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-sm transition-transform active:scale-95"
                            style={{
                                backgroundColor: accentColor.value,
                                color: accentColor.textOnColor,
                                boxShadow: `0 4px 14px ${accentColor.value}35`
                            }}
                        >
                            <Bell className="w-4 h-4" />
                            Garson
                        </a>
                    ) : (
                        <div />
                    )}

                    {/* Right: Table Name */}
                    <div className="text-right">
                        <p className="text-xs font-medium" style={{ color: styleConfig.colors.textSecondary }}>
                            Masa
                        </p>
                        <p className="text-base font-bold" style={{ color: styleConfig.colors.text }}>
                            {tableName || "—"}
                        </p>
                    </div>
                </div>

                {/* Centered Logo + Business Name + WiFi */}
                {menuSettings.showAvatar && (
                    <div className="flex flex-col items-center pb-4">
                        {businessLogo ? (
                            <img
                                src={businessLogo}
                                alt={businessName}
                                className="w-20 h-20 rounded-2xl object-cover"
                                style={{
                                    boxShadow: "0 6px 20px rgba(0,0,0,0.12)",
                                    border: `3px solid ${styleConfig.colors.cardBg}`
                                }}
                            />
                        ) : (
                            <div
                                className="w-20 h-20 rounded-2xl flex items-center justify-center text-white font-bold text-2xl"
                                style={{
                                    backgroundColor: accentColor.value,
                                    boxShadow: `0 6px 20px ${accentColor.value}40`
                                }}
                            >
                                {businessName.substring(0, 2).toUpperCase()}
                            </div>
                        )}
                        {/* Business Name Below Logo - BIGGER */}
                        <p
                            className="mt-3 text-xl font-bold text-center"
                            style={{ color: styleConfig.colors.text }}
                        >
                            {businessName}
                        </p>

                        {/* WiFi Password - Centered under business name */}
                        {menuSettings.wifiPassword && (
                            <button
                                onClick={copyWifiPassword}
                                className="mt-2 flex items-center gap-2 px-4 py-2 rounded-full font-medium text-sm transition-all active:scale-95"
                                style={{
                                    backgroundColor: styleConfig.colors.cardBg,
                                    color: styleConfig.colors.textSecondary,
                                    border: `1px solid ${styleConfig.colors.border}`
                                }}
                            >
                                <Wifi className="w-4 h-4" />
                                {wifiCopied ? (
                                    <>
                                        <Check className="w-4 h-4" style={{ color: accentColor.value }} />
                                        <span style={{ color: accentColor.value }}>Kopyalandı!</span>
                                    </>
                                ) : (
                                    <>WiFi: {menuSettings.wifiPassword}</>
                                )}
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* ============================================ */}
            {/* STICKY CATEGORY TABS - Stays fixed when scrolling */}
            {/* ============================================ */}
            <div
                className="sticky top-0 z-40 backdrop-blur-2xl"
                style={{
                    backgroundColor: `${styleConfig.colors.cardBg}f5`,
                    borderBottom: `0.5px solid ${styleConfig.colors.border}`,
                }}
            >
                <div className="px-4 py-3">
                    <div className="flex gap-2 overflow-x-auto scrollbar-hide py-1">
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => scrollToCategory(cat.id)}
                                className="px-5 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all active:scale-95"
                                style={{
                                    backgroundColor: activeCategory === cat.id ? accentColor.value : styleConfig.colors.cardBg,
                                    color: activeCategory === cat.id ? accentColor.textOnColor : styleConfig.colors.text,
                                    boxShadow: activeCategory === cat.id
                                        ? `0 4px 14px ${accentColor.value}40`
                                        : "0 2px 8px rgba(0,0,0,0.04)",
                                    border: activeCategory !== cat.id ? `1px solid ${styleConfig.colors.border}` : "none"
                                }}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ============================================ */}
            {/* PRODUCTS BY CATEGORY */}
            {/* ============================================ */}
            <div className="p-4 space-y-8">
                {categories.map(category => {
                    const categoryProducts = getProductsForCategory(category.id);
                    if (categoryProducts.length === 0) return null;

                    return (
                        <div
                            key={category.id}
                            ref={el => { categoryRefs.current[category.id] = el; }}
                        >
                            {/* Category Header */}
                            <div className="flex items-center gap-3 mb-4">
                                <h2
                                    className="text-xl font-bold"
                                    style={{ color: styleConfig.colors.text }}
                                >
                                    {category.name}
                                </h2>
                                <span
                                    className="px-2.5 py-1 rounded-full text-xs font-medium"
                                    style={{
                                        backgroundColor: `${accentColor.value}15`,
                                        color: accentColor.value
                                    }}
                                >
                                    {categoryProducts.length}
                                </span>
                            </div>

                            {/* Products */}
                            <div className={getGridClass()}>
                                {categoryProducts.map(product => renderProductCard(product))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ============================================ */}
            {/* FLOATING CART BAR */}
            {/* ============================================ */}
            <AnimatePresence>
                {menuSettings.cartEnabled && cartCount > 0 && (
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        className="fixed bottom-6 left-4 right-4 z-50"
                    >
                        <button
                            onClick={() => setShowCart(true)}
                            className="w-full p-4 rounded-2xl flex items-center justify-between text-white transition-transform active:scale-[0.98]"
                            style={{
                                backgroundColor: accentColor.value,
                                boxShadow: `0 8px 32px ${accentColor.value}50, 0 4px 12px rgba(0,0,0,0.15)`
                            }}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                                    <ShoppingBag className="w-5 h-5" />
                                </div>
                                <div className="text-left">
                                    <p className="text-xs opacity-80 font-medium">Sepetim</p>
                                    <p className="font-bold text-base">{cartCount} ürün</p>
                                </div>
                            </div>
                            <p className="font-bold text-xl">{formatPrice(cartTotal)}</p>
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ============================================ */}
            {/* CART MODAL */}
            {/* ============================================ */}
            <AnimatePresence>
                {showCart && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end"
                        onClick={() => setShowCart(false)}
                    >
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 28, stiffness: 300 }}
                            onClick={e => e.stopPropagation()}
                            className="w-full max-h-[85vh] rounded-t-3xl overflow-hidden"
                            style={{ backgroundColor: styleConfig.colors.cardBg }}
                        >
                            {/* Handle */}
                            <div className="flex justify-center py-3">
                                <div className="w-10 h-1 rounded-full bg-gray-300" />
                            </div>

                            {/* Header */}
                            <div className="px-5 pb-4 flex items-center justify-between">
                                <h2 className="font-bold text-xl" style={{ color: styleConfig.colors.text }}>
                                    Sepetim
                                </h2>
                                <button
                                    onClick={() => setShowCart(false)}
                                    className="p-2.5 rounded-full transition-colors"
                                    style={{ backgroundColor: styleConfig.colors.border }}
                                >
                                    <X className="w-5 h-5" style={{ color: styleConfig.colors.text }} />
                                </button>
                            </div>

                            {/* Items */}
                            <div className="px-5 pb-4 space-y-3 max-h-[45vh] overflow-y-auto">
                                {cart.map(item => (
                                    <div
                                        key={item.product.id}
                                        className="flex items-center gap-3 p-3 rounded-2xl"
                                        style={{ backgroundColor: styleConfig.colors.background }}
                                    >
                                        <div className="flex-1">
                                            <p className="font-semibold" style={{ color: styleConfig.colors.text }}>{item.product.name}</p>
                                            <p className="text-sm font-medium" style={{ color: accentColor.value }}>
                                                {formatPrice(item.product.price)}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => removeFromCart(item.product.id)}
                                                className="w-9 h-9 rounded-full flex items-center justify-center"
                                                style={{ backgroundColor: styleConfig.colors.border }}
                                            >
                                                <Minus className="w-4 h-4" style={{ color: styleConfig.colors.text }} />
                                            </button>
                                            <span className="w-7 text-center font-bold" style={{ color: styleConfig.colors.text }}>
                                                {item.quantity}
                                            </span>
                                            <button
                                                onClick={() => addToCart(item.product)}
                                                className="w-9 h-9 rounded-full flex items-center justify-center"
                                                style={{ backgroundColor: accentColor.value }}
                                            >
                                                <Plus className="w-4 h-4" style={{ color: accentColor.textOnColor }} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Footer */}
                            <div className="p-5 border-t" style={{ borderColor: styleConfig.colors.border }}>
                                <div className="flex justify-between items-center mb-4">
                                    <span className="font-medium" style={{ color: styleConfig.colors.textSecondary }}>Toplam</span>
                                    <span className="font-bold text-2xl" style={{ color: accentColor.value }}>
                                        {formatPrice(cartTotal)}
                                    </span>
                                </div>
                                {menuSettings.whatsappOrderEnabled && businessWhatsapp && (
                                    <a
                                        href={`https://wa.me/${businessWhatsapp}?text=${generateOrderMessage()}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-bold text-white text-base transition-transform active:scale-[0.98]"
                                        style={{
                                            backgroundColor: "#25D366",
                                            boxShadow: "0 4px 16px rgba(37,211,102,0.35)"
                                        }}
                                    >
                                        <MessageCircle className="w-5 h-5" />
                                        WhatsApp ile Sipariş Ver
                                    </a>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ============================================ */}
            {/* PRODUCT DETAIL MODAL - Half screen slide up */}
            {/* ============================================ */}
            <AnimatePresence>
                {selectedProduct && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end"
                        onClick={() => setSelectedProduct(null)}
                    >
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 28, stiffness: 300 }}
                            onClick={e => e.stopPropagation()}
                            className="w-full max-h-[75vh] rounded-t-3xl overflow-hidden"
                            style={{ backgroundColor: styleConfig.colors.cardBg }}
                        >
                            {/* Handle */}
                            <div className="flex justify-center py-3">
                                <div className="w-10 h-1 rounded-full" style={{ backgroundColor: styleConfig.colors.border }} />
                            </div>

                            {/* Close button */}
                            <button
                                onClick={() => setSelectedProduct(null)}
                                className="absolute top-4 right-4 p-2.5 rounded-full z-10"
                                style={{ backgroundColor: styleConfig.colors.border }}
                            >
                                <X className="w-5 h-5" style={{ color: styleConfig.colors.text }} />
                            </button>

                            {/* Product Image */}
                            {selectedProduct.image && (
                                <div className="w-full h-48 overflow-hidden">
                                    <img
                                        src={selectedProduct.image}
                                        alt={selectedProduct.name}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            )}

                            {/* Product Info */}
                            <div className="p-6">
                                <h2
                                    className="text-2xl font-bold mb-2"
                                    style={{ color: styleConfig.colors.text }}
                                >
                                    {selectedProduct.name}
                                </h2>

                                <p
                                    className="text-2xl font-bold mb-4"
                                    style={{ color: accentColor.value }}
                                >
                                    {formatPrice(selectedProduct.price)}
                                </p>

                                {selectedProduct.description && (
                                    <p
                                        className="leading-relaxed mb-6"
                                        style={{ color: styleConfig.colors.textSecondary }}
                                    >
                                        {selectedProduct.description}
                                    </p>
                                )}

                                {/* Add to Cart Button */}
                                {menuSettings.cartEnabled && selectedProduct.in_stock && (
                                    <button
                                        onClick={() => {
                                            addToCart(selectedProduct);
                                            setSelectedProduct(null);
                                        }}
                                        className="w-full py-4 rounded-2xl font-bold text-lg transition-transform active:scale-[0.98]"
                                        style={{
                                            backgroundColor: accentColor.value,
                                            color: accentColor.textOnColor,
                                            boxShadow: `0 4px 16px ${accentColor.value}40`
                                        }}
                                    >
                                        Sepete Ekle
                                    </button>
                                )}

                                {!selectedProduct.in_stock && (
                                    <div
                                        className="w-full py-4 rounded-2xl text-center font-medium"
                                        style={{
                                            backgroundColor: styleConfig.colors.border,
                                            color: styleConfig.colors.textSecondary
                                        }}
                                    >
                                        Stokta Yok
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

