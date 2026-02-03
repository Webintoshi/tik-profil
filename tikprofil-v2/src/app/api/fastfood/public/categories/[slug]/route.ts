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

    // Kategorileri al
    const { data: categories, error } = await supabase
      .from("ff_categories")
      .select("id, name, icon")
      .eq("business_id", business.id)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("Error fetching categories:", error);
      return NextResponse.json(
        { success: false, error: "Kategoriler yüklenemedi" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      categories: categories || [],
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { success: false, error: "Sunucu hatası" },
      { status: 500 }
    );
  }
}
