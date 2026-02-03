import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tableId, businessId, message } = body;

    if (!tableId || !businessId) {
      return NextResponse.json(
        { success: false, error: "Masa ID ve işletme ID gerekli" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Garson çağrısını kaydet
    const { error } = await supabase.from("ff_waiter_calls").insert({
      business_id: businessId,
      table_id: tableId,
      message: message || "Garson çağrıldı",
      status: "pending",
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Error saving waiter call:", error);
      return NextResponse.json(
        { success: false, error: "Garson çağrılamadı" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Garson çağrıldı",
    });
  } catch (error) {
    console.error("Error calling waiter:", error);
    return NextResponse.json(
      { success: false, error: "Sunucu hatası" },
      { status: 500 }
    );
  }
}
