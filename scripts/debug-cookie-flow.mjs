// Systematic cookie debugging
async function debugCookieFlow() {
    console.log('=== SYSTEMATIC COOKIE DEBUG ===\n');

    // Step 1: Login and check Set-Cookie header
    console.log('STEP 1: Check Set-Cookie in login response');
    console.log('----------------------------------------');

    const loginRes = await fetch('http://localhost:3000/api/auth/owner-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: 'debug_test_44444@tikprofil.com',
            password: 'Password123!'
        })
    });

    const setCookie = loginRes.headers.get('set-cookie');
    console.log('Set-Cookie header exists:', !!setCookie);

    if (!setCookie) {
        console.log('\n❌ PROBLEM: No Set-Cookie header in response!');
        console.log('This means cookie is NOT being set by the server.');
        return;
    }

    console.log('Full Set-Cookie value:');
    console.log(setCookie);
    console.log('');

    // Step 2: Parse Set-Cookie correctly
    console.log('STEP 2: Parse cookie for sending');
    console.log('--------------------------------');

    // Set-Cookie format: name=value; Path=/; HttpOnly; ...
    const parts = setCookie.split(';');
    const cookieNameValue = parts[0]; // Just "name=value"

    console.log('Cookie parts:', parts.map(p => p.trim()));
    console.log('Cookie name=value (what we send):', cookieNameValue);
    console.log('Cookie name:', cookieNameValue.split('=')[0]);
    console.log('Cookie value length:', cookieNameValue.split('=')[1]?.length);
    console.log('');

    // Step 3: Verify we're NOT sending attributes
    console.log('STEP 3: Verify Cookie header format');
    console.log('-----------------------------------');

    // This is what we'll send
    const cookieHeader = cookieNameValue;
    console.log('Cookie header to send:', cookieHeader);
    console.log('Contains Path=?:', cookieHeader.includes('Path='));
    console.log('Contains HttpOnly?:', cookieHeader.includes('HttpOnly'));
    console.log('');

    // Step 4: Test /api/debug/cookies (should work)
    console.log('STEP 4: Test if API route receives cookie');
    console.log('-----------------------------------------');

    const debugRes = await fetch('http://localhost:3000/api/debug/cookies', {
        headers: { 'Cookie': cookieHeader }
    });
    const debugData = await debugRes.json();
    console.log('API route response:', debugData);
    console.log('API route sees cookie:', debugData.hasOwnerSession);
    console.log('');

    // Step 5: Test /panel (the problematic one)
    console.log('STEP 5: Test /panel with same cookie');
    console.log('------------------------------------');

    const panelRes = await fetch('http://localhost:3000/panel', {
        headers: { 'Cookie': cookieHeader },
        redirect: 'manual'
    });

    console.log('Panel status:', panelRes.status);
    console.log('Panel Location:', panelRes.headers.get('location'));

    if (panelRes.status === 200) {
        console.log('\n✅ SUCCESS: /panel accessible with cookie!');
    } else if (panelRes.status === 307) {
        console.log('\n❌ PROBLEM: /panel rejected the cookie');
        console.log('But API route accepted it - issue is in MIDDLEWARE specifically');
    }
}

debugCookieFlow().catch(console.error);
