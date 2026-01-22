// Test that reads debug headers from /panel redirect
async function testPanelWithDebugHeaders() {
    console.log('=== TEST PANEL DEBUG HEADERS ===\n');

    // Login first
    const loginRes = await fetch('http://localhost:3000/api/auth/owner-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: 'debug_test_44444@tikprofil.com',
            password: 'Password123!'
        })
    });

    const setCookie = loginRes.headers.get('set-cookie');
    if (!setCookie) {
        console.log('No cookie from login');
        return;
    }

    const cookieValue = setCookie.split(';')[0];
    console.log('Cookie to send:', cookieValue.substring(0, 50) + '...');
    console.log('');

    // Now test /panel and read debug headers
    const panelRes = await fetch('http://localhost:3000/panel', {
        headers: { 'Cookie': cookieValue },
        redirect: 'manual'
    });

    console.log('Panel status:', panelRes.status);
    console.log('');

    // Read debug headers
    console.log('=== MIDDLEWARE DEBUG HEADERS ===');
    console.log('X-Debug-Path:', panelRes.headers.get('x-debug-path'));
    console.log('X-Debug-HasAdminToken:', panelRes.headers.get('x-debug-hasadmintoken'));
    console.log('X-Debug-HasOwnerToken:', panelRes.headers.get('x-debug-hasownertoken'));
    console.log('X-Debug-AllCookies:', panelRes.headers.get('x-debug-allcookies'));
    console.log('');

    const allCookies = panelRes.headers.get('x-debug-allcookies');
    if (allCookies === 'NONE' || !allCookies) {
        console.log('❌ MIDDLEWARE SEES NO COOKIES!');
        console.log('The Cookie header is NOT reaching the middleware.');
    } else {
        console.log('Middleware sees cookies:', allCookies);
    }
}

testPanelWithDebugHeaders().catch(console.error);
