"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Plus,
    Search,
    Edit3,
    Trash2,
    Loader2,
    Image as ImageIcon,
    Check,
    X,
    FolderOpen,
    Upload,
    GripVertical,
    ArrowUp,
    ArrowDown,
    Clock,
    ChevronDown,
    ChevronRight,
    Flame,
    AlertTriangle,
    Tag,
    Percent,
    Sparkles
} from "lucide-react";
import clsx from "clsx";
import { toast } from "sonner";
import { useTheme } from "@/components/panel/ThemeProvider";
import { ALLERGEN_OPTIONS, TAG_OPTIONS, TAX_RATES, type SizeOption, type AllergenId, type TagId, type TaxRate } from "@/types/fastfood";
import { toR2ProxyUrl } from "@/lib/publicImage";
import { uploadImageWithFallback } from "@/lib/clientUpload";

interface Category {
    id: string;
    name: string;
    icon: string;
    sortOrder: number;
}

interface Product {
    id: string;
    name: string;
    description: string;
    price: number;
    categoryId: string;
    imageUrl: string;
    isActive: boolean;
    inStock: boolean;
    sortOrder: number;
    extraGroupIds?: string[];
    // New fields
    sizes?: SizeOption[];
    prepTime?: number;
    taxRate?: TaxRate;
    allergens?: AllergenId[];
    discountPrice?: number;
    discountUntil?: string;
    tags?: TagId[];
    calories?: number;
    spicyLevel?: 1 | 2 | 3 | 4 | 5;
    // Stock management fields
    trackStock?: boolean;
    stock?: number;
}

interface ExtraGroup {
    id: string;
    name: string;
    selectionType: 'single' | 'multiple';
    isRequired: boolean;
}

export default function FastFoodProductsPage() {
    const { isDark } = useTheme();
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [extraGroups, setExtraGroups] = useState<ExtraGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string>("all");

    // Modal States
    const [showModal, setShowModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        price: "",
        categoryId: "",
        imageUrl: "",
        isActive: true,
        inStock: true,
        extraGroupIds: [] as string[],
        // New fields
        sizes: [] as SizeOption[],
        prepTime: "",
        taxRate: "" as string,
        allergens: [] as AllergenId[],
        discountPrice: "",
        discountUntil: "",
        tags: [] as TagId[],
        calories: "",
        spicyLevel: "" as string,
        // Stock management fields
        trackStock: false,
        stock: "999"
    });
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [generatingImage, setGeneratingImage] = useState(false);

    // Drag state
    const [draggedItem, setDraggedItem] = useState<string | null>(null);
    const [dragOverItem, setDragOverItem] = useState<string | null>(null);
    const [isSavingOrder, setIsSavingOrder] = useState(false);

    // Collapsed categories state - start with all collapsed
    const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

    // Custom delete confirmation state
    const [productToDelete, setProductToDelete] = useState<Product | null>(null);

    // Theme Variables
    const pageBg = isDark ? "bg-black" : "bg-[#F5F5F7]";
    const cardBg = isDark ? "bg-[#1C1C1E]" : "bg-white";
    const textPrimary = isDark ? "text-white" : "text-[#1D1D1F]";
    const textSecondary = isDark ? "text-[#86868B]" : "text-[#86868B]";
    const borderColor = isDark ? "border-[#38383A]" : "border-[#D2D2D7]";
    const inputBg = isDark ? "bg-[#2C2C2E]" : "bg-[#E5E5EA]";

    // Initial Data Load
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [catRes, prodRes, extrasRes] = await Promise.all([
                fetch("/api/fastfood/categories"),
                fetch("/api/fastfood/products"),
                fetch("/api/fastfood/extras")
            ]);

            const catData = await catRes.json();
            const prodData = await prodRes.json();
            const extrasData = await extrasRes.json();

            if (catData.success) {
                const sortedCats = (catData.categories || []).sort((a: Category, b: Category) =>
                    (a.sortOrder || 0) - (b.sortOrder || 0)
                );
                setCategories(sortedCats);
            }
            if (prodData.success) {
                const sortedProds = (prodData.products || []).sort((a: Product, b: Product) =>
                    (a.sortOrder || 0) - (b.sortOrder || 0)
                );
                setProducts(sortedProds);
            }
            if (extrasData.success) {
                setExtraGroups(extrasData.groups || []);
            }
        } catch (error) {
            console.error("Failed to load data:", error);
            toast.error("Veriler yüklenemedi");
        } finally {
            setLoading(false);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            toast.error("Dosya boyutu 5MB'dan küçük olmalı");
            return;
        }

        setUploading(true);
        const reader = new FileReader();
        reader.onload = (e) => {
            if (e.target?.result) {
                setFormData(prev => ({ ...prev, imageUrl: e.target!.result as string }));
            }
        };
        reader.readAsDataURL(file);

        try {
            const { url } = await uploadImageWithFallback({
                file,
                moduleName: "fastfood",
                fallbackEndpoint: "/api/fastfood/upload",
            });

            if (url) {
                setFormData(prev => ({ ...prev, imageUrl: url }));
                toast.success("Foto?Yraf y??klendi");
            } else {
                toast.error("Foto?Yraf y??klenemedi");
            }
        } catch (error) {
            console.error("Upload error:", error);
            toast.error("Fotoğraf yükleme hatası");
        } finally {
            setUploading(false);
        }
    };

    // AI Image Generation
    const handleGenerateImage = async () => {
        if (!formData.name.trim()) {
            toast.error("Lütfen önce ürün adını girin");
            return;
        }

        setGeneratingImage(true);
        try {
            // Get category name for context
            const categoryName = categories.find(c => c.id === formData.categoryId)?.name || 'Food';

            const res = await fetch('/api/fastfood/generate-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    businessType: 'Fast Food',
                    businessName: 'Restaurant', // Will be enhanced to get actual business name
                    productTitle: formData.name.trim(),
                    productDescription: formData.description.trim() || formData.name.trim(),
                    category: categoryName,
                }),
            });

            const data = await res.json();

            if (data.success && data.imageUrl) {
                setFormData(prev => ({ ...prev, imageUrl: data.imageUrl }));
                toast.success("✨ Görsel başarıyla oluşturuldu!");
            } else {
                toast.error(data.error || "Görsel oluşturulamadı");
            }
        } catch (error) {
            console.error("Generate image error:", error);
            toast.error("Görsel oluşturma hatası");
        } finally {
            setGeneratingImage(false);
        }
    };

    const openModal = (product?: Product) => {
        if (product) {
            setEditingProduct(product);
            setFormData({
                name: product.name,
                description: product.description,
                price: product.price.toString(),
                categoryId: product.categoryId,
                imageUrl: product.imageUrl,
                isActive: product.isActive,
                inStock: product.inStock,
                extraGroupIds: product.extraGroupIds || [],
                // New fields
                sizes: product.sizes || [],
                prepTime: product.prepTime?.toString() || "",
                taxRate: product.taxRate?.toString() || "",
                allergens: product.allergens || [],
                discountPrice: product.discountPrice?.toString() || "",
                discountUntil: product.discountUntil || "",
                tags: product.tags || [],
                calories: product.calories?.toString() || "",
                spicyLevel: product.spicyLevel?.toString() || "",
                // Stock management fields
                trackStock: product.trackStock || false,
                stock: product.stock?.toString() || "999"
            });
        } else {
            setEditingProduct(null);
            setFormData({
                name: "",
                description: "",
                price: "",
                categoryId: categories[0]?.id || "",
                imageUrl: "",
                isActive: true,
                inStock: true,
                extraGroupIds: [],
                // New fields
                sizes: [],
                prepTime: "",
                taxRate: "",
                allergens: [],
                discountPrice: "",
                discountUntil: "",
                tags: [],
                calories: "",
                spicyLevel: "",
                // Stock management fields
                trackStock: false,
                stock: "999"
            });
        }
        setShowModal(true);
    };

    const handleSubmit = async () => {
        // Validation
        if (!formData.name.trim() || !formData.price || !formData.categoryId) {
            toast.error("İsim, kategori ve fiyat zorunludur");
            return;
        }

        // Block if image is still uploading
        if (uploading) {
            toast.error("Fotoğraf yükleniyor, lütfen bekleyin");
            return;
        }

        if (formData.imageUrl?.startsWith("data:image/")) {
            toast.error("Görsel yükleme tamamlanmadan kaydedilemez");
            return;
        }

        // Note: When uploading is false, formData.imageUrl should already contain 
        // the cloud URL (set in handleImageUpload after successful upload)

        setSaving(true);
        try {
            const url = "/api/fastfood/products";
            const method = editingProduct ? "PUT" : "POST";
            const categoryProducts = products.filter(p => p.categoryId === formData.categoryId);

            // Build request body with proper type conversions
            const requestBody = {
                ...(editingProduct && { id: editingProduct.id }),
                name: formData.name,
                description: formData.description,
                price: parseFloat(formData.price),
                categoryId: formData.categoryId,
                imageUrl: formData.imageUrl,
                isActive: formData.isActive,
                inStock: formData.inStock,
                extraGroupIds: formData.extraGroupIds,
                sortOrder: editingProduct ? editingProduct.sortOrder : categoryProducts.length,
                // New fields
                sizes: formData.sizes.length > 0 ? formData.sizes : null,
                prepTime: formData.prepTime ? parseInt(formData.prepTime) : null,
                taxRate: formData.taxRate ? parseInt(formData.taxRate) : null,
                allergens: formData.allergens.length > 0 ? formData.allergens : null,
                discountPrice: formData.discountPrice ? parseFloat(formData.discountPrice) : null,
                discountUntil: formData.discountUntil || null,
                tags: formData.tags.length > 0 ? formData.tags : null,
                calories: formData.calories ? parseInt(formData.calories) : null,
                spicyLevel: formData.spicyLevel ? parseInt(formData.spicyLevel) : null,
                // Stock management fields
                trackStock: formData.trackStock,
                stock: formData.trackStock ? parseInt(formData.stock) || 0 : 999
            };

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestBody),
            });

            const data = await res.json();
            if (data.success) {
                toast.success(editingProduct ? "Ürün güncellendi" : "Ürün eklendi");
                setShowModal(false);
                loadData();
            } else {
                toast.error(data.error || "İşlem başarısız");
            }
        } catch (error) {
            console.error("Save error:", error);
            toast.error("Bir hata oluştu");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            const res = await fetch(`/api/fastfood/products?id=${id}`, { method: "DELETE" });
            const data = await res.json();
            if (data.success) {
                toast.success("Ürün silindi");
                setProducts(prev => prev.filter(p => p.id !== id));
            } else {
                toast.error(data.error || "Silme başarısız");
            }
        } catch (error) {
            console.error("Delete error:", error);
            toast.error("Bir hata oluştu");
        }
    };

    const toggleStock = async (product: Product, e: React.MouseEvent) => {
        e.stopPropagation();

        const newStatus = !product.inStock;
        setProducts(prev => prev.map(p => p.id === product.id ? { ...p, inStock: newStatus } : p));

        try {
            await fetch("/api/fastfood/products", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: product.id, inStock: newStatus }),
            });
            toast.success(newStatus ? "Ürün stoğa eklendi" : "Ürün tükendi olarak işaretlendi");
        } catch (error) {
            console.error("Stock toggle error:", error);
            setProducts(prev => prev.map(p => p.id === product.id ? { ...p, inStock: !newStatus } : p));
            toast.error("Güncelleme başarısız");
        }
    };

    // Drag and Drop handlers
    const handleDragStart = (e: React.DragEvent, productId: string) => {
        setDraggedItem(productId);
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", productId);
        if (e.currentTarget instanceof HTMLElement) {
            e.currentTarget.style.opacity = "0.5";
        }
    };

    const handleDragEnd = (e: React.DragEvent) => {
        setDraggedItem(null);
        setDragOverItem(null);
        if (e.currentTarget instanceof HTMLElement) {
            e.currentTarget.style.opacity = "1";
        }
    };

    const handleDragOver = (e: React.DragEvent, productId: string) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (productId !== draggedItem) {
            setDragOverItem(productId);
        }
    };

    const handleDragLeave = () => {
        setDragOverItem(null);
    };

    const handleDrop = async (e: React.DragEvent, targetId: string) => {
        e.preventDefault();
        setDragOverItem(null);

        if (!draggedItem || draggedItem === targetId) return;

        const draggedProduct = products.find(p => p.id === draggedItem);
        const targetProduct = products.find(p => p.id === targetId);

        // Only allow reordering within same category
        if (!draggedProduct || !targetProduct || draggedProduct.categoryId !== targetProduct.categoryId) {
            toast.error("Ürünler sadece aynı kategori içinde sıralanabilir");
            return;
        }

        // Get products in same category
        const categoryProducts = products
            .filter(p => p.categoryId === draggedProduct.categoryId)
            .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

        const draggedIndex = categoryProducts.findIndex(p => p.id === draggedItem);
        const targetIndex = categoryProducts.findIndex(p => p.id === targetId);

        if (draggedIndex === -1 || targetIndex === -1) return;

        const newCategoryProducts = [...categoryProducts];
        const [removed] = newCategoryProducts.splice(draggedIndex, 1);
        newCategoryProducts.splice(targetIndex, 0, removed);

        // Update sort orders for this category
        const updatedProducts = products.map(p => {
            if (p.categoryId === draggedProduct.categoryId) {
                const newIndex = newCategoryProducts.findIndex(cp => cp.id === p.id);
                return { ...p, sortOrder: newIndex };
            }
            return p;
        });

        setProducts(updatedProducts);
        setDraggedItem(null);

        // Save to server
        await saveNewOrder(newCategoryProducts.map((p, i) => ({ ...p, sortOrder: i })));
    };

    const saveNewOrder = async (orderedProducts: Product[]) => {
        setIsSavingOrder(true);
        try {
            const updates = orderedProducts.map((prod, index) =>
                fetch("/api/fastfood/products", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: prod.id, sortOrder: index }),
                })
            );

            await Promise.all(updates);
            toast.success("Sıralama kaydedildi");
        } catch (error) {
            console.error("Save order error:", error);
            toast.error("Sıralama kaydedilemedi");
            loadData();
        } finally {
            setIsSavingOrder(false);
        }
    };

    // Move up/down for mobile
    const moveProduct = async (productId: string, direction: 'up' | 'down') => {
        const product = products.find(p => p.id === productId);
        if (!product) return;

        const categoryProducts = products
            .filter(p => p.categoryId === product.categoryId)
            .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

        const index = categoryProducts.findIndex(p => p.id === productId);
        if (index === -1) return;

        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= categoryProducts.length) return;

        const newCategoryProducts = [...categoryProducts];
        [newCategoryProducts[index], newCategoryProducts[newIndex]] = [newCategoryProducts[newIndex], newCategoryProducts[index]];

        const updatedProducts = products.map(p => {
            if (p.categoryId === product.categoryId) {
                const newSortIndex = newCategoryProducts.findIndex(cp => cp.id === p.id);
                return { ...p, sortOrder: newSortIndex };
            }
            return p;
        });

        setProducts(updatedProducts);
        await saveNewOrder(newCategoryProducts.map((p, i) => ({ ...p, sortOrder: i })));
    };

    const filteredProducts = products
        .filter(product => {
            const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = selectedCategory === "all" || product.categoryId === selectedCategory;
            return matchesSearch && matchesCategory;
        })
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

    // Group products by category for display
    const groupedProducts = selectedCategory === "all"
        ? categories.map(cat => ({
            category: cat,
            products: filteredProducts.filter(p => p.categoryId === cat.id)
        })).filter(g => g.products.length > 0)
        : [{ category: categories.find(c => c.id === selectedCategory), products: filteredProducts }];

    return (
        <div className={clsx("min-h-screen p-4 md:p-8 space-y-8 font-sans transition-colors duration-300", pageBg, textPrimary)}>

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight">Ürünler</h1>
                    <p className={clsx("text-lg mt-2 font-medium", textSecondary)}>
                        Sürükleyerek sıralayın, menünüzü şekillendirin
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {isSavingOrder && (
                        <span className="flex items-center gap-2 text-sm text-blue-500">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Kaydediliyor...
                        </span>
                    )}
                    <button
                        onClick={() => openModal()}
                        className="group flex items-center gap-3 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-semibold shadow-lg shadow-blue-500/30 transition-all active:scale-95"
                    >
                        <Plus className="w-6 h-6" />
                        <span className="text-base">Yeni Ürün</span>
                    </button>
                </div>
            </div>

            {/* Controls */}
            <div className="flex flex-col md:flex-row gap-4 items-center">
                {/* Search */}
                <div className="relative w-full md:w-96">
                    <Search className={clsx("absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5", textSecondary)} />
                    <input
                        type="text"
                        placeholder="Ürünlerde ara..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={clsx(
                            "w-full pl-12 pr-4 py-3.5 rounded-2xl text-base font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500",
                            inputBg, textPrimary
                        )}
                    />
                </div>

                {/* Categories */}
                <div className="flex-1 w-full overflow-x-auto no-scrollbar pb-2 md:pb-0">
                    <div className="flex gap-3">
                        <button
                            onClick={() => setSelectedCategory("all")}
                            className={clsx(
                                "px-6 py-3 rounded-2xl font-semibold whitespace-nowrap transition-all",
                                selectedCategory === "all"
                                    ? (isDark ? "bg-white text-black" : "bg-black text-white")
                                    : (isDark ? "bg-[#2C2C2E] text-gray-400 hover:bg-[#3A3A3C]" : "bg-white text-gray-500 shadow-sm hover:bg-gray-50")
                            )}
                        >
                            Tümü ({products.length})
                        </button>
                        {categories.map((cat) => {
                            const count = products.filter(p => p.categoryId === cat.id).length;
                            return (
                                <button
                                    key={cat.id}
                                    onClick={() => setSelectedCategory(cat.id)}
                                    className={clsx(
                                        "px-6 py-3 rounded-2xl font-semibold whitespace-nowrap transition-all flex items-center gap-2",
                                        selectedCategory === cat.id
                                            ? (isDark ? "bg-white text-black" : "bg-black text-white")
                                            : (isDark ? "bg-[#2C2C2E] text-gray-400 hover:bg-[#3A3A3C]" : "bg-white text-gray-500 shadow-sm hover:bg-gray-50")
                                    )}
                                >
                                    <span>{cat.icon}</span>
                                    {cat.name}
                                    <span className="text-xs opacity-60">({count})</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-32">
                    <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
                    <p className={textSecondary}>Ürünler yükleniyor...</p>
                </div>
            ) : filteredProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 text-center">
                    <div className={clsx("w-32 h-32 rounded-full flex items-center justify-center mb-6", isDark ? "bg-[#1C1C1E]" : "bg-white shadow-sm")}>
                        <FolderOpen className={clsx("w-12 h-12 opacity-50", textSecondary)} />
                    </div>
                    <h3 className="text-2xl font-bold mb-3">Hiç ürün yok</h3>
                    <p className={clsx("max-w-md text-lg mb-6", textSecondary)}>
                        {selectedCategory !== "all" ? "Bu kategoride henüz ürün bulunmuyor." : "Henüz hiç ürün eklenmemiş."}
                    </p>
                    <button
                        onClick={() => openModal()}
                        className="text-blue-500 font-bold hover:underline"
                    >
                        İlk ürünü ekle
                    </button>
                </div>
            ) : (
                <div className="space-y-8">
                    {groupedProducts.map(({ category, products: catProducts }) => (
                        <div key={category?.id || 'all'} className={clsx("rounded-3xl overflow-hidden", cardBg, borderColor, "border")}>
                            {/* Category Header - Collapsible */}
                            {selectedCategory === "all" && category && (
                                <button
                                    onClick={() => setExpandedCategories(prev =>
                                        prev.includes(category.id)
                                            ? prev.filter(id => id !== category.id)
                                            : [...prev, category.id]
                                    )}
                                    className={clsx("w-full px-6 py-4 border-b flex items-center gap-3 transition-colors hover:bg-opacity-50", borderColor, isDark ? "hover:bg-white/5" : "hover:bg-gray-50")}
                                >
                                    {expandedCategories.includes(category.id) ? (
                                        <ChevronDown className="w-5 h-5 text-gray-500" />
                                    ) : (
                                        <ChevronRight className="w-5 h-5 text-gray-500" />
                                    )}
                                    <span className="text-2xl">{category.icon}</span>
                                    <h2 className="font-bold text-lg">{category.name}</h2>
                                    <span className={clsx("text-sm", textSecondary)}>({catProducts.length} ürün)</span>
                                </button>
                            )}

                            {/* Products List - Collapsible */}
                            {(selectedCategory !== "all" || !category || expandedCategories.includes(category.id)) && (
                                <div className="divide-y" style={{ borderColor: isDark ? '#38383A' : '#E5E5EA' }}>
                                    {catProducts.map((product, index) => (
                                        <div
                                            key={product.id}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, product.id)}
                                            onDragEnd={handleDragEnd}
                                            onDragOver={(e) => handleDragOver(e, product.id)}
                                            onDragLeave={handleDragLeave}
                                            onDrop={(e) => handleDrop(e, product.id)}
                                            className={clsx(
                                                "flex items-center gap-4 p-4 transition-all group cursor-pointer",
                                                isDark ? "hover:bg-white/5" : "hover:bg-gray-50",
                                                draggedItem === product.id && "opacity-50",
                                                dragOverItem === product.id && (isDark ? "bg-blue-500/10 border-l-4 border-blue-500" : "bg-blue-50 border-l-4 border-blue-500"),
                                                !product.inStock && "opacity-60"
                                            )}
                                            onClick={(e) => {
                                                // Don't open modal if user clicked on a button or inside action area
                                                const target = e.target as HTMLElement;
                                                if (target.closest('button') || target.closest('[data-action-area]')) {
                                                    return;
                                                }
                                                openModal(product);
                                            }}
                                        >
                                            {/* Drag Handle */}
                                            <div
                                                className={clsx(
                                                    "p-2 rounded-lg cursor-grab active:cursor-grabbing transition-colors hidden md:block",
                                                    isDark ? "text-gray-600 hover:text-gray-400 hover:bg-white/5" : "text-gray-300 hover:text-gray-500 hover:bg-gray-100"
                                                )}
                                                onClick={(e) => e.stopPropagation()}
                                                title="Sürükleyerek sırala"
                                            >
                                                <GripVertical className="w-5 h-5" />
                                            </div>

                                            {/* Image */}
                                            <div className={clsx(
                                                "w-16 h-16 rounded-xl overflow-hidden flex-shrink-0",
                                                isDark ? "bg-[#2C2C2E]" : "bg-gray-100"
                                            )}>
                                                {product.imageUrl ? (
                                                    <img src={toR2ProxyUrl(product.imageUrl)} alt={product.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <ImageIcon className={clsx("w-6 h-6", textSecondary)} />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-bold text-base truncate">{product.name}</h3>
                                                <p className={clsx("text-sm truncate", textSecondary)}>
                                                    {product.description || "Açıklama yok"}
                                                </p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="font-bold text-blue-500">₺{product.price}</span>
                                                    <span className={clsx(
                                                        "text-xs px-2 py-0.5 rounded-full",
                                                        product.inStock
                                                            ? (isDark ? "bg-green-500/10 text-green-400" : "bg-green-50 text-green-600")
                                                            : (isDark ? "bg-red-500/10 text-red-400" : "bg-red-50 text-red-600")
                                                    )}>
                                                        {product.inStock ? "Stokta" : "Tükendi"}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Mobile Move Buttons */}
                                            <div className="flex flex-col gap-1 md:hidden">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); moveProduct(product.id, 'up'); }}
                                                    disabled={index === 0}
                                                    className={clsx(
                                                        "p-1.5 rounded-lg transition-colors disabled:opacity-30",
                                                        isDark ? "hover:bg-white/10" : "hover:bg-gray-100"
                                                    )}
                                                >
                                                    <ArrowUp className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); moveProduct(product.id, 'down'); }}
                                                    disabled={index === catProducts.length - 1}
                                                    className={clsx(
                                                        "p-1.5 rounded-lg transition-colors disabled:opacity-30",
                                                        isDark ? "hover:bg-white/10" : "hover:bg-gray-100"
                                                    )}
                                                >
                                                    <ArrowDown className="w-4 h-4" />
                                                </button>
                                            </div>

                                            {/* Actions */}
                                            <div data-action-area className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                {/* Stock Toggle */}
                                                <button
                                                    onClick={(e) => toggleStock(product, e)}
                                                    className={clsx(
                                                        "w-12 h-7 rounded-full transition-colors relative",
                                                        product.inStock ? "bg-green-500" : (isDark ? "bg-gray-700" : "bg-gray-300")
                                                    )}
                                                    title={product.inStock ? "Tükendi olarak işaretle" : "Stoğa ekle"}
                                                >
                                                    <span className={clsx(
                                                        "absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm transition-transform",
                                                        product.inStock ? "left-6" : "left-1"
                                                    )} />
                                                </button>

                                                {/* Edit */}
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); openModal(product); }}
                                                    className={clsx(
                                                        "p-2.5 rounded-xl transition-colors opacity-0 group-hover:opacity-100",
                                                        isDark ? "hover:bg-blue-500/10 text-blue-400" : "hover:bg-blue-50 text-blue-600"
                                                    )}
                                                    title="Düzenle"
                                                >
                                                    <Edit3 className="w-5 h-5" />
                                                </button>

                                                {/* Delete */}
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        setProductToDelete(product);
                                                    }}
                                                    className={clsx(
                                                        "p-2.5 rounded-xl transition-colors opacity-0 group-hover:opacity-100",
                                                        isDark ? "hover:bg-red-500/10 text-red-400" : "hover:bg-red-50 text-red-600"
                                                    )}
                                                    title="Sil"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Drag hint */}
            {filteredProducts.length > 1 && (
                <p className={clsx("text-center text-sm", textSecondary)}>
                    💡 Ürünleri aynı kategori içinde sürükleyerek sıralayabilirsiniz
                </p>
            )}

            {/* Modal */}
            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {productToDelete && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={() => setProductToDelete(null)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className={clsx(
                                "relative w-full max-w-md p-6 rounded-3xl shadow-2xl overflow-hidden",
                                isDark ? "bg-[#1C1C1E] border border-white/10" : "bg-white"
                            )}
                        >
                            <div className="flex flex-col items-center text-center gap-4">
                                <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center">
                                    <Trash2 className="w-8 h-8 text-red-500" />
                                </div>
                                <div>
                                    <h3 className={clsx("text-xl font-bold mb-2", textPrimary)}>
                                        Ürünü Sil
                                    </h3>
                                    <p className={textSecondary}>
                                        <span className="font-semibold text-red-500">{productToDelete.name}</span> isimli ürünü silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
                                    </p>
                                </div>
                                <div className="flex gap-3 w-full mt-2">
                                    <button
                                        onClick={() => setProductToDelete(null)}
                                        className={clsx(
                                            "flex-1 py-3 rounded-xl font-semibold transition-colors",
                                            isDark ? "bg-white/5 hover:bg-white/10 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-900"
                                        )}
                                    >
                                        İptal
                                    </button>
                                    <button
                                        onClick={async () => {
                                            await handleDelete(productToDelete.id);
                                            setProductToDelete(null);
                                        }}
                                        className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-colors shadow-lg shadow-red-500/20"
                                    >
                                        Sil
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-md"
                        onClick={() => setShowModal(false)}
                    />
                    <div
                        className={clsx(
                            "relative w-full max-w-2xl rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]",
                            isDark ? "bg-[#1C1C1E] border border-white/10" : "bg-white"
                        )}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="p-8 pb-4 flex items-center justify-between shrink-0">
                            <h2 className="text-3xl font-bold tracking-tight">
                                {editingProduct ? "Ürünü Düzenle" : "Yeni Ürün"}
                            </h2>
                            <button
                                onClick={() => setShowModal(false)}
                                className={clsx(
                                    "p-2.5 rounded-full transition-colors",
                                    isDark ? "bg-[#2C2C2E] hover:bg-[#3A3A3C]" : "bg-gray-100 hover:bg-gray-200"
                                )}
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Scrollable Form */}
                        <div className="p-8 pt-2 overflow-y-auto">
                            <div className="flex flex-col md:flex-row gap-8">

                                {/* Left: Image Upload */}
                                <div className="w-full md:w-1/3 flex flex-col gap-4">
                                    <label className={clsx(
                                        "relative aspect-square rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all border-2 border-dashed overflow-hidden group",
                                        inputBg, borderColor,
                                        "hover:border-blue-500 hover:scale-[1.02]"
                                    )}>
                                        {formData.imageUrl ? (
                                            <img src={toR2ProxyUrl(formData.imageUrl)} className="w-full h-full object-cover" alt="" />
                                        ) : (
                                            <>
                                                <div className="p-4 rounded-full bg-blue-500/10 mb-3 group-hover:bg-blue-500/20 transition-colors">
                                                    <ImageIcon className="w-8 h-8 text-blue-500" />
                                                </div>
                                                <span className={clsx("text-sm font-semibold", textSecondary)}>Fotoğraf Ekle</span>
                                            </>
                                        )}

                                        {formData.imageUrl && (
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Upload className="w-8 h-8 text-white" />
                                            </div>
                                        )}

                                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                                        {uploading && (
                                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                                <Loader2 className="w-8 h-8 animate-spin text-white" />
                                            </div>
                                        )}
                                        {generatingImage && (
                                            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/80 to-pink-500/80 flex flex-col items-center justify-center">
                                                <Loader2 className="w-10 h-10 animate-spin text-white mb-2" />
                                                <span className="text-white text-sm font-medium">AI Oluşturuyor...</span>
                                            </div>
                                        )}
                                    </label>

                                    {/* AI Generate Button */}
                                    <button
                                        type="button"
                                        onClick={handleGenerateImage}
                                        disabled={generatingImage || !formData.name.trim()}
                                        className={clsx(
                                            "w-full py-3 px-4 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-all",
                                            "bg-gradient-to-r from-purple-600 to-pink-600 text-white",
                                            "hover:from-purple-700 hover:to-pink-700 hover:shadow-lg hover:shadow-purple-500/25",
                                            "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
                                        )}
                                    >
                                        {generatingImage ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                AI Oluşturuyor...
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="w-4 h-4" />
                                                AI ile Görsel Oluştur
                                            </>
                                        )}
                                    </button>

                                    <p className="text-xs text-center text-gray-500">
                                        Önerilen: 500x500px, Max 5MB
                                    </p>
                                </div>

                                {/* Right: Inputs */}
                                <div className="flex-1 space-y-6">
                                    <div>
                                        <label className={clsx("block text-sm font-bold ml-1 mb-2", textSecondary)}>ÜRÜN ADI</label>
                                        <input
                                            type="text"
                                            placeholder="Örn: Double Cheeseburger"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            className={clsx(
                                                "w-full px-5 py-4 rounded-2xl text-lg font-semibold outline-none border focus:border-blue-500 transition-all",
                                                inputBg, isDark ? "border-transparent" : "border-transparent focus:shadow-md"
                                            )}
                                            autoFocus
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className={clsx("block text-sm font-bold ml-1 mb-2", textSecondary)}>FİYAT (₺)</label>
                                            <input
                                                type="number"
                                                placeholder="0.00"
                                                value={formData.price}
                                                onChange={e => setFormData({ ...formData, price: e.target.value })}
                                                className={clsx(
                                                    "w-full px-5 py-4 rounded-2xl text-lg font-semibold outline-none border focus:border-blue-500 transition-all",
                                                    inputBg, isDark ? "border-transparent" : "border-transparent focus:shadow-md"
                                                )}
                                            />
                                        </div>
                                        <div>
                                            <label className={clsx("block text-sm font-bold ml-1 mb-2", textSecondary)}>KATEGORİ</label>
                                            <select
                                                value={formData.categoryId}
                                                onChange={e => setFormData({ ...formData, categoryId: e.target.value })}
                                                className={clsx(
                                                    "w-full px-5 py-4 rounded-2xl text-lg font-semibold outline-none border focus:border-blue-500 transition-all appearance-none cursor-pointer",
                                                    inputBg, isDark ? "border-transparent" : "border-transparent focus:shadow-md"
                                                )}
                                            >
                                                {categories.map(c => (
                                                    <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className={clsx("block text-sm font-bold ml-1 mb-2", textSecondary)}>AÇIKLAMA</label>
                                        <textarea
                                            rows={3}
                                            placeholder="İçindekiler, alerjenler vb..."
                                            value={formData.description}
                                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                                            className={clsx(
                                                "w-full px-5 py-4 rounded-2xl text-base font-medium outline-none border focus:border-blue-500 transition-all resize-none",
                                                inputBg, isDark ? "border-transparent" : "border-transparent focus:shadow-md"
                                            )}
                                        />
                                    </div>

                                    {/* Extra Groups Selection */}
                                    {extraGroups.length > 0 && (
                                        <div>
                                            <label className={clsx("block text-sm font-bold ml-1 mb-2", textSecondary)}>
                                                EKSTRALAR (Opsiyonel)
                                            </label>
                                            <p className={clsx("text-xs ml-1 mb-3", textSecondary)}>
                                                Bu ürün için geçerli olacak ekstra gruplarını seçin
                                            </p>
                                            <div className="grid grid-cols-2 gap-2">
                                                {extraGroups.map(group => {
                                                    const isSelected = formData.extraGroupIds.includes(group.id);
                                                    return (
                                                        <button
                                                            key={group.id}
                                                            type="button"
                                                            onClick={() => {
                                                                setFormData(prev => ({
                                                                    ...prev,
                                                                    extraGroupIds: isSelected
                                                                        ? prev.extraGroupIds.filter(id => id !== group.id)
                                                                        : [...prev.extraGroupIds, group.id]
                                                                }));
                                                            }}
                                                            className={clsx(
                                                                "p-3 rounded-xl border-2 text-left transition-all",
                                                                isSelected
                                                                    ? "border-blue-500 bg-blue-50"
                                                                    : (isDark ? "border-[#3A3A3C] bg-[#2C2C2E]" : "border-gray-200 bg-gray-50")
                                                            )}
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <span className={clsx("font-semibold text-sm", isSelected ? "text-blue-700" : textPrimary)}>
                                                                    {group.name}
                                                                </span>
                                                                {isSelected && <Check className="w-4 h-4 text-blue-600" />}
                                                            </div>
                                                            <span className={clsx("text-xs mt-0.5 block", textSecondary)}>
                                                                {group.selectionType === 'single' ? 'Tekli seçim' : 'Çoklu seçim'}
                                                                {group.isRequired && ' • Zorunlu'}
                                                            </span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* === NEW SECTIONS === */}

                                    {/* Details Row: Prep Time, Tax Rate, Calories */}
                                    <div className="grid grid-cols-3 gap-3">
                                        <div>
                                            <label className={clsx("block text-xs font-bold ml-1 mb-1", textSecondary)}>
                                                <Clock className="w-3 h-3 inline mr-1" />
                                                HAZIRLIK (dk)
                                            </label>
                                            <input
                                                type="number"
                                                placeholder="15"
                                                value={formData.prepTime}
                                                onChange={e => setFormData({ ...formData, prepTime: e.target.value })}
                                                className={clsx(
                                                    "w-full px-4 py-3 rounded-xl text-base font-medium outline-none border focus:border-blue-500 transition-all",
                                                    inputBg, isDark ? "border-transparent" : "border-transparent"
                                                )}
                                            />
                                        </div>
                                        <div>
                                            <label className={clsx("block text-xs font-bold ml-1 mb-1", textSecondary)}>
                                                <Percent className="w-3 h-3 inline mr-1" />
                                                KDV ORANI
                                            </label>
                                            <select
                                                value={formData.taxRate}
                                                onChange={e => setFormData({ ...formData, taxRate: e.target.value })}
                                                className={clsx(
                                                    "w-full px-4 py-3 rounded-xl text-base font-medium outline-none border focus:border-blue-500 transition-all appearance-none cursor-pointer",
                                                    inputBg, isDark ? "border-transparent" : "border-transparent"
                                                )}
                                            >
                                                <option value="">Seçin</option>
                                                {TAX_RATES.map(rate => (
                                                    <option key={rate.value} value={rate.value}>{rate.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className={clsx("block text-xs font-bold ml-1 mb-1", textSecondary)}>
                                                <Flame className="w-3 h-3 inline mr-1" />
                                                KALORİ
                                            </label>
                                            <input
                                                type="number"
                                                placeholder="450"
                                                value={formData.calories}
                                                onChange={e => setFormData({ ...formData, calories: e.target.value })}
                                                className={clsx(
                                                    "w-full px-4 py-3 rounded-xl text-base font-medium outline-none border focus:border-blue-500 transition-all",
                                                    inputBg, isDark ? "border-transparent" : "border-transparent"
                                                )}
                                            />
                                        </div>
                                    </div>

                                    {/* Allergens */}
                                    <div>
                                        <label className={clsx("block text-sm font-bold ml-1 mb-2", textSecondary)}>
                                            <AlertTriangle className="w-4 h-4 inline mr-1" />
                                            ALERJENLER
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            {ALLERGEN_OPTIONS.map(allergen => {
                                                const isSelected = formData.allergens.includes(allergen.id);
                                                return (
                                                    <button
                                                        key={allergen.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setFormData(prev => ({
                                                                ...prev,
                                                                allergens: isSelected
                                                                    ? prev.allergens.filter(id => id !== allergen.id)
                                                                    : [...prev.allergens, allergen.id]
                                                            }));
                                                        }}
                                                        className={clsx(
                                                            "px-3 py-1.5 rounded-full text-sm font-medium transition-all border",
                                                            isSelected
                                                                ? "bg-red-100 border-red-300 text-red-700"
                                                                : (isDark ? "bg-[#2C2C2E] border-[#3A3A3C] text-gray-400" : "bg-gray-100 border-gray-200 text-gray-600")
                                                        )}
                                                    >
                                                        {allergen.icon} {allergen.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Tags */}
                                    <div>
                                        <label className={clsx("block text-sm font-bold ml-1 mb-2", textSecondary)}>
                                            <Tag className="w-4 h-4 inline mr-1" />
                                            ETİKETLER
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            {TAG_OPTIONS.map(tag => {
                                                const isSelected = formData.tags.includes(tag.id);
                                                return (
                                                    <button
                                                        key={tag.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setFormData(prev => ({
                                                                ...prev,
                                                                tags: isSelected
                                                                    ? prev.tags.filter(id => id !== tag.id)
                                                                    : [...prev.tags, tag.id]
                                                            }));
                                                        }}
                                                        className={clsx(
                                                            "px-3 py-1.5 rounded-full text-sm font-medium transition-all border",
                                                            isSelected
                                                                ? "bg-blue-100 border-blue-300 text-blue-700"
                                                                : (isDark ? "bg-[#2C2C2E] border-[#3A3A3C] text-gray-400" : "bg-gray-100 border-gray-200 text-gray-600")
                                                        )}
                                                    >
                                                        {tag.icon} {tag.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Discount */}
                                    <div className={clsx("p-4 rounded-2xl border", isDark ? "bg-[#2C2C2E] border-[#3A3A3C]" : "bg-gray-50 border-gray-200")}>
                                        <label className={clsx("block text-sm font-bold mb-3", textSecondary)}>
                                            💰 İNDİRİM (Opsiyonel)
                                        </label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className={clsx("block text-xs font-medium ml-1 mb-1", textSecondary)}>İndirimli Fiyat (₺)</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    placeholder={formData.price ? `< ${formData.price}` : "0.00"}
                                                    value={formData.discountPrice}
                                                    onChange={e => setFormData({ ...formData, discountPrice: e.target.value })}
                                                    className={clsx(
                                                        "w-full px-4 py-3 rounded-xl text-base font-medium outline-none border focus:border-green-500 transition-all",
                                                        inputBg, isDark ? "border-transparent" : "border-transparent"
                                                    )}
                                                />
                                            </div>
                                            <div>
                                                <label className={clsx("block text-xs font-medium ml-1 mb-1", textSecondary)}>Bitiş Tarihi</label>
                                                <input
                                                    type="date"
                                                    value={formData.discountUntil}
                                                    onChange={e => setFormData({ ...formData, discountUntil: e.target.value })}
                                                    className={clsx(
                                                        "w-full px-4 py-3 rounded-xl text-base font-medium outline-none border focus:border-green-500 transition-all",
                                                        inputBg, isDark ? "border-transparent" : "border-transparent"
                                                    )}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* === END NEW SECTIONS === */}

                                    {/* Stock Management */}
                                    <div className={clsx("p-4 rounded-2xl border", isDark ? "bg-[#2C2C2E] border-[#3A3A3C]" : "bg-gray-50 border-gray-200")}>
                                        <div className="flex items-center justify-between mb-3">
                                            <label className={clsx("block text-sm font-bold", textSecondary)}>
                                                📦 STOK YÖNETİMİ
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => setFormData(prev => ({
                                                    ...prev,
                                                    trackStock: !prev.trackStock,
                                                    stock: !prev.trackStock ? (prev.inStock ? "999" : "0") : "999"
                                                }))}
                                                className={clsx(
                                                    "w-12 h-7 rounded-full transition-colors relative",
                                                    formData.trackStock ? "bg-blue-500" : (isDark ? "bg-[#3A3A3C]" : "bg-gray-300")
                                                )}
                                                title={formData.trackStock ? "Stok takibini kapat" : "Stok takibini aç"}
                                            >
                                                <span className={clsx(
                                                    "absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform",
                                                    formData.trackStock ? "left-6" : "left-1"
                                                )} />
                                            </button>
                                        </div>

                                        <p className={clsx("text-xs mb-3", textSecondary)}>
                                            {formData.trackStock
                                                ? "Stok takibi aktif. Her siparişte stok otomatik azalır."
                                                : "Stok takibi kapalı. Ürün sınırsız stoklu (999) olarak işaretlenir."
                                            }
                                        </p>

                                        {formData.trackStock && (
                                            <div>
                                                <label className={clsx("block text-xs font-medium ml-1 mb-1", textSecondary)}>
                                                    Mevcut Stok Miktarı
                                                </label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="9999"
                                                    placeholder="999"
                                                    value={formData.stock}
                                                    onChange={e => {
                                                        const value = e.target.value;
                                                        const numValue = parseInt(value) || 0;
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            stock: value,
                                                            inStock: numValue > 0
                                                        }));
                                                    }}
                                                    className={clsx(
                                                        "w-full px-4 py-3 rounded-xl text-base font-medium outline-none border focus:border-blue-500 transition-all",
                                                        inputBg, isDark ? "border-transparent" : "border-transparent"
                                                    )}
                                                />
                                                <p className={clsx("text-xs mt-1", textSecondary)}>
                                                    0 = Stokta yok, 999 = Sınırsız stok
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Toggles */}
                                    <div className="flex gap-6 pt-2">
                                        <div className="flex items-center gap-3">
                                            <span className="font-semibold text-sm">Aktif</span>
                                            <button
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, isActive: !prev.isActive }))}
                                                className={clsx(
                                                    "w-12 h-7 rounded-full transition-colors relative",
                                                    formData.isActive ? "bg-green-500" : (isDark ? "bg-[#3A3A3C]" : "bg-gray-300")
                                                )}
                                            >
                                                <span className={clsx(
                                                    "absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform",
                                                    formData.isActive ? "left-6" : "left-1"
                                                )} />
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="font-semibold text-sm">Stokta</span>
                                            <button
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, inStock: !prev.inStock }))}
                                                className={clsx(
                                                    "w-12 h-7 rounded-full transition-colors relative",
                                                    formData.inStock ? "bg-green-500" : (isDark ? "bg-[#3A3A3C]" : "bg-gray-300")
                                                )}
                                            >
                                                <span className={clsx(
                                                    "absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform",
                                                    formData.inStock ? "left-6" : "left-1"
                                                )} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className={clsx("p-6 border-t mt-auto", borderColor)}>
                            <button
                                onClick={handleSubmit}
                                disabled={saving || uploading || !formData.name.trim() || !formData.price || !formData.categoryId}
                                className="w-full py-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50 text-white rounded-2xl font-bold text-xl shadow-xl shadow-blue-500/20 transition-all flex items-center justify-center gap-3"
                            >
                                {saving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Check className="w-6 h-6" />}
                                {editingProduct ? "Değişiklikleri Kaydet" : "Ürünü Oluştur"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
