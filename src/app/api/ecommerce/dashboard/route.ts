import { NextResponse } from "next/server";
import { getCollectionREST } from "@/lib/documentStore";
import { AppError } from "@/lib/errors";
import type { Customer, Order, Product } from "@/types/ecommerce";
import { assertBusinessMember } from "@/server/auth/guards";

const ORDERS_COLLECTION = "ecommerce_orders";
const PRODUCTS_COLLECTION = "ecommerce_products";
const CUSTOMERS_COLLECTION = "ecommerce_customers";

export async function GET() {
    try {
        const { businessId } = await assertBusinessMember();
        const [ordersData, productsData, customersData] = await Promise.all([
            getCollectionREST(ORDERS_COLLECTION),
            getCollectionREST(PRODUCTS_COLLECTION),
            getCollectionREST(CUSTOMERS_COLLECTION),
        ]);

        const allOrders = (ordersData as unknown as Order[]).filter((order) => order.businessId === businessId);
        const allProducts = (productsData as unknown as Product[]).filter((product) => product.businessId === businessId);
        const allCustomers = (customersData as unknown as Customer[]).filter((customer) => customer.businessId === businessId);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const todayOrders = allOrders.filter((order) => {
            const orderDate = new Date(order.createdAt);
            return orderDate >= today && orderDate < tomorrow;
        });

        const todaySales = todayOrders
            .filter((order) => order.status !== "cancelled" && order.status !== "refunded")
            .reduce((sum, order) => sum + order.total, 0);

        const pendingOrders = allOrders.filter((order) => order.status === "pending").length;
        const lowStockProducts = allProducts.filter((product) => {
            const stock = product.stock ?? product.stockQuantity ?? 0;
            return product.status === "active" && stock <= 5;
        }).length;

        return NextResponse.json({
            success: true,
            stats: {
                totalProducts: allProducts.filter((product) => product.status === "active").length,
                totalOrders: allOrders.length,
                totalCustomers: allCustomers.length,
                todaySales,
                pendingOrders,
                lowStockProducts,
            },
        });
    } catch (error) {
        return AppError.toResponse(error, "Ecommerce Dashboard GET");
    }
}
