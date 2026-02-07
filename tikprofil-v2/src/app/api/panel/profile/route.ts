import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getSessionSecretBytes } from '@/lib/env';

const getJwtSecret = () => getSessionSecretBytes();

// Get businessId from owner session cookie
async function getBusinessId(): Promise<string | null> {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("tikprofil_owner_session")?.value;
        if (!token) return null;

        const { payload } = await jwtVerify(token, getJwtSecret());
        return payload.businessId as string || null;
    } catch {
        return null;
    }
}

// Update business profile
export async function PUT(request: Request) {
    try {
        const businessId = await getBusinessId();
        if (!businessId) {
            return NextResponse.json(
                { success: false, error: 'Oturum bulunamadı' },
                { status: 401 }
            );
        }

        const body = await request.json();

        // Validation
        if (!body.name?.trim()) {
            return NextResponse.json(
                { success: false, error: 'İşletme adı gerekli' },
                { status: 400 }
            );
        }

        if (body.slogan && body.slogan.length > 60) {
            return NextResponse.json(
                { success: false, error: 'Slogan en fazla 60 karakter olabilir' },
                { status: 400 }
            );
        }

        const supabase = getSupabaseAdmin();

        // Fetch existing data to merge (include logo and cover columns)
        const { data: existing, error: fetchError } = await supabase
            .from('businesses')
            .select('data, logo, cover')
            .eq('id', businessId)
            .single();

        if (fetchError) {
            console.error('Fetch error:', fetchError);
            return NextResponse.json(
                { success: false, error: 'İşletme bulunamadı' },
                { status: 404 }
            );
        }

        // Build data fields
        const existingData = (existing?.data as Record<string, unknown>) || {};
        const mergedData = {
            ...existingData,
            name: body.name,
            slogan: body.slogan || null,
            about: body.about || null,
            phone: body.phone || null,
            address: body.address || null,
            mapsUrl: body.mapsUrl || null,
            socialLinks: body.socialLinks || existingData.socialLinks || {},
            showHours: body.showHours ?? existingData.showHours ?? true,
            workingHours: body.workingHours || existingData.workingHours || [],
            logo: existing?.logo || existingData.logo || null,
            cover: existing?.cover || existingData.cover || null,
            updatedAt: new Date().toISOString(),
        };

        // Build update data (preserve logo and cover)
        const updateData: Record<string, unknown> = {
            name: body.name,
            slogan: body.slogan || null,
            about: body.about || null,
            phone: body.phone || null,
            logo: existing?.logo || existingData.logo || null,
            cover: existing?.cover || existingData.cover || null,
            data: mergedData,
            updated_at: new Date().toISOString(),
        };

        // Update the business record
        const { error: updateError } = await supabase
            .from('businesses')
            .update(updateData)
            .eq('id', businessId);

        if (updateError) {
            console.error('Update error:', updateError);
            return NextResponse.json(
                { success: false, error: 'Güncelleme hatası: ' + updateError.message },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Profil başarıyla güncellendi'
        });

    } catch (error) {
        console.error('Profile update error:', error);
        return NextResponse.json(
            { success: false, error: 'Sunucu hatası' },
            { status: 500 }
        );
    }
}

// Get business profile
export async function GET() {
    try {
        const businessId = await getBusinessId();
        if (!businessId) {
            return NextResponse.json(
                { success: false, error: 'Oturum bulunamadı' },
                { status: 401 }
            );
        }

        const supabase = getSupabaseAdmin();

        const { data: business, error } = await supabase
            .from('businesses')
            .select('*')
            .eq('id', businessId)
            .single();

        if (error) {
            console.error('Fetch error:', error);
            return NextResponse.json(
                { success: false, error: 'İşletme bulunamadı' },
                { status: 404 }
            );
        }

        // Extract data from both columns and data field
        const businessData = (business.data as Record<string, unknown>) || {};

        const profile = {
            id: business.id,
            name: business.name || '',
            slogan: business.slogan || businessData.slogan || '',
            about: business.about || businessData.about || '',
            logo: business.logo || '',
            cover: business.cover || '',
            phone: business.phone || businessData.phone || '',
            address: businessData.address || '',
            mapsUrl: businessData.mapsUrl || '',
            socialLinks: businessData.socialLinks || {},
            showHours: businessData.showHours ?? true,
            workingHours: businessData.workingHours || [],
        };

        return NextResponse.json({
            success: true,
            profile
        });

    } catch (error) {
        console.error('Profile fetch error:', error);
        return NextResponse.json(
            { success: false, error: 'Sunucu hatası' },
            { status: 500 }
        );
    }
}
