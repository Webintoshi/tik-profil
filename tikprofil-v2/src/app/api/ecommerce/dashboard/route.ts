import { NextRequest, NextResponse } from 'next/server';
import { getCollectionREST } from '@/lib/documentStore';
import type { Order, Product, Customer } from '@/types/ecommerce';

const ORDERS_COLLECTION = 'ecommerce_orders';
const PRODUCTS_COLLECTION = 'ecommerce_products';
const CUSTOMERS_COLLECTION = 'ecommerce_customers';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const businessId = searchParams.get('businessId');

        if (!businessId) {
            return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
        }

        const [ordersData, productsData, customersData] = await Promise.all([
            getCollectionREST(ORDERS_COLLECTION),
            getCollectionREST(PRODUCTS_COLLECTION),
            getCollectionREST(CUSTOMERS_COLLECTION),
        ]);

        const allOrders = (ordersData as unknown as Order[]).filter(o => o.businessId === businessId);
        const allProducts = (productsData as unknown as Product[]).filter(p => p.businessId === businessId);
        const allCustomers = (customersData as unknown as Customer[]).filter(c => c.businessId === businessId);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const todayOrders = allOrders.filter(o => {
            const orderDate = new Date(o.createdAt);
            return orderDate >= today && orderDate < tomorrow;
        });

        const todaySales = todayOrders
            .filter(o => o.status !== 'cancelled' && o.status !== 'refunded')
            .reduce((sum, o) => sum + o.total, 0);

        const pendingOrders = allOrders.filter(o => o.status === 'pending').length;

        const lowStockThreshold = 5;
        const lowStockProducts = allProducts.filter(p => {
            const stock = p.stock ?? p.stockQuantity ?? 0;
            return p.status === 'active' && stock <= lowStockThreshold;
        }).length;

        const stats = {
            totalProducts: allProducts.filter(p => p.status === 'active').length,
            totalOrders: allOrders.length,
            totalCustomers: allCustomers.length,
            todaySales,
            pendingOrders,
            lowStockProducts,
        };

        return NextResponse.json({ success: true, stats });
    } catch (error) {
        console.error('[Ecommerce Dashboard GET Error]:', error);
        return NextResponse.json(
            { error: 'Dashboard verileri alınırken hata oluştu' },
            { status: 500 }
        );
    }
}
