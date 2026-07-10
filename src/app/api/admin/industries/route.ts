import { NextResponse } from "next/server";
import { getCanonicalBusinessTypeId, mergeIndustryDefinitions } from "@/lib/businessTypeCatalog";
import { AppError } from "@/lib/errors";
import { getSupabaseAdmin } from "@/lib/supabase";
import { assertPlatformAdmin } from "@/server/auth/guards";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        await assertPlatformAdmin();

        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase
            .from("industry_definitions")
            .select("*")
            .order("order", { ascending: true });

        if (error) {
            throw error;
        }

        return NextResponse.json({
            success: true,
            industries: mergeIndustryDefinitions(data || []),
        });
    } catch (error) {
        return AppError.toResponse(error, "Admin Industries GET");
    }
}

export async function POST(request: Request) {
    try {
        await assertPlatformAdmin();

        const body = await request.json();
        const { label, slug, category, icon, color, description, status, order, modules } = body;
        const supabase = getSupabaseAdmin();
        const duplicate = await findDuplicateIndustry(supabase, {
            label,
            slug,
            modules,
        });

        if (duplicate) {
            return NextResponse.json({
                success: true,
                duplicate: true,
                industry: duplicate,
            });
        }

        const { data, error } = await supabase
            .from("industry_definitions")
            .insert({
                label,
                slug,
                category,
                icon,
                color,
                description,
                status: status || "active",
                order: order || 0,
                modules: modules || [],
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (error) {
            throw error;
        }

        return NextResponse.json({
            success: true,
            industry: data,
        });
    } catch (error) {
        return AppError.toResponse(error, "Admin Industries POST");
    }
}

export async function PUT(request: Request) {
    try {
        await assertPlatformAdmin();

        const body = await request.json();
        const { id, label, slug, category, icon, color, description, status, order, modules } = body;

        if (!id) {
            return NextResponse.json({
                success: false,
                error: "ID is required",
            }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();
        const duplicate = await findDuplicateIndustry(supabase, {
            label,
            slug,
            modules,
            exceptId: id,
        });

        if (duplicate) {
            return NextResponse.json({
                success: false,
                error: "Bu işletme türü zaten sistemde var.",
                duplicate,
            }, { status: 409 });
        }

        const { data, error } = await supabase
            .from("industry_definitions")
            .update({
                label,
                slug,
                category,
                icon,
                color,
                description,
                status,
                order,
                modules,
                updated_at: new Date().toISOString(),
            })
            .eq("id", id)
            .select()
            .single();

        if (error) {
            throw error;
        }

        return NextResponse.json({
            success: true,
            industry: data,
        });
    } catch (error) {
        return AppError.toResponse(error, "Admin Industries PUT");
    }
}

export async function DELETE(request: Request) {
    try {
        await assertPlatformAdmin();

        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({
                success: false,
                error: "ID is required",
            }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();
        const { error } = await supabase
            .from("industry_definitions")
            .delete()
            .eq("id", id);

        if (error) {
            throw error;
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return AppError.toResponse(error, "Admin Industries DELETE");
    }
}

async function findDuplicateIndustry(
    supabase: ReturnType<typeof getSupabaseAdmin>,
    input: {
        exceptId?: string;
        label?: string;
        modules?: unknown;
        slug?: string;
    }
) {
    const canonicalId = getCanonicalBusinessTypeId(
        input.slug,
        input.label,
        Array.isArray(input.modules) && typeof input.modules[0] === "string" ? input.modules[0] : null,
    );

    const { data, error } = await supabase
        .from("industry_definitions")
        .select("id,label,slug,modules");

    if (error) {
        throw error;
    }

    return (data || []).find((definition) => {
        if (input.exceptId && definition.id === input.exceptId) {
            return false;
        }

        return getCanonicalBusinessTypeId(
            definition.id,
            definition.slug,
            definition.label,
            Array.isArray(definition.modules) && typeof definition.modules[0] === "string"
                ? definition.modules[0]
                : null,
        ) === canonicalId;
    }) ?? null;
}
