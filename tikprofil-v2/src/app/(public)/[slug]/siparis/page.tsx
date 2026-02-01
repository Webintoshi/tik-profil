import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShoppingCart, Phone, Loader2 } from "lucide-react";
import { toR2ProxyUrl } from "@/lib/publicImage";

// Types
interface Category {
    id: string;
    name: string;
    icon: string;
    isActive: boolean;
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
}

interface Business {
    id: string;
    slug: string;
    name: string;
    logo?: string;
    phone?: string;
    whatsapp?: string;
}

async function getBusinessBySlug(slug: string): Promise<Business | null> {
    try {
        const { getSupabaseAdmin } = await import("@/lib/supabase");
        const supabase = getSupabaseAdmin();

        const { data, error } = await supabase
            .from('businesses')
            .select('id, slug, name, logo, phone, whatsapp')
            .ilike('slug', slug)
            .maybeSingle();

        if (error || !data) return null;

        return {
            id: data.id as string,
            slug: (data.slug as string) || slug,
            name: (data.name as string) || "İşletme",
            logo: data.logo as string | undefined,
            phone: data.phone as string | undefined,
            whatsapp: (data.whatsapp as string) || (data.phone as string) || undefined,
        };
    } catch (error) {
        console.error("Error fetching business:", error);
        return null;
    }
}

async function getCategories(businessId: string): Promise<Category[]> {
    try {
        const { getSupabaseAdmin } = await import("@/lib/supabase");
        const supabase = getSupabaseAdmin();

        const { data, error } = await supabase
            .from('ff_categories')
            .select('*')
            .eq('business_id', businessId);

        if (error) return [];

        return (data || [])
            .filter(cat => cat.is_active !== false)
            .map(cat => ({
                id: cat.id,
                name: cat.name,
                icon: cat.icon || '🍔',
                isActive: cat.is_active !== false,
            }))
            .sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
        console.error("Error fetching categories:", error);
        return [];
    }
}

async function getProducts(businessId: string): Promise<Product[]> {
    try {
        const { getSupabaseAdmin } = await import("@/lib/supabase");
        const supabase = getSupabaseAdmin();

        const { data, error } = await supabase
            .from('ff_products')
            .select('*')
            .eq('business_id', businessId);

        if (error) return [];

        return (data || [])
            .filter(product => product.is_active !== false && product.in_stock !== false)
            .map(product => ({
                id: product.id,
                name: product.name,
                description: product.description || '',
                price: Number(product.price || 0),
                categoryId: product.category_id,
                imageUrl: product.image_url || '',
                isActive: product.is_active !== false,
                inStock: product.in_stock !== false,
            }));
    } catch (error) {
        console.error("Error fetching products:", error);
        return [];
    }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    const business = await getBusinessBySlug(slug);
    if (!business) return { title: "Sipariş | Tık Profil" };
    return {
        title: `${business.name} - Sipariş Ver | Tık Profil`,
    };
}

export default async function PublicOrderPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const business = await getBusinessBySlug(slug);

    if (!business) {
        notFound();
    }

    const [categories, products] = await Promise.all([
        getCategories(business.id),
        getProducts(business.id),
    ]);

    // Group products by category
    const productsByCategory = categories.map(cat => ({
        ...cat,
        products: products.filter(p => p.categoryId === cat.id),
    })).filter(cat => cat.products.length > 0);

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-2xl mx-auto px-4 py-4">
                    <div className="flex items-center gap-4">
                        <Link
                            href={`/${business.slug}`}
                            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </Link>
                        <div className="flex items-center gap-3">
                            {business.logo ? (
                                <img src={toR2ProxyUrl(business.logo)} alt={business.name} className="w-10 h-10 rounded-full object-cover" />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold">
                                    {business.name.substring(0, 2).toUpperCase()}
                                </div>
                            )}
                            <div>
                                <h1 className="font-semibold text-gray-900">{business.name}</h1>
                                <p className="text-sm text-gray-500">Menü</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Menu */}
            <div className="max-w-2xl mx-auto px-4 py-6">
                {productsByCategory.length === 0 ? (
                    <div className="text-center py-12">
                        <ShoppingCart className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                        <h2 className="text-lg font-medium text-gray-700">Menü henüz hazırlanmamış</h2>
                        <p className="text-gray-500 mt-1">Yakında ürünler eklenecek.</p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {productsByCategory.map((category) => (
                            <div key={category.id}>
                                {/* Category Header */}
                                <div className="flex items-center gap-2 mb-4">
                                    <span className="text-2xl">{category.icon}</span>
                                    <h2 className="text-lg font-bold text-gray-900">{category.name}</h2>
                                </div>

                                {/* Products */}
                                <div className="space-y-3">
                                    {category.products.map((product) => (
                                        <div
                                            key={product.id}
                                            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex gap-4"
                                        >
                                            {product.imageUrl && (
                                                <img
                                                    src={toR2ProxyUrl(product.imageUrl)}
                                                    alt={product.name}
                                                    className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
                                                />
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start">
                                                    <h3 className="font-semibold text-gray-900">{product.name}</h3>
                                                    <p className="text-lg font-bold text-orange-500 ml-2">
                                                        ₺{product.price.toLocaleString('tr-TR')}
                                                    </p>
                                                </div>
                                                {product.description && (
                                                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                                                        {product.description}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Contact CTA */}
                {business.whatsapp && productsByCategory.length > 0 && (
                    <div className="mt-8 sticky bottom-4">
                        <a
                            href={`https://wa.me/${business.whatsapp}?text=${encodeURIComponent(`Merhaba, ${business.name}'den sipariş vermek istiyorum.\n\n_Tık Profil üzerinden gönderilmiştir_\nhttps://tikprofil.com`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full h-14 rounded-2xl flex items-center justify-center gap-2 font-bold text-white bg-[#25D366] shadow-lg hover:bg-[#20bd5a] transition-colors"
                        >
                            <Phone className="w-5 h-5" />
                            WhatsApp ile Sipariş Ver
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
}
