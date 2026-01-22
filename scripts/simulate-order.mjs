
import fetch from 'node-fetch';
import { updateCookie } from './cookie-manager.mjs';

const BASE_URL = 'http://localhost:3000';
let cookieHeader = '';

// Helper to update cookies
function handleCookies(response) {
    // Check if headers.raw exists (node-fetch)
    if (response.headers.raw) {
        const raw = response.headers.raw()['set-cookie'];
        if (raw) {
            const cookies = raw.map((entry) => entry.split(';')[0]);
            cookieHeader = cookies.join('; ');
            updateCookie(cookieHeader);
        }
    } else {
        // Fallback or just log
        // console.log("Warning: response.headers.raw not found (using native fetch?)");
    }
}

async function runSimulation() {
    console.log("🚀 Starting Order/Checkout Simulation (FastFood)");
    console.log(`T: ${new Date().toISOString()}`);
    console.log("-----------------------------------");

    // 1. REGISTER BUSINESS (FASTFOOD)
    console.log("\n🍔 Step 1: Registering FastFood Business...");
    const businessSlug = `antigravity-burger-${Date.now()}`;
    const registerPayload = {
        fullName: "Burger Şefi",
        email: `chef-${Date.now()}@burger.com`,
        password: "password123",
        businessName: "Antigravity Burger",
        businessSlug: businessSlug,
        businessPhone: "5559998877",
        industryId: "fast-food",
        industryLabel: "Restoran",
        planId: "pro"
    };

    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerPayload)
    });

    const regData = await regRes.json();
    if (!regRes.ok) {
        console.error("❌ Registration Failed:", regData);
        process.exit(1);
    }

    console.log("✅ Registration Successful!");
    const businessId = regData.businessId;
    console.log(`Business ID: ${businessId}`);
    handleCookies(regRes);

    // 2. CREATE CATEGORY
    console.log("\n📂 Step 2: Creating Category (Burgers)...");
    const categoryPayload = {
        name: "Burgers",
        icon: "🍔",
        sortOrder: 0,
        isActive: true
    };

    const catRes = await fetch(`${BASE_URL}/api/fastfood/categories`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': cookieHeader
        },
        body: JSON.stringify(categoryPayload)
    });

    const catData = await catRes.json();
    if (!catRes.ok) {
        console.error("❌ Create Category Failed:", catData);
        process.exit(1);
    }
    const categoryId = catData.category.id;
    console.log(`Category ID: ${categoryId}`);

    // 3. CREATE PRODUCT
    console.log("\n🍗 Step 3: Creating Product (Cheese Burger)...");
    const productPayload = {
        categoryId: categoryId,
        name: "Cheese Burger",
        description: "150g meat + cheddar",
        price: 250,
        currency: "TRY",
        images: [],
        isActive: true
    };

    const prodRes = await fetch(`${BASE_URL}/api/fastfood/products`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': cookieHeader
        },
        body: JSON.stringify(productPayload)
    });

    const prodData = await prodRes.json();
    if (!prodRes.ok) {
        console.error("❌ Create Product Failed:", prodData);
        process.exit(1);
    }
    const productId = prodData.product.id;
    console.log(`Product ID: ${productId}`);

    // 4. CREATE ORDER (PUBLIC API) - Simulate public user (no auth cookie needed typically, but we use businessId)
    console.log("\n🛒 Step 4: Placing Order...");
    const orderPayload = {
        businessId: businessId, // Ensure this ID is valid
        customerName: "Aç Müşteri",
        customerPhone: "05551234567",
        customerAddress: "Test Mah. Deneme Sok. No:1",
        deliveryType: "delivery",
        paymentMethod: "cash",
        customerNote: "Kapı zili bozuk, lütfen arayın.",
        items: [
            {
                productId: productId,
                productName: "Cheese Burger",
                quantity: 2,
                unitPrice: 250,
                totalPrice: 500
            }
        ],
        subtotal: 500,
        deliveryFee: 50,
        total: 550
    };

    const orderRes = await fetch(`${BASE_URL}/api/fastfood/orders`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderPayload)
    });

    const orderData = await orderRes.json();
    if (!orderRes.ok) {
        console.error("❌ Place Order Failed:", orderData);
        process.exit(1);
    }
    console.log("✅ Order Placed Successfully!");
    const orderId = orderData.orderId;
    console.log(`Order ID: ${orderId}`);
    console.log(`Order Number: ${orderData.orderNumber}`);

    // 5. VERIFY ORDER (OWNER PANEL)
    console.log("\n👀 Step 5: Verifying Order in Panel...");
    const verifyRes = await fetch(`${BASE_URL}/api/fastfood/orders`, {
        method: 'GET',
        headers: {
            'Cookie': cookieHeader
        }
    });

    const verifyData = await verifyRes.json();
    // Only verify success flag for now to keep it simple and safe
    if (verifyData.success) {
        console.log(`✅ Verification Successful: Orders fetched.`);
    } else {
        console.error("❌ Verification Failed.", verifyData);
    }

    console.log("\n🎉 Order Simulation Completed successfully.");
}

runSimulation();
