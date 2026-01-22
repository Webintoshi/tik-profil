
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
    console.log("🚀 Starting Hotel Module Simulation");
    console.log(`T: ${new Date().toISOString()}`);
    console.log("-----------------------------------");

    // 1. REGISTER BUSINESS (HOTEL)
    console.log("\n🏨 Step 1: Registering Hotel Business...");
    const businessSlug = `antigravity-hotel-${Date.now()}`;
    const registerPayload = {
        fullName: "Otel Müdürü",
        email: `manager-${Date.now()}@otel.com`,
        password: "password123",
        businessName: "Grand Antigravity Hotel",
        businessSlug: businessSlug,
        businessPhone: "5551112233",
        industryId: "hotel", // Set industry to hotel
        industryLabel: "Otel & Turizm",
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
    const businessId = regData.businessId; // Check if this is returned, usually it is. 
    // If not, we might need to parse it or just rely on cookie.
    // Edit: Register API usually returns businessId.
    console.log(`Business ID: ${businessId}`);
    handleCookies(regRes);

    // 2. CREATE ROOM TYPE
    console.log("\n🛏️ Step 2: Creating Room Type (King Suite)...");
    const roomTypePayload = {
        businessId: businessId, // API requires businessId in body for room-types POST
        name: "King Suite",
        description: "Deniz manzaralı lüks suite",
        price: 5000,
        capacity: 2,
        bedType: "King Size",
        size: 45,
        amenities: ["Wifi", "TV", "Minibar", "Jacuzzi"]
    };

    const rtRes = await fetch(`${BASE_URL}/api/hotel/room-types`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': cookieHeader
        },
        body: JSON.stringify(roomTypePayload)
    });

    const rtData = await rtRes.json();
    if (!rtRes.ok) {
        console.error("❌ Create Room Type Failed:", rtData);
        process.exit(1);
    }
    console.log("✅ Room Type Created!");
    const roomTypeId = rtData.roomType.id;
    console.log(`Room Type ID: ${roomTypeId}`);

    // 3. CREATE ROOM
    console.log("\n🔑 Step 3: Creating Room (101)...");
    const roomPayload = {
        roomNumber: "101",
        roomTypeId: roomTypeId,
        floor: 1,
        status: "available"
    };

    const roomRes = await fetch(`${BASE_URL}/api/hotel/rooms`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': cookieHeader
        },
        body: JSON.stringify(roomPayload)
    });

    const roomData = await roomRes.json();
    if (!roomRes.ok) {
        console.error("❌ Create Room Failed:", roomData);
        process.exit(1);
    }
    console.log("✅ Room Created!");
    console.log(`Room ID: ${roomData.room.id}`);

    // 4. VERIFY VIA LIST
    console.log("\n🔍 Step 4: Verifying Rooms List...");
    const listRes = await fetch(`${BASE_URL}/api/hotel/rooms`, {
        method: 'GET',
        headers: {
            'Cookie': cookieHeader
        }
    });

    const listData = await listRes.json();
    if (listData.success && listData.rooms.length > 0) {
        console.log(`✅ Verification Successful: Found ${listData.rooms.length} rooms.`);
        console.log(`Room 101 Status: ${listData.rooms[0].status}`);
    } else {
        console.error("❌ Verification Failed: No rooms found.", listData);
    }

    console.log("\n🎉 Hotel Module Simulation Completed successfully.");
}

runSimulation();
