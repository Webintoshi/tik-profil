"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    Coffee, ShoppingBag, Wifi, ChevronLeft, Star,
    Plus, Minus, X
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface Product {
    id: string;
    name: string;
    description: string;
    image_url: string;
    base_price: number;
    discount_price: number | null;
    temperature: string;
    category_id: string;
    is_featured: boolean;
}

interface Category {
    id: string;
    name: string;
}

interface Size {
    id: string;
    name: string;
    price_modifier: number;
}

interface CartItem {
    product: Product;
    size: Size | null;
    quantity: number;
}

export default function CoffeeMenuPage() {
    const params = useParams();
    const slug = params.slug as string;
    
    const [business, setBusiness] = useState<any>(null);
    const [categories, setCategories] = useState<Category[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [sizes, setSizes] = useState<Size[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState<string>("");
    const [cart, setCart] = useState<CartItem[]>([]);
    const [showCart, setShowCart] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

    useEffect(() => {
        fetchMenu();
    }, [slug]);

    const fetchMenu = async () => {
        try {
            const res = await fetch(`/api/coffee/public-menu?slug=${slug}`);
            if (res.ok) {
                const data = await res.json();
                setBusiness(data.data.business);
                setCategories(data.data.categories);
                setProducts(data.data.products);
                setSizes(data.data.sizes);
                if (data.data.categories.length > 0) {
                    setActiveCategory(data.data.categories[0].id);
                }
            }
        } catch (error) {
            console.error("Error fetching menu:", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredProducts = products.filter(p => 
        activeCategory === "" || p.category_id === activeCategory
    );

    const addToCart = (product: Product, size: Size | null, quantity: number) => {
        const existingIndex = cart.findIndex(
            item => item.product.id === product.id && item.size?.id === size?.id
        );

        if (existingIndex >= 0) {
            const newCart = [...cart];
            newCart[existingIndex].quantity += quantity;
            setCart(newCart);
        } else {
            setCart([...cart, { product, size, quantity }]);
        }
        setSelectedProduct(null);
    };

    const cartTotal = cart.reduce((sum, item) => {
        const sizeModifier = item.size?.price_modifier || 0;
        const price = item.product.discount_price || item.product.base_price;
        return sum + (price + sizeModifier) * item.quantity;
    }, 0);

    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#07070a] flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-white/10 border-t-[#fe1e50] rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#07070a] text-white">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-[#07070a]/95 backdrop-blur-xl border-b border-white/[0.08]">
                <div className="max-w-3xl mx-auto px-4 py-4">
                    <div className="flex items-center gap-4">
                        <Link href={`/${slug}`} className="p-2 hover:bg-white/[0.05] rounded-full">
                            <ChevronLeft className="w-6 h-6" />
                        </Link>
                        <div className="flex-1">
                            <h1 className="font-bold text-lg">{business?.name}</h1>
                            <p className="text-white/50 text-sm">Kahve Menüsü</p>
                        </div>
                        <button className="p-2 bg-white/[0.05] rounded-xl">
                            <Wifi className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Category Tabs */}
            <div className="sticky top-[73px] z-40 bg-[#07070a]/95 backdrop-blur-xl border-b border-white/[0.08]">
                <div className="max-w-3xl mx-auto px-4 py-3">
                    <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                        {categories.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.id)}
                                className={`px-4 py-2 rounded-full whitespace-nowrap font-medium transition-all ${
                                    activeCategory === cat.id
                                        ? 'bg-[#fe1e50] text-white'
                                        : 'bg-white/[0.05] text-white/60 hover:bg-white/[0.1]'
                                }`}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Products */}
            <main className="max-w-3xl mx-auto px-4 py-6 pb-32">
                {/* Featured Products */}
                {products.some(p => p.is_featured) && (
                    <div className="mb-8">
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <Star className="w-5 h-5 text-amber-400" />
                            Öne Çıkanlar
                        </h2>
                        <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
                            {products.filter(p => p.is_featured).map(product => (
                                <motion.div
                                    key={product.id}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setSelectedProduct(product)}
                                    className="flex-shrink-0 w-40 bg-white/[0.03] border border-white/[0.08] rounded-2xl overflow-hidden cursor-pointer"
                                >
                                    <div className="aspect-square relative">
                                        {product.image_url ? (
                                            <Image src={product.image_url} alt={product.name} fill className="object-cover" />
                                        ) : (
                                            <div className="w-full h-full bg-white/[0.05] flex items-center justify-center">
                                                <Coffee className="w-8 h-8 text-white/20" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-3">
                                        <h3 className="font-medium text-sm truncate">{product.name}</h3>
                                        <p className="text-[#fe1e50] font-bold mt-1">₺{product.base_price}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Product Grid */}
                <div className="grid grid-cols-2 gap-4">
                    {filteredProducts.map((product) => (
                        <motion.div
                            key={product.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setSelectedProduct(product)}
                            className="bg-white/[0.03] border border-white/[0.08] rounded-2xl overflow-hidden cursor-pointer"
                        >
                            <div className="aspect-square relative">
                                {product.image_url ? (
                                    <Image src={product.image_url} alt={product.name} fill className="object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-white/[0.05] flex items-center justify-center">
                                        <Coffee className="w-12 h-12 text-white/20" />
                                    </div>
                                )}
                                {product.temperature === 'hot' && (
                                    <div className="absolute top-2 left-2 px-2 py-1 bg-orange-500/80 text-white text-xs rounded-full">Sıcak</div>
                                )}
                                {product.temperature === 'iced' && (
                                    <div className="absolute top-2 left-2 px-2 py-1 bg-blue-500/80 text-white text-xs rounded-full">Soğuk</div>
                                )}
                            </div>
                            <div className="p-4">
                                <h3 className="font-bold">{product.name}</h3>
                                <p className="text-white/50 text-sm line-clamp-2 mt-1">{product.description}</p>
                                <div className="flex items-center justify-between mt-3">
                                    <span className="text-lg font-bold text-[#fe1e50]">₺{product.base_price}</span>
                                    <button className="w-8 h-8 bg-[#fe1e50] rounded-full flex items-center justify-center">
                                        <Plus className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </main>

            {/* Cart Button */}
            {cartCount > 0 && (
                <motion.button
                    initial={{ y: 100 }}
                    animate={{ y: 0 }}
                    onClick={() => setShowCart(true)}
                    className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-6 py-4 bg-[#fe1e50] text-white rounded-full shadow-2xl shadow-[#fe1e50]/30"
                >
                    <ShoppingBag className="w-5 h-5" />
                    <span className="font-bold">{cartCount} ürün</span>
                    <span className="font-bold">₺{cartTotal.toFixed(2)}</span>
                </motion.button>
            )}

            {/* Product Modal */}
            <AnimatePresence>
                {selectedProduct && (
                    <ProductModal
                        product={selectedProduct}
                        sizes={sizes}
                        onClose={() => setSelectedProduct(null)}
                        onAdd={addToCart}
                    />
                )}
            </AnimatePresence>

            {/* Cart Modal */}
            <AnimatePresence>
                {showCart && (
                    <CartModal
                        cart={cart}
                        onClose={() => setShowCart(false)}
                        total={cartTotal}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

function ProductModal({ product, sizes, onClose, onAdd }: {
    product: Product;
    sizes: Size[];
    onClose: () => void;
    onAdd: (p: Product, s: Size | null, q: number) => void;
}) {
    const [selectedSize, setSelectedSize] = useState<Size | null>(sizes[0] || null);
    const [quantity, setQuantity] = useState(1);

    const totalPrice = (product.discount_price || product.base_price) + (selectedSize?.price_modifier || 0);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center"
            onClick={onClose}
        >
            <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                className="w-full max-w-lg bg-[#0f0f1a] rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-auto"
                onClick={e => e.stopPropagation()}
            >
                <div className="aspect-video relative">
                    {product.image_url ? (
                        <Image src={product.image_url} alt={product.name} fill className="object-cover rounded-t-3xl" />
                    ) : (
                        <div className="w-full h-full bg-white/[0.05] flex items-center justify-center">
                            <Coffee className="w-20 h-20 text-white/20" />
                        </div>
                    )}
                    <button onClick={onClose} className="absolute top-4 right-4 w-10 h-10 bg-black/50 backdrop-blur rounded-full flex items-center justify-center">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6">
                    <h2 className="text-2xl font-bold">{product.name}</h2>
                    <p className="text-white/60 mt-2">{product.description}</p>

                    {sizes.length > 0 && (
                        <div className="mt-6">
                            <h3 className="font-medium mb-3">Boyut Seçimi</h3>
                            <div className="grid grid-cols-2 gap-2">
                                {sizes.map(size => (
                                    <button
                                        key={size.id}
                                        onClick={() => setSelectedSize(size)}
                                        className={`p-3 rounded-xl border text-left transition-colors ${
                                            selectedSize?.id === size.id
                                                ? 'border-[#fe1e50] bg-[#fe1e50]/10'
                                                : 'border-white/[0.1] bg-white/[0.03]'
                                        }`}
                                    >
                                        <div className="font-medium">{size.name}</div>
                                        <div className="text-sm text-white/50">
                                            {size.price_modifier > 0 ? `+₺${size.price_modifier}` : 
                                             size.price_modifier < 0 ? `-₺${Math.abs(size.price_modifier)}` : 'Standart'}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="mt-6">
                        <h3 className="font-medium mb-3">Adet</h3>
                        <div className="flex items-center gap-4">
                            <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-12 h-12 bg-white/[0.05] rounded-xl flex items-center justify-center">
                                <Minus className="w-5 h-5" />
                            </button>
                            <span className="text-2xl font-bold w-12 text-center">{quantity}</span>
                            <button onClick={() => setQuantity(quantity + 1)} className="w-12 h-12 bg-white/[0.05] rounded-xl flex items-center justify-center">
                                <Plus className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    <button
                        onClick={() => onAdd(product, selectedSize, quantity)}
                        className="w-full mt-6 py-4 bg-[#fe1e50] hover:bg-[#fe1e50]/90 text-white rounded-xl font-bold text-lg"
                    >
                        Sepete Ekle - ₺{(totalPrice * quantity).toFixed(2)}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

function CartModal({ cart, onClose, total }: {
    cart: CartItem[];
    onClose: () => void;
    total: number;
}) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center"
            onClick={onClose}
        >
            <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                className="w-full max-w-lg bg-[#0f0f1a] rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-auto"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold">Sepetim</h2>
                        <button onClick={onClose} className="p-2 hover:bg-white/[0.05] rounded-full">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="space-y-4">
                        {cart.map((item, index) => (
                            <div key={index} className="flex gap-4 p-4 bg-white/[0.03] rounded-xl">
                                {item.product.image_url && (
                                    <Image src={item.product.image_url} alt={item.product.name} width={80} height={80} className="w-20 h-20 rounded-xl object-cover" />
                                )}
                                <div className="flex-1">
                                    <h3 className="font-bold">{item.product.name}</h3>
                                    {item.size && <p className="text-white/50 text-sm">{item.size.name}</p>}
                                    <p className="text-white/60">Adet: {item.quantity}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold">₺{((item.product.discount_price || item.product.base_price) + (item.size?.price_modifier || 0)) * item.quantity}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-6 pt-6 border-t border-white/[0.1]">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-white/60">Toplam</span>
                            <span className="text-2xl font-bold">₺{total.toFixed(2)}</span>
                        </div>
                        <button className="w-full py-4 bg-[#fe1e50] hover:bg-[#fe1e50]/90 text-white rounded-xl font-bold text-lg">
                            Siparişi Tamamla
                        </button>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}
