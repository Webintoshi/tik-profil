import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;
    const supabase = getSupabaseAdmin();

    // Önce işletmeyi bul
    const { data: business } = await supabase
      .from("businesses")
      .select("id")
      .eq("slug", slug)
      .eq("status", "active")
      .single();

    if (!business) {
      return NextResponse.json(
        { success: false, error: "İşletme bulunamadı" },
        { status: 404 }
      );
    }

    // Ürünleri al
    const { data: products, error } = await supabase
      .from("ff_products")
      .select("id, name, description, price, image_url, category_id, sizes, extras, in_stock")
      .eq("business_id", business.id)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("Error fetching products:", error);
      return NextResponse.json(
        { success: false, error: "Ürünler yüklenemedi" },
        { status: 500 }
      );
    }

    // Format products
    const formattedProducts = (products || []).map((product) => ({
      id: product.id,
      name: product.name,
      description: product.description,
      price: Number(product.price),
      imageUrl: product.image_url,
      categoryId: product.category_id,
      sizes: product.sizes || [],
      extras: product.extras || [],
      inStock: product.in_stock !== false,
    }));

    return NextResponse.json({
      success: true,
      products: formattedProducts,
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { success: false, error: "Sunucu hatası" },
      { status: 500 }
    );
  }
}
