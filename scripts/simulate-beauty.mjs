
import fetch from 'node-fetch';
import { updateCookie } from './cookie-manager.mjs';

const BASE_URL = 'http://localhost:3000';
let cookieHeader = '';

// Helper
function handleCookies(response) {
    const raw = response.headers.raw()['set-cookie'];
    if (raw) {
        const cookies = raw.map((entry) => entry.split(';')[0]);
        cookieHeader = cookies.join('; ');
        updateCookie(cookieHeader);
    }
}

async function runSimulation() {
    console.log("🚀 Starting Beauty (Güzellik Merkezi) Module Simulation");
    console.log(`T: ${new Date().toISOString()}`);
    console.log("-----------------------------------");

    // 1. REGISTER BUSINESS (BEAUTY)
    console.log("\n💇‍♀️ Step 1: Registering Beauty Center...");
    const businessSlug = `antigravity-beauty-${Date.now()}`;
    const registerPayload = {
        fullName: "Güzellik Uzmanı",
        email: `expert-${Date.now()}@beauty.com`,
        password: "password123",
        businessName: "Antigravity Beauty",
        businessSlug: businessSlug,
        businessPhone: "5554443322",
        industryId: "beauty", // Set industry to beauty
        industryLabel: "Güzellik Merkezi",
        planId: "pro"
    };

    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerPayload)
    });

    let regData;
    try {
        regData = await regRes.json();
    } catch {
        console.error("❌ Registration JSON Parse Failed");
        process.exit(1);
    }

    if (!regRes.ok) {
        console.error("❌ Registration Failed:", regData);
        process.exit(1);
    }

    console.log("✅ Registration Successful!");
    const businessId = regData.businessId;
    console.log(`Business ID: ${businessId}`);
    handleCookies(regRes);

    // 2. CREATE CATEGORY
    console.log("\n📂 Step 2: Creating Category (Saç Bakım)...");
    const categoryPayload = {
        name: "Saç Bakım",
        icon: "💇‍♀️",
        order: 0
    };

    const catRes = await fetch(`${BASE_URL}/api/beauty/categories`, {
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
    console.log("✅ Category Created!");
    const categoryId = catData.categoryId;
    console.log(`Category ID: ${categoryId}`);

    // 3. CREATE SERVICE
    console.log("\n✂️ Step 3: Creating Service (Kesim & Fön)...");
    const servicePayload = {
        categoryId: categoryId,
        name: "Kesim & Fön",
        description: "Yıkama dahil",
        price: 500,
        duration: 45,
        isActive: true
    };

    const servRes = await fetch(`${BASE_URL}/api/beauty/services`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': cookieHeader
        },
        body: JSON.stringify(servicePayload)
    });

    const servData = await servRes.json();
    if (!servRes.ok) {
        console.error("❌ Create Service Failed:", servData);
        process.exit(1);
    }
    console.log("✅ Service Created!");
    console.log(`Service ID: ${servData.serviceId}`);

    // 4. CREATE STAFF
    console.log("\n👩‍💼 Step 4: Creating Staff (Ayşe Uzman)...");
    const staffPayload = {
        name: "Ayşe Uzman",
        title: "Kıdemli Kuaför",
        phone: "5551112233",
        specialties: ["Kesim", "Boya"],
        isActive: true
    };

    const staffRes = await fetch(`${BASE_URL}/api/beauty/staff`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': cookieHeader
        },
        body: JSON.stringify(staffPayload)
    });

    const staffData = await staffRes.json();
    if (!staffRes.ok) {
        console.error("❌ Create Staff Failed:", staffData);
        process.exit(1);
    }
    console.log("✅ Staff Created!");
    console.log(`Staff ID: ${staffData.staffId}`);

    // 5. VERIFY VIA LIST
    console.log("\n🔍 Step 5: Verifying Services List...");
    const listRes = await fetch(`${BASE_URL}/api/beauty/services`, {
        method: 'GET',
        headers: {
            'Cookie': cookieHeader
        }
    });

    const listData = await listRes.json();
    if (listData.success && listData.services.length > 0) {
        console.log(`✅ Verification Successful: Found ${listData.services.length} services.`);
        console.log(`Service Name: ${listData.services[0].name}`);
    } else {
        console.error("❌ Verification Failed: No services found.", listData);
    }

    console.log("\n🎉 Beauty Module Simulation Completed successfully.");
}

runSimulation();
