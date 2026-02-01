// Fast Food Campaigns API
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/apiAuth';
import { AppError } from '@/lib/errors';

const TABLE = 'ff_campaigns';

interface CampaignRow {
    id: string;
    business_id: string;
    title: string;
    description: string | null;
    emoji: string | null;
    is_active: boolean | null;
    valid_until: string | null;
    sort_order: number | null;
}

function mapCampaign(row: CampaignRow) {
    return {
        id: row.id,
        businessId: row.business_id,
        title: row.title,
        description: row.description || '',
        emoji: row.emoji || '🔥',
        isActive: row.is_active !== false,
        validUntil: row.valid_until || null,
        sortOrder: row.sort_order ?? 0,
    };
}

// GET - List campaigns
export async function GET() {
    try {
        const authResult = await requireAuth();
        if (!authResult.authorized || !authResult.user) {
            return AppError.unauthorized().toResponse();
        }

        const businessId = authResult.user.businessId;

        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase
            .from(TABLE)
            .select('*')
            .eq('business_id', businessId)
            .order('sort_order', { ascending: true });

        if (error) {
            throw error;
        }

        const campaigns = (data || []).map(mapCampaign);

        return Response.json({ success: true, campaigns });
    } catch (error) {
        return AppError.toResponse(error, 'FF Campaigns GET');
    }
}

// POST - Create campaign
export async function POST(request: Request) {
    try {
        const authResult = await requireAuth();
        if (!authResult.authorized || !authResult.user) {
            return AppError.unauthorized().toResponse();
        }

        const businessId = authResult.user.businessId;
        const body = await request.json();
        const { title, description, emoji, isActive, validUntil } = body;

        if (!title) {
            return AppError.badRequest('Title required').toResponse();
        }

        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase
            .from(TABLE)
            .insert({
                business_id: businessId,
                title,
                description: description || '',
                emoji: emoji || '🔥',
                is_active: isActive !== false,
                valid_until: validUntil || null,
                sort_order: 0,
            })
            .select('id')
            .single();

        if (error) {
            throw error;
        }

        const campaignId = data?.id;

        return Response.json({ success: true, campaignId });
    } catch (error) {
        return AppError.toResponse(error, 'FF Campaigns POST');
    }
}

// PUT - Update campaign
export async function PUT(request: Request) {
    try {
        const authResult = await requireAuth();
        if (!authResult.authorized || !authResult.user) {
            return AppError.unauthorized().toResponse();
        }

        const businessId = authResult.user.businessId;
        const body = await request.json();
        const { id, title, description, emoji, isActive, validUntil, sortOrder } = body;

        if (!id) {
            return AppError.badRequest('ID required').toResponse();
        }

        // Verify ownership
        const supabase = getSupabaseAdmin();
        const { data: campaign, error: campaignError } = await supabase
            .from(TABLE)
            .select('id')
            .eq('id', id)
            .eq('business_id', businessId)
            .maybeSingle();

        if (campaignError) {
            throw campaignError;
        }

        if (!campaign) {
            return AppError.notFound('Kampanya').toResponse();
        }

        const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (emoji !== undefined) updateData.emoji = emoji;
        if (isActive !== undefined) updateData.is_active = isActive;
        if (validUntil !== undefined) updateData.valid_until = validUntil;
        if (sortOrder !== undefined) updateData.sort_order = sortOrder;

        const { error: updateError } = await supabase
            .from(TABLE)
            .update(updateData)
            .eq('id', id)
            .eq('business_id', businessId);

        if (updateError) {
            throw updateError;
        }

        return Response.json({ success: true });
    } catch (error) {
        return AppError.toResponse(error, 'FF Campaigns PUT');
    }
}

// DELETE - Delete campaign
export async function DELETE(request: Request) {
    try {
        const authResult = await requireAuth();
        if (!authResult.authorized || !authResult.user) {
            return AppError.unauthorized().toResponse();
        }

        const businessId = authResult.user.businessId;
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return AppError.badRequest('ID required').toResponse();
        }

        // Verify ownership
        const supabase = getSupabaseAdmin();
        const { data: campaign, error: campaignError } = await supabase
            .from(TABLE)
            .select('id')
            .eq('id', id)
            .eq('business_id', businessId)
            .maybeSingle();

        if (campaignError) {
            throw campaignError;
        }

        if (!campaign) {
            return AppError.notFound('Kampanya').toResponse();
        }

        const { error: deleteError } = await supabase
            .from(TABLE)
            .delete()
            .eq('id', id)
            .eq('business_id', businessId);

        if (deleteError) {
            throw deleteError;
        }

        return Response.json({ success: true });
    } catch (error) {
        return AppError.toResponse(error, 'FF Campaigns DELETE');
    }
}
