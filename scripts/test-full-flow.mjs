// Integration test that simulates the full flow with credentials: include
async function testFullRegistrationFlow() {
    const timestamp = Date.now();
    const email = `flow_test_${timestamp}@tikprofil.com`;
    const slug = `flow-test-${timestamp}`;

    console.log('=== FULL FLOW INTEGRATION TEST ===');
    console.log('Testing registration flow with credentials: include');
    console.log('Email:', email);
    console.log('Slug:', slug);
    console.log('');

    // Step 1: Make registration request WITH credentials
    console.log('Step 1: Calling registration API...');
    const registerResponse = await fetch('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // THIS IS THE FIX
        body: JSON.stringify({
            fullName: 'Integration Test',
            email: email,
            password: 'Password123!',
            businessName: 'Integration Test Business',
            businessSlug: slug,
            businessPhone: '05551234567',
            industryId: 'restaurant'
        })
    });

    console.log('Registration response status:', registerResponse.status);

    // Check for Set-Cookie header
    const setCookie = registerResponse.headers.get('set-cookie');
    console.log('Set-Cookie header present:', !!setCookie);
    if (setCookie) {
        console.log('Cookie name:', setCookie.split('=')[0]);
        console.log('Cookie has httpOnly:', setCookie.includes('HttpOnly'));
    }

    const registerData = await registerResponse.json();
    console.log('Registration response:', registerData);
    console.log('');

    if (!registerData.success) {
        console.log('❌ FAILURE: Registration failed');
        return;
    }

    // Step 2: Now try to access /panel with the cookie
    console.log('Step 2: Attempting to access /panel...');

    // In a browser, the cookie would be automatically sent on the next request
    // In Node.js, we need to manually pass it
    if (setCookie) {
        const panelResponse = await fetch('http://localhost:3000/panel', {
            redirect: 'manual', // Don't follow redirects automatically
            headers: {
                'Cookie': setCookie.split(';')[0] // Just the cookie value part
            }
        });

        console.log('Panel response status:', panelResponse.status);
        console.log('Panel response location:', panelResponse.headers.get('location'));

        if (panelResponse.status === 200) {
            console.log('✅ SUCCESS: /panel returned 200 - Session is valid!');
        } else if (panelResponse.status === 307 || panelResponse.status === 302) {
            const location = panelResponse.headers.get('location');
            if (location && location.includes('giris-yap')) {
                console.log('❌ FAILURE: Redirected to login - Cookie not recognized');
            } else {
                console.log('⚠️ Redirected to:', location);
            }
        }
    } else {
        console.log('❌ FAILURE: No Set-Cookie header in registration response');
    }
}

testFullRegistrationFlow().catch(console.error);
