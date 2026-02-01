// Admin Modules API - Handles active module management
import { NextResponse } from 'next/server';
import { getCollectionREST, createDocumentREST, deleteDocumentREST, getDocumentREST } from '@/lib/documentStore';
import { getSession } from '@/lib/auth';

// GET - List active modules
export async function GET() {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const allModules = await getCollectionREST('active_modules');
        const moduleIds = allModules
            .filter(m => m.is_active !== false)
            .map(m => m.module_id as string)
            .filter(Boolean);

        return NextResponse.json({
            success: true,
            modules: moduleIds,
        });
    } catch (error) {
        console.error('[Admin/Modules] GET error:', error);
        return NextResponse.json({
            success: true,
            modules: [], // Return empty on error
        });
    }
}

// POST - Activate or deactivate a module
export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { moduleId, action, label, description, category } = body;

        if (!moduleId || !action) {
            return NextResponse.json(
                { success: false, error: 'moduleId and action required' },
                { status: 400 }
            );
        }

        if (action === 'activate') {
            // Check if already exists
            try {
                const existing = await getDocumentREST('active_modules', moduleId);
                if (existing) {
                    // Already exists, just return success
                    return NextResponse.json({ success: true });
                }
            } catch {
                // Doesn't exist, continue to create
            }

            // Create new active module document with specific ID
            await createDocumentREST('active_modules', {
                module_id: moduleId,
                label: label || moduleId,
                description: description || '',
                category: category || 'hizmet',
                is_active: true,
                activated_at: new Date().toISOString(),
            }, moduleId);

            return NextResponse.json({ success: true });
        } else if (action === 'deactivate') {
            // Delete the module document
            try {
                await deleteDocumentREST('active_modules', moduleId);
            } catch {
                // Ignore if doesn't exist
            }

            return NextResponse.json({ success: true });
        }

        return NextResponse.json(
            { success: false, error: 'Invalid action' },
            { status: 400 }
        );
    } catch (error) {
        console.error('[Admin/Modules] POST error:', error);
        return NextResponse.json(
            { success: false, error: 'Server error' },
            { status: 500 }
        );
    }
}
