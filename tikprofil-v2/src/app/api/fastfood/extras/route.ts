// Fast Food Extras API
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/apiAuth';
import { AppError } from '@/lib/errors';

const GROUPS_TABLE = 'ff_extra_groups';
const EXTRAS_TABLE = 'ff_extras';

interface ExtraGroupRow {
    id: string;
    business_id: string;
    name: string;
    selection_type: string | null;
    is_required: boolean | null;
    max_selections: number | null;
    sort_order: number | null;
    is_active: boolean | null;
}

interface ExtraRow {
    id: string;
    group_id: string;
    name: string;
    price_modifier: number | string | null;
    is_default: boolean | null;
    image_url: string | null;
    sort_order: number | null;
    is_active: boolean | null;
}

function mapGroup(row: ExtraGroupRow) {
    return {
        id: row.id,
        businessId: row.business_id,
        name: row.name,
        selectionType: row.selection_type || 'single',
        isRequired: row.is_required || false,
        maxSelections: row.max_selections ?? 1,
        sortOrder: row.sort_order ?? 0,
        isActive: row.is_active !== false,
    };
}

function mapExtra(row: ExtraRow) {
    return {
        id: row.id,
        groupId: row.group_id,
        name: row.name,
        priceModifier: Number(row.price_modifier || 0),
        isDefault: row.is_default || false,
        imageUrl: row.image_url || '',
        sortOrder: row.sort_order ?? 0,
        isActive: row.is_active !== false,
    };
}

// GET - List extra groups with their extras
export async function GET() {
    try {
        const authResult = await requireAuth();
        if (!authResult.authorized || !authResult.user) {
            return AppError.unauthorized().toResponse();
        }

        const businessId = authResult.user.businessId;

        // Get all groups for this business
        const supabase = getSupabaseAdmin();
        const { data: groupsData, error: groupsError } = await supabase
            .from(GROUPS_TABLE)
            .select('*')
            .eq('business_id', businessId)
            .order('sort_order', { ascending: true });

        if (groupsError) {
            throw groupsError;
        }

        const groups = (groupsData || []).map(mapGroup);
        const groupIds = groups.map(group => group.id);

        let extrasData: ExtraRow[] = [];
        if (groupIds.length > 0) {
            const { data: extras, error: extrasError } = await supabase
                .from(EXTRAS_TABLE)
                .select('*')
                .in('group_id', groupIds)
                .order('sort_order', { ascending: true });

            if (extrasError) {
                throw extrasError;
            }

            extrasData = extras || [];
        }

        const allExtras = extrasData.map(mapExtra);

        // Attach extras to their groups
        const groupsWithExtras = groups.map(group => ({
            ...group,
            extras: allExtras
                .filter(e => e.groupId === group.id)
                .sort((a, b) => ((a.sortOrder as number) || 0) - ((b.sortOrder as number) || 0))
        }));

        return Response.json({ success: true, groups: groupsWithExtras });
    } catch (error) {
        return AppError.toResponse(error, 'FF Extras GET');
    }
}

// POST - Create extra group or extra item
export async function POST(request: Request) {
    try {
        const authResult = await requireAuth();
        if (!authResult.authorized || !authResult.user) {
            return AppError.unauthorized().toResponse();
        }

        const businessId = authResult.user.businessId;
        const body = await request.json();
        const { type } = body;

        if (type === 'group') {
            // Create extra group
            const { name, selectionType, isRequired, maxSelections } = body;
            if (!name) {
                return AppError.badRequest('Name required').toResponse();
            }

            const supabase = getSupabaseAdmin();
            const { data, error } = await supabase
                .from(GROUPS_TABLE)
                .insert({
                    business_id: businessId,
                    name,
                    selection_type: selectionType || 'single',
                    is_required: isRequired || false,
                    max_selections: maxSelections || 1,
                    sort_order: 0,
                    is_active: true,
                })
                .select('id')
                .single();

            if (error) {
                throw error;
            }

            const groupId = data?.id;

            return Response.json({ success: true, groupId });
        } else {
            // Create extra item
            const { groupId, name, priceModifier, isDefault } = body;
            if (!groupId || !name) {
                return AppError.badRequest('GroupId and name required').toResponse();
            }

            // Verify group ownership
            const supabase = getSupabaseAdmin();
            const { data: group, error: groupError } = await supabase
                .from(GROUPS_TABLE)
                .select('id, business_id')
                .eq('id', groupId)
                .eq('business_id', businessId)
                .maybeSingle();

            if (groupError) {
                throw groupError;
            }

            if (!group) {
                return AppError.notFound('Grup').toResponse();
            }

            const { data, error } = await supabase
                .from(EXTRAS_TABLE)
                .insert({
                    group_id: groupId,
                    name,
                    price_modifier: Number(priceModifier) || 0,
                    is_default: isDefault || false,
                    image_url: body.imageUrl || '',
                    sort_order: 0,
                    is_active: true,
                })
                .select('id')
                .single();

            if (error) {
                throw error;
            }

            const extraId = data?.id;

            return Response.json({ success: true, extraId });
        }
    } catch (error) {
        return AppError.toResponse(error, 'FF Extras POST');
    }
}

// PUT - Update extra group or extra item
export async function PUT(request: Request) {
    try {
        const authResult = await requireAuth();
        if (!authResult.authorized || !authResult.user) {
            return AppError.unauthorized().toResponse();
        }

        const businessId = authResult.user.businessId;
        const body = await request.json();
        const { type, id } = body;

        if (!id) {
            return AppError.badRequest('ID required').toResponse();
        }

        if (type === 'group') {
            // Verify ownership
            const supabase = getSupabaseAdmin();
            const { data: group, error: groupError } = await supabase
                .from(GROUPS_TABLE)
                .select('id, business_id')
                .eq('id', id)
                .eq('business_id', businessId)
                .maybeSingle();

            if (groupError) {
                throw groupError;
            }

            if (!group) {
                return AppError.notFound('Grup').toResponse();
            }

            const { name, selectionType, isRequired, maxSelections, isActive } = body;

            // Only include defined fields
            const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
            if (name !== undefined) updateData.name = name;
            if (selectionType !== undefined) updateData.selection_type = selectionType;
            if (isRequired !== undefined) updateData.is_required = isRequired;
            if (maxSelections !== undefined) updateData.max_selections = maxSelections;
            if (isActive !== undefined) updateData.is_active = isActive;

            const { error: updateError } = await supabase
                .from(GROUPS_TABLE)
                .update(updateData)
                .eq('id', id)
                .eq('business_id', businessId);

            if (updateError) {
                throw updateError;
            }
        } else {
            // Verify extra's group ownership
            const supabase = getSupabaseAdmin();
            const { data: extra, error: extraError } = await supabase
                .from(EXTRAS_TABLE)
                .select('id, group_id')
                .eq('id', id)
                .maybeSingle();

            if (extraError) {
                throw extraError;
            }

            if (!extra) {
                return AppError.notFound('Ekstra').toResponse();
            }

            const { data: group, error: groupError } = await supabase
                .from(GROUPS_TABLE)
                .select('id, business_id')
                .eq('id', extra.group_id)
                .eq('business_id', businessId)
                .maybeSingle();

            if (groupError) {
                throw groupError;
            }

            if (!group) {
                return AppError.notFound('Ekstra').toResponse();
            }

            const { name, priceModifier, isDefault, isActive, imageUrl } = body;

            // Only include defined fields
            const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
            if (name !== undefined) updateData.name = name;
            if (priceModifier !== undefined) updateData.price_modifier = Number(priceModifier);
            if (isDefault !== undefined) updateData.is_default = isDefault;
            if (isActive !== undefined) updateData.is_active = isActive;
            if (imageUrl !== undefined) updateData.image_url = imageUrl || '';

            const { error: updateError } = await supabase
                .from(EXTRAS_TABLE)
                .update(updateData)
                .eq('id', id)
                .eq('group_id', extra.group_id);

            if (updateError) {
                throw updateError;
            }
        }

        return Response.json({ success: true });
    } catch (error) {
        return AppError.toResponse(error, 'FF Extras PUT');
    }
}

// DELETE - Delete extra group or extra item
export async function DELETE(request: Request) {
    try {
        const authResult = await requireAuth();
        if (!authResult.authorized || !authResult.user) {
            return AppError.unauthorized().toResponse();
        }

        const businessId = authResult.user.businessId;
        const supabase = getSupabaseAdmin();
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type');
        const id = searchParams.get('id');

        if (!id || !type) {
            return AppError.badRequest('ID and type required').toResponse();
        }

        if (type === 'group') {
            // Verify ownership
            const { data: group, error: groupError } = await supabase
                .from(GROUPS_TABLE)
                .select('id, business_id')
                .eq('id', id)
                .eq('business_id', businessId)
                .maybeSingle();

            if (groupError) {
                throw groupError;
            }

            if (!group) {
                return AppError.notFound('Grup').toResponse();
            }

            // Delete all extras in this group
            const { data: groupExtras, error: extrasError } = await supabase
                .from(EXTRAS_TABLE)
                .select('id')
                .eq('group_id', id);

            if (extrasError) {
                throw extrasError;
            }

            if (groupExtras?.length) {
                const { error: deleteExtrasError } = await supabase
                    .from(EXTRAS_TABLE)
                    .delete()
                    .eq('group_id', id);

                if (deleteExtrasError) {
                    throw deleteExtrasError;
                }
            }

            const { error: deleteGroupError } = await supabase
                .from(GROUPS_TABLE)
                .delete()
                .eq('id', id)
                .eq('business_id', businessId);

            if (deleteGroupError) {
                throw deleteGroupError;
            }
        } else {
            // Verify extra's group ownership
            const { data: extra, error: extraError } = await supabase
                .from(EXTRAS_TABLE)
                .select('id, group_id')
                .eq('id', id)
                .maybeSingle();

            if (extraError) {
                throw extraError;
            }

            if (!extra) {
                return AppError.notFound('Ekstra').toResponse();
            }

            const { data: group, error: groupError } = await supabase
                .from(GROUPS_TABLE)
                .select('id, business_id')
                .eq('id', extra.group_id)
                .eq('business_id', businessId)
                .maybeSingle();

            if (groupError) {
                throw groupError;
            }

            if (!group) {
                return AppError.notFound('Ekstra').toResponse();
            }

            const { error: deleteError } = await supabase
                .from(EXTRAS_TABLE)
                .delete()
                .eq('id', id)
                .eq('group_id', extra.group_id);

            if (deleteError) {
                throw deleteError;
            }
        }

        return Response.json({ success: true });
    } catch (error) {
        return AppError.toResponse(error, 'FF Extras DELETE');
    }
}
