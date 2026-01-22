
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';
const TIMESTAMP = Date.now();
const EMAIL = `test.user.${TIMESTAMP}@example.com`;
const SLUG = `antigravity-burger-${TIMESTAMP}`;

async function runSimulation() {
    console.log(`🚀 Starting User Journey Simulation`);
    console.log(`T: ${new Date().toISOString()}`);
    console.log(`-----------------------------------`);

    // 1. REGISTER
    console.log(`\n📝 Step 1: Registering Business...`);
    const registerPayload = {
        fullName: "Test User",
        email: EMAIL,
        password: "Password123!",
        businessName: "Antigravity Burger",
        businessSlug: SLUG,
        businessPhone: "5551234567",
        industryId: "restaurant", // Assuming this ID exists or 'default'
        industryLabel: "Restoran",
        planId: "starter"
    };

    try {
        const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(registerPayload)
        });

        const regData = await regRes.json();

        if (!regRes.ok) {
            console.error('❌ Registration Failed:', regData);
            return;
        }
        console.log('✅ Registration Successful!');
        console.log('Business ID:', regData.businessId);

        // Capture Cookies (Session Token is HttpOnly, so we might need to parse Set-Cookie)
        const cookies = regRes.headers.raw()['set-cookie'];
        const cookieHeader = cookies ? cookies.map(c => c.split(';')[0]).join('; ') : '';

        if (!cookieHeader) {
            console.error('❌ No session cookie received!');
            return;
        }
        console.log('📦 Session Cookie captured');

        // 2. GET PROFILE (Verify Login)
        console.log(`\n👤 Step 2: Verifying Login (Fetching Profile)...`);
        // Assuming there's an endpoint like /api/business/profile or similar? 
        // Or we can just try to add a product which requires auth.

        // 3. ADD CATEGORY (Restaurant Module)
        console.log(`\n📂 Step 3: Adding 'Burgers' Category...`);
        const categoryPayload = {
            name: "Burgers",
            sortOrder: 0, // Corrected field name
            icon: "🍔"
        };

        console.log("Sending POST request to /api/fastfood/categories...");
        const catRes = await fetch(`${BASE_URL}/api/fastfood/categories`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': cookieHeader
            },
            body: JSON.stringify(categoryPayload)
        });

        console.log(`Response Status: ${catRes.status} ${catRes.statusText}`);
        const catText = await catRes.text();
        console.log("Response Body:", catText.substring(0, 500)); // Print first 500 chars

        let catData;
        try {
            catData = JSON.parse(catText);
        } catch (e) {
            console.error("❌ Failed to parse JSON response");
            throw new Error(`Invalid JSON: ${catText}`);
        }

        if (!catRes.ok) {
            console.error('❌ Add Category Failed:', catData);
            // It might be a different endpoint or business logic issue
        } else {
            console.log('✅ Category Added!');
            console.log('Category ID:', catData.categoryId); // Updated property access
        }

        if (catRes.ok && catData.categoryId) {
            console.log(`\n🍔 Step 4: Adding 'Space Burger' Product...`);
            const productPayload = {
                categoryId: catData.categoryId,
                name: "Space Burger",
                description: "Out of this world taste!",
                price: 150,
                image: "",
                isAvailable: true
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
                console.error('❌ Add Product Failed:', prodData);
            } else {
                console.log('✅ Product Added!');
                console.log('Product ID:', prodData.id);
            }
        }

        // 5. VERIFY PUBLIC PAGE
        console.log(`\n🌍 Step 5: Verifying Public Page (API)...`);
        const publicRes = await fetch(`${BASE_URL}/api/fastfood/public-menu?businessSlug=${SLUG}`);
        const publicData = await publicRes.json();

        if (publicRes.ok && publicData.categories && publicData.categories.length > 0) {
            console.log('✅ Public Menu Verified!');
            console.log(`Found ${publicData.categories.length} categories.`);
            const cat = publicData.categories.find(c => c.name === "Burgers");
            if (cat && cat.products.some(p => p.name === "Space Burger")) {
                console.log('🎉 SUCCESS: "Space Burger" found in public menu!');
            } else {
                console.warn('⚠️ Category found but product might be missing.');
            }
        } else {
            console.error('❌ Public Menu Check Failed:', publicData);
        }

    } catch (error) {
        console.error('🚨 Simulation Error:', error);
    }
}

runSimulation();
