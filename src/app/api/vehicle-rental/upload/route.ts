import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { getSupabaseAdmin } from '@/lib/supabase';
import { uploadToR2, deleteFromR2 } from '@/lib/r2Storage';
import { getSessionSecretBytes } from '@/lib/env';

async function getBusinessId(): Promise<string | null> {
    try {
        const cookieStore = await cookies();
        
        // Try owner session first
        const ownerToken = cookieStore.get("tikprofil_owner_session")?.value;
        if (ownerToken) {
            const { payload } = await jwtVerify(ownerToken, getSessionSecretBytes());
            return payload.businessId as string || null;
        }
        
        // Try staff session
        const staffToken = cookieStore.get("tikprofil_staff_session")?.value;
        if (staffToken) {
            const { payload } = await jwtVerify(staffToken, getSessionSecretBytes());
            return payload.businessId as string || null;
        }
        
        return null;
    } catch (error) {
        console.error('[Vehicle Upload] Auth error:', error);
        return null;
    }
}

export async function POST(request: Request) {
    try {
        const businessId = await getBusinessId();
        if (!businessId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get('file') as File;
        const vehicleId = formData.get('vehicleId') as string;
        const isPrimary = formData.get('isPrimary') === 'true';

        if (!file || !vehicleId) {
            return NextResponse.json({ success: false, error: 'File and vehicleId required' }, { status: 400 });
        }

        // Upload to R2
        const bytes = new Uint8Array(await file.arrayBuffer());
        const fileName = `vehicle_${Date.now()}_${file.name}`;
        const url = await uploadToR2(
            new Blob([bytes], { type: file.type }),
            fileName,
            'vehicle-rental',
            businessId
        );

        // Save to database
        const supabase = getSupabaseAdmin();
        
        // If this is primary, unset other primaries
        if (isPrimary) {
            await supabase
                .from('vehicle_images')
                .update({ is_primary: false })
                .eq('vehicle_id', vehicleId);
        }

        const { data: image, error } = await supabase
            .from('vehicle_images')
            .insert({
                vehicle_id: vehicleId,
                url: url,
                r2_key: `vehicle-rental/${businessId}/${fileName}`,
                is_primary: isPrimary,
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, image });
    } catch (error) {
        console.error('[Vehicle Rental Upload] error:', error);
        return NextResponse.json({ success: false, error: 'Upload failed' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const businessId = await getBusinessId();
        if (!businessId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const imageId = searchParams.get('id');

        if (!imageId) {
            return NextResponse.json({ success: false, error: 'Image ID required' }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();

        // Get image info first
        const { data: image } = await supabase
            .from('vehicle_images')
            .select('r2_key')
            .eq('id', imageId)
            .single();

        if (image?.r2_key) {
            await deleteFromR2(image.r2_key);
        }

        // Delete from database
        const { error } = await supabase
            .from('vehicle_images')
            .delete()
            .eq('id', imageId);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Vehicle Rental Upload] DELETE error:', error);
        return NextResponse.json({ success: false, error: 'Delete failed' }, { status: 500 });
    }
}
