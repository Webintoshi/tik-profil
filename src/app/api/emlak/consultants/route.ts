// Emlak Consultants API - CRUD Operations
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getSessionSecretBytes } from '@/lib/env';
import { consultantSchema } from '@/types/emlak';

const TABLE = 'em_consultants';

interface ConsultantRow {
    id: string;
    business_id: string;
    name: string;
    slug: string;
    email: string | null;
    phone: string;
    image_url: string;
    bio: string | null;
    instagram_url: string | null;
    linkedin_url: string | null;
    twitter_url: string | null;
    whatsapp_number: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

function mapConsultant(row: ConsultantRow) {
    return {
        id: row.id,
        businessId: row.business_id,
        name: row.name,
        slug: row.slug,
        email: row.email,
        phone: row.phone,
        whatsapp: row.whatsapp_number || row.phone,
        photoUrl: row.image_url,
        bio: row.bio,
        socialLinks: {
            instagram: row.instagram_url,
            linkedin: row.linkedin_url,
            twitter: row.twitter_url,
        },
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

// Get JWT secret
const getJwtSecret = () => getSessionSecretBytes();

// Get business ID from session
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

// GET - List consultants
export async function GET() {
    try {
        const businessId = await getBusinessId();
        if (!businessId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase
            .from(TABLE)
            .select('*')
            .eq('business_id', businessId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const consultants = (data || []).map(mapConsultant);

        return NextResponse.json({ success: true, consultants });
    } catch (error) {
        console.error('[Emlak Consultants] GET error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}

// Generate URL-safe slug from name
function generateSlug(name: string): string {
    return name
        .toLowerCase()
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ş/g, 's')
        .replace(/ı/g, 'i')
        .replace(/ö/g, 'o')
        .replace(/ç/g, 'c')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
}

// Ensure slug is unique within business
async function ensureUniqueSlug(baseSlug: string, businessId: string, existingId?: string): Promise<string> {
    const supabase = getSupabaseAdmin();
    
    let query = supabase
        .from(TABLE)
        .select('slug')
        .eq('business_id', businessId);
    
    if (existingId) {
        query = query.neq('id', existingId);
    }
    
    const { data } = await query;

    let slug = baseSlug;
    let counter = 1;

    while (data?.some(c => c.slug === slug)) {
        slug = `${baseSlug}-${counter}`;
        counter++;
    }

    return slug;
}

// POST - Create new consultant
export async function POST(request: Request) {
    try {
        const businessId = await getBusinessId();
        if (!businessId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();

        const validation = consultantSchema.safeParse(body);
        if (!validation.success) {
            const errors = validation.error.issues.map(e => `${e.path.join('.')}: ${e.message}`);
            return NextResponse.json({
                success: false,
                error: 'Doğrulama hatası',
                details: errors
            }, { status: 400 });
        }

        const data = validation.data;

        const baseSlug = generateSlug(data.name);
        const uniqueSlug = await ensureUniqueSlug(baseSlug, businessId);

        const supabase = getSupabaseAdmin();
        const { data: newConsultant, error: insertError } = await supabase
            .from(TABLE)
            .insert({
                business_id: businessId,
                name: data.name,
                slug: uniqueSlug,
                email: data.email || null,
                phone: data.phone,
                image_url: data.photoUrl || '',
                bio: data.bio || null,
                instagram_url: data.socialLinks?.instagram || null,
                linkedin_url: data.socialLinks?.linkedin || null,
                twitter_url: data.socialLinks?.twitter || null,
                whatsapp_number: data.whatsapp || data.phone,
                is_active: data.isActive !== false,
            })
            .select()
            .single();
        
        if (insertError) throw insertError;

        return NextResponse.json({ success: true, consultantId: newConsultant.id, slug: uniqueSlug });
    } catch (error) {
        console.error('[Emlak Consultants] POST error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}

// PUT - Update consultant
export async function PUT(request: Request) {
    try {
        const businessId = await getBusinessId();
        if (!businessId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { id, newPassword, ...updateData } = body;

        if (!id) {
            return NextResponse.json({ success: false, error: 'ID zorunlu' }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();
        
        const { data: existingData, error: existingError } = await supabase
            .from(TABLE)
            .select('*')
            .eq('id', id)
            .eq('business_id', businessId)
            .single();
        
        if (existingError || !existingData) {
            return NextResponse.json({ success: false, error: 'Danışman bulunamadı' }, { status: 404 });
        }

        const updateObj: Record<string, unknown> = {};
        if (updateData.name !== undefined) {
            updateObj.name = updateData.name;
            const slug = generateSlug(updateData.name);
            updateObj.slug = await ensureUniqueSlug(slug, businessId, id);
        }
        if (updateData.email !== undefined) updateObj.email = updateData.email;
        if (updateData.phone !== undefined) {
            updateObj.phone = updateData.phone;
            updateObj.whatsapp_number = updateData.whatsapp || updateData.phone;
        }
        if (updateData.photoUrl !== undefined) updateObj.image_url = updateData.photoUrl;
        if (updateData.bio !== undefined) updateObj.bio = updateData.bio;
        if (updateData.socialLinks !== undefined) {
            updateObj.instagram_url = updateData.socialLinks.instagram;
            updateObj.linkedin_url = updateData.socialLinks.linkedin;
            updateObj.twitter_url = updateData.socialLinks.twitter;
        }
        if (updateData.isActive !== undefined) updateObj.is_active = updateData.isActive;

        const { error: updateError } = await supabase
            .from(TABLE)
            .update(updateObj)
            .eq('id', id)
            .eq('business_id', businessId);
        
        if (updateError) throw updateError;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Emlak Consultants] PUT error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}

// DELETE - Delete consultant
export async function DELETE(request: Request) {
    try {
        const businessId = await getBusinessId();
        if (!businessId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ success: false, error: 'ID zorunlu' }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();
        
        const { data: existingData, error: existingError } = await supabase
            .from(TABLE)
            .select('id')
            .eq('id', id)
            .eq('business_id', businessId)
            .single();
        
        if (existingError || !existingData) {
            return NextResponse.json({ success: false, error: 'Danışman bulunamadı' }, { status: 404 });
        }

        const { data: consultantListings, error: listingsError } = await supabase
            .from('em_listings')
            .select('id')
            .eq('consultant_id', id);
        
        if (!listingsError && consultantListings) {
            for (const listing of consultantListings) {
                await supabase
                    .from('em_listings')
                    .delete()
                    .eq('id', listing.id);
            }
        }

        const { error: deleteError } = await supabase
            .from(TABLE)
            .delete()
            .eq('id', id)
            .eq('business_id', businessId);
        
        if (deleteError) throw deleteError;

        return NextResponse.json({
            success: true,
            message: `Danışman ve ${consultantListings?.length || 0} ilanı silindi`
        });
    } catch (error) {
        console.error('[Emlak Consultants] DELETE error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}
