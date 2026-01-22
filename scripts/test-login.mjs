// Test LOGIN flow with credentials: include
async function testLoginFlow() {
    // Use an existing test account
    const email = 'debug_test_44444@tikprofil.com';
    const password = 'Password123!';

    console.log('=== LOGIN FLOW TEST ===');
    console.log('Testing login with:', email);
    console.log('');

    // Step 1: Login
    console.log('Step 1: Calling login API...');
    const loginResponse = await fetch('http://localhost:3000/api/auth/owner-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
    });

    console.log('Login response status:', loginResponse.status);

    // Check headers
    console.log('\nResponse headers:');
    for (const [key, value] of loginResponse.headers.entries()) {
        console.log(`  ${key}: ${value}`);
    }

    const setCookie = loginResponse.headers.get('set-cookie');
    console.log('\nSet-Cookie present:', !!setCookie);

    if (setCookie) {
        console.log('Cookie name:', setCookie.split('=')[0]);
    }

    const loginData = await loginResponse.json();
    console.log('\nLogin response body:', loginData);

    if (!loginData.success) {
        console.log('❌ LOGIN FAILED');
        return;
    }

    console.log('\n✅ LOGIN SUCCEEDED!');

    // Step 2: Try accessing /panel with the cookie
    if (setCookie) {
        console.log('\nStep 2: Testing /panel access with cookie...');
        const panelResponse = await fetch('http://localhost:3000/panel', {
            redirect: 'manual',
            headers: {
                'Cookie': setCookie.split(';')[0]
            }
        });

        console.log('Panel response status:', panelResponse.status);
        console.log('Location header:', panelResponse.headers.get('location'));

        if (panelResponse.status === 200) {
            console.log('✅ SUCCESS: /panel returns 200 - Cookie works!');
        } else if (panelResponse.status === 307 || panelResponse.status === 302) {
            const loc = panelResponse.headers.get('location');
            if (loc?.includes('giris-yap')) {
                console.log('❌ FAILURE: Redirected to login - Cookie not valid');
            }
        }
    }
}

testLoginFlow().catch(console.error);
