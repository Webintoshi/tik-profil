
import fetch from 'node-fetch';
import { updateCookie } from './cookie-manager.mjs';

const BASE_URL = 'http://localhost:3000';
let cookieHeader = '';

// Helper to update cookies
function handleCookies(response) {
    const raw = response.headers.raw()['set-cookie'];
    if (raw) {
        const cookies = raw.map((entry) => entry.split(';')[0]);
        cookieHeader = cookies.join('; ');
        updateCookie(cookieHeader);
    }
}

async function runSimulation() {
    console.log("🚀 Starting Emlak (Real Estate) Module Simulation");
    console.log(`T: ${new Date().toISOString()}`);
    console.log("-----------------------------------");

    // 1. REGISTER BUSINESS (EMLAK)
    console.log("\n📝 Step 1: Registering Real Estate Business...");
    const businessSlug = `antigravity-emlak-${Date.now()}`;
    const registerPayload = {
        fullName: "Emlak Boss",
        email: `boss-${Date.now()}@emlak.com`,
        password: "password123",
        businessName: "Antigravity Emlak",
        businessSlug: businessSlug,
        businessPhone: "5551234567",
        industryId: "emlak", // Important: Set industry to emlak
        industryLabel: "Gayrimenkul",
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
    console.log(`Business ID: ${regData.businessId}`);
    handleCookies(regRes);

    // 2. CREATE CONSULTANT
    console.log("\n👨‍💼 Step 2: Creating Consultant...");
    const consultantPayload = {
        name: "Ahmet Emlakçı",
        title: "Kıdemli Danışman",
        phone: "5559876543",
        email: "ahmet@emlak.com",
        bio: "10 yıllık tecrübe."
    };

    const consRes = await fetch(`${BASE_URL}/api/emlak/consultants`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': cookieHeader
        },
        body: JSON.stringify(consultantPayload)
    });

    const consData = await consRes.json();
    if (!consRes.ok) {
        console.error("❌ Create Consultant Failed:", consData);
        process.exit(1);
    }
    console.log("✅ Consultant Created!");
    const consultantId = consData.consultantId;
    console.log(`Consultant ID: ${consultantId}`);

    // 3. CREATE LISTING
    console.log("\n🏠 Step 3: Creating Listing...");
    const listingPayload = {
        consultantId: consultantId,
        title: "Lüks Deniz Manzaralı Villa",
        description: "Muhteşem konumda, havuzlu villa.",
        listingType: "sale",
        propertyType: "residential",
        propertySubType: "villa",
        location: {
            city: "İstanbul",
            district: "Beşiktaş",
            neighborhood: "Bebek"
        },
        price: 25000000,
        currency: "TRY",
        features: {
            grossArea: 250,
            netArea: 220,
            roomCount: "4+1",
            heating: "natural_gas",
            parking: true
        },
        images: [{
            url: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800",
            order: 0,
            isMain: true
        }],
        status: "active"
    };

    const listRes = await fetch(`${BASE_URL}/api/emlak/listings`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': cookieHeader
        },
        body: JSON.stringify(listingPayload)
    });

    const listData = await listRes.json();
    if (!listRes.ok) {
        console.error("❌ Create Listing Failed:", listData);
        process.exit(1);
    }
    console.log("✅ Listing Created!");
    const listingId = listData.listingId;
    console.log(`Listing ID: ${listingId}`);

    // 4. VERIFY PUBLIC LISTING
    console.log("\n🔍 Step 4: Verifying Public Listing...");
    // Assuming public API is /api/public/listings or similar, or just re-fetching via GET /api/emlak/listings for now
    // Since we are owner, we can check via internal API first.

    const verifyRes = await fetch(`${BASE_URL}/api/emlak/listings?id=${listingId}`, {
        method: 'GET',
        headers: {
            'Cookie': cookieHeader
        }
    });

    const verifyData = await verifyRes.json();
    if (verifyData.success && verifyData.listing) {
        console.log("✅ Verification Successful: Listing found.");
        console.log(`Title: ${verifyData.listing.title}`);
    } else {
        console.error("❌ Verification Failed: Listing not found.", verifyData);
    }

    console.log("\n🎉 Emlak Module Simulation Completed successfully.");
}

runSimulation();
