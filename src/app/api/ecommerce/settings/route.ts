import { NextRequest, NextResponse } from 'next/server';
import { getDocumentREST, createDocumentREST, updateDocumentREST } from '@/lib/documentStore';
import { settingsSchema } from '@/types/ecommerce';
import type { EcommerceSettings } from '@/types/ecommerce';

const COLLECTION = 'ecommerce_settings';

// Default settings factory
function getDefaultSettings(businessId: string): EcommerceSettings {
    return {
        id: businessId,
        storeName: 'Mağazam',
        storeDescription: '',
        currency: 'TRY',
        minOrderAmount: 0,
        freeShippingThreshold: undefined,
        taxRate: 0,
        shippingOptions: [
            {
                id: 'standard',
                name: 'Standart Kargo',
                price: 50,
                estimatedDays: '2-4 iş günü',
                isActive: true,
            },
        ],
        paymentMethods: {
            cash: true,
            card: false,
            transfer: false,
            online: false,
        },
        orderNotifications: {
            email: false,
            whatsapp: true,
        },
        stockSettings: {
            trackStock: true,
            allowBackorder: false,
            lowStockThreshold: 5,
        },
        checkoutSettings: {
            requirePhone: true,
            requireEmail: false,
            requireAddress: true,
            allowNotes: true,
        },
    };
}

// GET: Fetch settings
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const businessId = searchParams.get('businessId');

        if (!businessId) {
            return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
        }

        // Try to get existing settings
        const settings = await getDocumentREST(COLLECTION, businessId);

        if (!settings) {
            // Return default settings if none exist
            const defaults = getDefaultSettings(businessId);
            return NextResponse.json(defaults);
        }

        return NextResponse.json({
            id: businessId,
            storeName: settings.storeName || 'Mağazam',
            storeDescription: settings.storeDescription || '',
            currency: settings.currency || 'TRY',
            minOrderAmount: settings.minOrderAmount || 0,
            freeShippingThreshold: settings.freeShippingThreshold || undefined,
            taxRate: settings.taxRate || 0,
            shippingOptions: settings.shippingOptions || [],
            paymentMethods: settings.paymentMethods || {
                cash: true,
                card: false,
                transfer: false,
                online: false,
            },
            orderNotifications: settings.orderNotifications || {
                email: false,
                whatsapp: true,
            },
            stockSettings: settings.stockSettings || {
                trackStock: true,
                allowBackorder: false,
                lowStockThreshold: 5,
            },
            checkoutSettings: settings.checkoutSettings || {
                requirePhone: true,
                requireEmail: false,
                requireAddress: true,
                allowNotes: true,
            },
        });
    } catch (error) {
        console.error('[Ecommerce Settings GET Error]:', error);
        return NextResponse.json(
            { error: 'Ayarlar alınırken hata oluştu' },
            { status: 500 }
        );
    }
}

// POST: Create or Update settings
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { businessId, ...settingsData } = body;

        if (!businessId) {
            return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
        }

        // Validate with Zod
        const validationResult = settingsSchema.safeParse(settingsData);
        if (!validationResult.success) {
            return NextResponse.json(
                { error: 'Geçersiz veri', details: validationResult.error.flatten() },
                { status: 400 }
            );
        }

        const validData = validationResult.data;

        // Check if settings already exist
        const existingSettings = await getDocumentREST(COLLECTION, businessId);

        const dataToSave = {
            ...validData,
            businessId,
            updatedAt: new Date().toISOString(),
        };

        if (existingSettings) {
            // Update existing
            await updateDocumentREST(COLLECTION, businessId, dataToSave);
        } else {
            // Create new with specific ID
            await createDocumentREST(COLLECTION, {
                ...dataToSave,
                createdAt: new Date().toISOString(),
            }, businessId);
        }

        return NextResponse.json({
            success: true,
            message: 'Ayarlar güncellendi',
        });
    } catch (error) {
        console.error('[Ecommerce Settings POST Error]:', error);
        return NextResponse.json(
            { error: 'Ayarlar güncellenirken hata oluştu' },
            { status: 500 }
        );
    }
}
