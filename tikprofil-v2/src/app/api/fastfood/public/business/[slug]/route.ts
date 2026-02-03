import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;
    const { searchParams } = new URL(request.url);
    const tableId = searchParams.get("table");

    const supabase = getSupabaseAdmin();

    // İşletme bilgilerini al
    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .select("id, name, slug, logo, wifi_password")
      .eq("slug", slug)
      .eq("status", "active")
      .single();

    if (businessError || !business) {
      return NextResponse.json(
        { success: false, error: "İşletme bulunamadı" },
        { status: 404 }
      );
    }

    // Masa bilgilerini al (eğer tableId varsa)
    let table = null;
    if (tableId) {
      const { data: tableData } = await supabase
        .from("fb_tables")
        .select("id, name")
        .eq("id", tableId)
        .eq("business_id", business.id)
        .single();
      
      table = tableData;

      // Scan count'u artır
      if (tableData) {
        await supabase.rpc("increment_table_scan", { table_id: tableId });
      }
    }

    return NextResponse.json({
      success: true,
      business: {
        id: business.id,
        name: business.name,
        slug: business.slug,
        logo: business.logo,
        wifiPassword: business.wifi_password,
      },
      table: table ? {
        id: table.id,
        name: table.name,
      } : null,
    });
  } catch (error) {
    console.error("Error fetching business:", error);
    return NextResponse.json(
      { success: false, error: "Sunucu hatası" },
      { status: 500 }
    );
  }
}
