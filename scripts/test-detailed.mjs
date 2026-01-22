// Detailed test to verify cookie handling
async function detailedCookieTest() {
    console.log('=== DETAILED COOKIE TEST ===\n');

    // Login
    const res = await fetch('http://localhost:3000/api/auth/owner-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
            email: 'debug_test_44444@tikprofil.com',
            password: 'Password123!'
        })
    });

    const data = await res.json();
    console.log('Login success:', data.success);

    const setCookie = res.headers.get('set-cookie');
    console.log('\nRaw Set-Cookie header:');
    console.log(setCookie);

    if (!setCookie) {
        console.log('\n❌ NO SET-COOKIE HEADER FOUND!');
        return;
    }

    // Parse cookie
    const cookiePart = setCookie.split(';')[0];
    console.log('\nCookie for request:', cookiePart);
    console.log('Cookie length:', cookiePart.length);

    // Test panel with cookie
    console.log('\n--- Testing /panel access ---');
    const panel = await fetch('http://localhost:3000/panel', {
        redirect: 'manual',
        headers: { 'Cookie': cookiePart }
    });

    console.log('Panel status:', panel.status);
    console.log('Location:', panel.headers.get('location'));

    if (panel.status === 200) {
        console.log('\n✅ SUCCESS! Cookie is valid.');
    } else {
        console.log('\n❌ FAILURE. Middleware rejected cookie.');
    }
}

detailedCookieTest().catch(console.error);
