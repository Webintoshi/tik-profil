// Database Cleanup API - Remove orphaned data from deleted businesses
// This is a maintenance endpoint that should be run periodically by admins
import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import {
    getCollectionREST,
    deleteDocumentREST,
} from '@/lib/documentStore';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getSessionSecretBytes } from '@/lib/env';
import { AppError } from '@/lib/errors';

// Force dynamic
export const dynamic = 'force-dynamic';

// FastFood collections that need cleanup
const FF_COLLECTIONS = [
    'ff_products',
    'ff_categories',
    'ff_extra_groups',
    'ff_extras',
    'ff_orders',
    'ff_campaigns',
    'ff_settings',
];

const fetchFastfoodCollection = async (collection: string) => {
    const supabase = getSupabaseAdmin();

    if (collection === 'ff_extras') {
        const { data: groups, error: groupsError } = await supabase
            .from('ff_extra_groups')
            .select('id, business_id');
        if (groupsError) throw groupsError;
        const groupBusinessMap = new Map(
            (groups || []).map(group => [group.id as string, group.business_id as string])
        );

        const { data: extras, error: extrasError } = await supabase
            .from('ff_extras')
            .select('id, group_id');
        if (extrasError) throw extrasError;

        return (extras || []).map(extra => ({
            id: extra.id as string,
            business_id: groupBusinessMap.get(extra.group_id as string),
        }));
    }

    if (collection === 'ff_settings') {
        const { data, error } = await supabase
            .from('ff_settings')
            .select('business_id');
        if (error) throw error;
        return (data || []).map(row => ({
            id: row.business_id as string,
            business_id: row.business_id as string,
        }));
    }

    const { data, error } = await supabase
        .from(collection)
        .select('id, business_id');
    if (error) throw error;
    return (data || []).map(row => ({
        id: row.id as string,
        business_id: row.business_id as string,
    }));
};

// Get JWT secret
const getJwtSecret = () => getSessionSecretBytes();

// Check admin session
async function isAdmin(): Promise<boolean> {
    try {
        const cookieStore = await cookies();
        const adminToken = cookieStore.get("tikprofil_session")?.value;
        if (!adminToken) return false;

        await jwtVerify(adminToken, getJwtSecret());
        return true;
    } catch {
        return false;
    }
}

// GET - Show orphaned data statistics (dry run)
export async function GET() {
    try {
        if (!await isAdmin()) {
            return AppError.unauthorized().toResponse();
        }

        // Get all valid business IDs
        const businesses = await getCollectionREST('businesses');
        const validBusinessIds = new Set(businesses.map(b => b.id));
        const orphanedData: Record<string, { count: number; businessIds: string[] }> = {};
        let totalOrphaned = 0;

        // Check each FastFood collection for orphaned data
        for (const collection of FF_COLLECTIONS) {
            try {
                const docs = await fetchFastfoodCollection(collection);
                const orphanedDocs = docs.filter(d => d.business_id && !validBusinessIds.has(d.business_id));

                if (orphanedDocs.length > 0) {
                    const orphanedBusinessIds = [...new Set(orphanedDocs.map(d => d.business_id as string))];
                    orphanedData[collection] = {
                        count: orphanedDocs.length,
                        businessIds: orphanedBusinessIds,
                    };
                    totalOrphaned += orphanedDocs.length;
                }
            } catch (error) {
                console.error(`Error checking ${collection}:`, error);
            }
        }

        return Response.json({
            success: true,
            dryRun: true,
            message: 'Bu sonuçlar önizlemedir. Silmek için POST isteği gönderin.',
            validBusinesses: validBusinessIds.size,
            totalOrphanedDocuments: totalOrphaned,
            orphanedByCollection: orphanedData,
        });

    } catch (error) {
        console.error('[DB Cleanup] Error:', error);
        return AppError.toResponse(error, 'DB Cleanup GET');
    }
}

// POST - Actually delete orphaned data
export async function POST() {
    try {
        if (!await isAdmin()) {
            return AppError.unauthorized().toResponse();
        }

        // Get all valid business IDs
        const businesses = await getCollectionREST('businesses');
        const validBusinessIds = new Set(businesses.map(b => b.id));
        const deletedData: Record<string, { deleted: number; businessIds: string[] }> = {};
        let totalDeleted = 0;

        // Clean each FastFood collection
        for (const collection of FF_COLLECTIONS) {
            try {
                const docs = await fetchFastfoodCollection(collection);
                const orphanedDocs = docs.filter(d => d.business_id && !validBusinessIds.has(d.business_id));

                if (orphanedDocs.length > 0) {
                    const orphanedBusinessIds = [...new Set(orphanedDocs.map(d => d.business_id as string))];

                    // Delete each orphaned document
                    for (const doc of orphanedDocs) {
                        if (collection === 'ff_settings') {
                            const { error } = await getSupabaseAdmin()
                                .from(collection)
                                .delete()
                                .eq('business_id', doc.id);
                            if (error) throw error;
                        } else {
                            const { error } = await getSupabaseAdmin()
                                .from(collection)
                                .delete()
                                .eq('id', doc.id);
                            if (error) throw error;
                        }
                    }

                    deletedData[collection] = {
                        deleted: orphanedDocs.length,
                        businessIds: orphanedBusinessIds,
                    };
                    totalDeleted += orphanedDocs.length;
                }
            } catch (error) {
                console.error(`Error cleaning ${collection}:`, error);
            }
        }
        return Response.json({
            success: true,
            message: 'Yetim veriler temizlendi',
            totalDeletedDocuments: totalDeleted,
            deletedByCollection: deletedData,
        });

    } catch (error) {
        console.error('[DB Cleanup] Error:', error);
        return AppError.toResponse(error, 'DB Cleanup POST');
    }
}
