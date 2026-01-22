import { NextRequest, NextResponse } from 'next/server';
import { getCollectionREST } from '@/lib/documentStore';
import type { Order, Product, Customer } from '@/types/ecommerce';

const ORDERS_COLLECTION = 'ecommerce_orders';
const PRODUCTS_COLLECTION = 'ecommerce_products';
const CUSTOMERS_COLLECTION = 'ecommerce_customers';

// GET: Get analytics data
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const businessId = searchParams.get('businessId');
        const period = searchParams.get('period') || '30'; // days

        if (!businessId) {
            return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
        }

        // Fetch all data
        const [ordersData, productsData, customersData] = await Promise.all([
            getCollectionREST(ORDERS_COLLECTION),
            getCollectionREST(PRODUCTS_COLLECTION),
            getCollectionREST(CUSTOMERS_COLLECTION),
        ]);

        const allOrders = (ordersData as unknown as Order[]).filter(o => o.businessId === businessId);
        const allProducts = (productsData as unknown as Product[]).filter(p => p.businessId === businessId);
        const allCustomers = (customersData as unknown as Customer[]).filter(c => c.businessId === businessId);

        // Filter orders by period
        const periodDays = parseInt(period);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - periodDays);

        const periodOrders = allOrders.filter(o => new Date(o.createdAt) >= startDate);

        // Calculate overview stats
        const overview = {
            totalRevenue: periodOrders
                .filter(o => o.status !== 'cancelled' && o.status !== 'refunded')
                .reduce((sum, o) => sum + o.total, 0),
            totalOrders: periodOrders.length,
            avgOrderValue: periodOrders.length > 0
                ? periodOrders.reduce((sum, o) => sum + o.total, 0) / periodOrders.length
                : 0,
            totalCustomers: allCustomers.length,
            newCustomers: allCustomers.filter(c => new Date(c.createdAt) >= startDate).length,
        };

        // Order status distribution
        const statusDistribution = {
            pending: periodOrders.filter(o => o.status === 'pending').length,
            confirmed: periodOrders.filter(o => o.status === 'confirmed').length,
            processing: periodOrders.filter(o => o.status === 'processing').length,
            shipped: periodOrders.filter(o => o.status === 'shipped').length,
            delivered: periodOrders.filter(o => o.status === 'delivered').length,
            cancelled: periodOrders.filter(o => o.status === 'cancelled').length,
        };

        // Daily revenue (last 7 days)
        const dailyRevenue: { date: string; revenue: number; orders: number }[] = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];

            const dayOrders = allOrders.filter(o => {
                const orderDate = new Date(o.createdAt).toISOString().split('T')[0];
                return orderDate === dateStr && o.status !== 'cancelled' && o.status !== 'refunded';
            });

            dailyRevenue.push({
                date: dateStr,
                revenue: dayOrders.reduce((sum, o) => sum + o.total, 0),
                orders: dayOrders.length,
            });
        }

        // Top products (by order count)
        const productSales: Record<string, { name: string; quantity: number; revenue: number }> = {};
        periodOrders.forEach(order => {
            order.items.forEach(item => {
                if (!productSales[item.productId]) {
                    productSales[item.productId] = {
                        name: item.name,
                        quantity: 0,
                        revenue: 0,
                    };
                }
                productSales[item.productId].quantity += item.quantity;
                productSales[item.productId].revenue += item.total;
            });
        });

        const topProducts = Object.entries(productSales)
            .map(([id, data]) => ({ id, ...data }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);

        // Low stock products
        const lowStockProducts = allProducts
            .filter(p => p.status === 'active' && (p.stock ?? p.stockQuantity) <= 5)
            .map(p => ({
                id: p.id,
                name: p.name,
                stock: p.stock ?? p.stockQuantity,
                image: p.images?.[0],
            }))
            .slice(0, 5);

        // Top customers
        const topCustomers = allCustomers
            .sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0))
            .slice(0, 5)
            .map(c => ({
                id: c.id,
                name: c.name,
                totalSpent: c.totalSpent || 0,
                totalOrders: c.totalOrders || 0,
            }));

        return NextResponse.json({
            success: true,
            overview,
            statusDistribution,
            dailyRevenue,
            topProducts,
            lowStockProducts,
            topCustomers,
        });
    } catch (error) {
        console.error('[Ecommerce Analytics GET Error]:', error);
        return NextResponse.json(
            { error: 'Analitik verileri alınırken hata oluştu' },
            { status: 500 }
        );
    }
}
