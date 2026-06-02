import { NextRequest, NextResponse } from "next/server";
import { getCollectionREST } from "@/lib/documentStore";
import { AppError } from "@/lib/errors";
import type { Customer, Order, Product } from "@/types/ecommerce";
import { assertBusinessMember } from "@/server/auth/guards";

const ORDERS_COLLECTION = "ecommerce_orders";
const PRODUCTS_COLLECTION = "ecommerce_products";
const CUSTOMERS_COLLECTION = "ecommerce_customers";

export async function GET(request: NextRequest) {
    try {
        const { businessId } = await assertBusinessMember();
        const period = request.nextUrl.searchParams.get("period") || "30";

        const [ordersData, productsData, customersData] = await Promise.all([
            getCollectionREST(ORDERS_COLLECTION),
            getCollectionREST(PRODUCTS_COLLECTION),
            getCollectionREST(CUSTOMERS_COLLECTION),
        ]);

        const allOrders = (ordersData as unknown as Order[]).filter((order) => order.businessId === businessId);
        const allProducts = (productsData as unknown as Product[]).filter((product) => product.businessId === businessId);
        const allCustomers = (customersData as unknown as Customer[]).filter((customer) => customer.businessId === businessId);

        const periodDays = parseInt(period, 10);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - periodDays);

        const periodOrders = allOrders.filter((order) => new Date(order.createdAt) >= startDate);
        const overview = {
            totalRevenue: periodOrders
                .filter((order) => order.status !== "cancelled" && order.status !== "refunded")
                .reduce((sum, order) => sum + order.total, 0),
            totalOrders: periodOrders.length,
            avgOrderValue: periodOrders.length > 0
                ? periodOrders.reduce((sum, order) => sum + order.total, 0) / periodOrders.length
                : 0,
            totalCustomers: allCustomers.length,
            newCustomers: allCustomers.filter((customer) => customer.createdAt && new Date(customer.createdAt) >= startDate).length,
        };

        const statusDistribution = {
            pending: periodOrders.filter((order) => order.status === "pending").length,
            confirmed: periodOrders.filter((order) => order.status === "confirmed").length,
            processing: periodOrders.filter((order) => order.status === "processing").length,
            shipped: periodOrders.filter((order) => order.status === "shipped").length,
            delivered: periodOrders.filter((order) => order.status === "delivered").length,
            cancelled: periodOrders.filter((order) => order.status === "cancelled").length,
        };

        const dailyRevenue: { date: string; revenue: number; orders: number }[] = [];
        for (let i = 6; i >= 0; i -= 1) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split("T")[0];

            const dayOrders = allOrders.filter((order) => {
                const orderDate = new Date(order.createdAt).toISOString().split("T")[0];
                return orderDate === dateStr && order.status !== "cancelled" && order.status !== "refunded";
            });

            dailyRevenue.push({
                date: dateStr,
                revenue: dayOrders.reduce((sum, order) => sum + order.total, 0),
                orders: dayOrders.length,
            });
        }

        const productSales: Record<string, { name: string; quantity: number; revenue: number }> = {};
        periodOrders.forEach((order) => {
            order.items.forEach((item) => {
                if (!productSales[item.productId]) {
                    productSales[item.productId] = {
                        name: item.name,
                        quantity: 0,
                        revenue: 0,
                    };
                }

                productSales[item.productId].quantity += item.quantity || 0;
                productSales[item.productId].revenue += item.total || 0;
            });
        });

        const topProducts = Object.entries(productSales)
            .map(([id, data]) => ({ id, ...data }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);

        const lowStockProducts = allProducts
            .filter((product) => product.status === "active" && ((product.stock ?? product.stockQuantity ?? 0) <= 5))
            .map((product) => ({
                id: product.id,
                name: product.name,
                stock: product.stock ?? product.stockQuantity ?? 0,
                image: product.images?.[0],
            }))
            .slice(0, 5);

        const topCustomers = allCustomers
            .sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0))
            .slice(0, 5)
            .map((customer) => ({
                id: customer.id,
                name: customer.name,
                totalSpent: customer.totalSpent || 0,
                totalOrders: customer.totalOrders || 0,
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
        return AppError.toResponse(error, "Ecommerce Analytics GET");
    }
}
