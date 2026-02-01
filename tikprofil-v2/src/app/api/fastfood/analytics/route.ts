// Fast Food Analytics API
import { getSupabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/apiAuth';
import { AppError } from '@/lib/errors';

const TABLE = 'ff_orders';

interface OrderItem {
    productName: string;
    quantity: number;
    totalPrice: number;
}

interface Order {
    id: string;
    businessId: string;
    status: string;
    total: number;
    items: OrderItem[];
    createdAt: Date;
}

export async function GET(request: Request) {
    try {
        const authResult = await requireAuth();
        if (!authResult.authorized || !authResult.user) {
            return AppError.unauthorized().toResponse();
        }

        const businessId = authResult.user.businessId;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { searchParams } = new URL(request.url);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const range = searchParams.get('range') || 'week';

        // Get all orders for this business
        const supabase = getSupabaseAdmin();
        const { data, error } = await supabase
            .from(TABLE)
            .select('id, business_id, status, total, items, created_at')
            .eq('business_id', businessId);

        if (error) {
            throw error;
        }

        const businessOrders = data || [];

        // Parse dates with proper typing
        const ordersWithDates: Order[] = businessOrders.map(order => ({
            id: order.id as string,
            businessId: order.business_id as string,
            status: (order.status as string) || 'pending',
            total: Number(order.total) || 0,
            items: (order.items as OrderItem[]) || [],
            createdAt: new Date(order.created_at as string)
        }));

        // Calculate date ranges
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // Filter completed orders
        const completedOrders = ordersWithDates.filter(o =>
            o.status === 'delivered' || o.status === 'completed'
        );

        // Calculate statistics
        const totalOrders = completedOrders.length;
        const totalRevenue = completedOrders.reduce((sum, o) => sum + o.total, 0);
        const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

        // Today's stats
        const todayOrders = completedOrders.filter(o => o.createdAt >= todayStart);
        const todayOrderCount = todayOrders.length;
        const todayRevenue = todayOrders.reduce((sum, o) => sum + o.total, 0);

        // Weekly stats
        const weeklyOrders = completedOrders.filter(o => o.createdAt >= weekAgo);
        const weeklyOrderCount = weeklyOrders.length;
        const weeklyRevenue = weeklyOrders.reduce((sum, o) => sum + o.total, 0);

        // Monthly stats
        const monthlyOrders = completedOrders.filter(o => o.createdAt >= monthAgo);
        const monthlyOrderCount = monthlyOrders.length;
        const monthlyRevenue = monthlyOrders.reduce((sum, o) => sum + o.total, 0);

        // Calculate popular products
        const productStats = new Map<string, { count: number; revenue: number }>();

        completedOrders.forEach(order => {
            order.items.forEach(item => {
                const existing = productStats.get(item.productName) || { count: 0, revenue: 0 };
                productStats.set(item.productName, {
                    count: existing.count + item.quantity,
                    revenue: existing.revenue + item.totalPrice
                });
            });
        });

        const popularProducts = Array.from(productStats.entries())
            .map(([name, stats]) => ({ name, ...stats }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        // Calculate trend (compare this week vs last week)
        const lastWeekStart = new Date(weekAgo.getTime() - 7 * 24 * 60 * 60 * 1000);
        const lastWeekOrders = completedOrders.filter(o =>
            o.createdAt >= lastWeekStart && o.createdAt < weekAgo
        );
        const lastWeekRevenue = lastWeekOrders.reduce((sum, o) => sum + o.total, 0);

        let recentTrend: 'up' | 'down' | 'stable' = 'stable';
        let trendPercentage = 0;

        if (lastWeekRevenue > 0) {
            trendPercentage = ((weeklyRevenue - lastWeekRevenue) / lastWeekRevenue) * 100;
            recentTrend = trendPercentage > 5 ? 'up' : trendPercentage < -5 ? 'down' : 'stable';
        } else if (weeklyRevenue > 0) {
            recentTrend = 'up';
            trendPercentage = 100;
        }

        return Response.json({
            success: true,
            analytics: {
                totalOrders,
                totalRevenue,
                averageOrderValue,
                todayOrders: todayOrderCount,
                todayRevenue,
                weeklyOrders: weeklyOrderCount,
                weeklyRevenue,
                monthlyOrders: monthlyOrderCount,
                monthlyRevenue,
                popularProducts,
                recentTrend,
                trendPercentage: Math.abs(Math.round(trendPercentage * 10) / 10)
            }
        });

    } catch (error) {
        return AppError.toResponse(error, 'FF Analytics GET');
    }
}
