// Test to check all header keys including x-mw-hit
async function test() {
    // Login first
    const r1 = await fetch('http://localhost:3000/api/auth/owner-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'debug_test_44444@tikprofil.com', password: 'Password123!' })
    });
    const cookie = r1.headers.get('set-cookie')?.split(';')[0];
    console.log('Cookie:', cookie ? 'YES' : 'NO');

    // Test /panel with cookie
    const r2 = await fetch('http://localhost:3000/panel', {
        headers: { 'Cookie': cookie },
        redirect: 'manual'
    });

    console.log('Status:', r2.status);
    console.log('Location:', r2.headers.get('location'));

    // Check for our custom headers specifically
    console.log('\nCustom headers:');
    console.log('x-mw-hit:', r2.headers.get('x-mw-hit'));
    console.log('x-debug-hasownertoken:', r2.headers.get('x-debug-hasownertoken'));
    console.log('x-debug-allcookies:', r2.headers.get('x-debug-allcookies'));
    console.log('x-debug-reason:', r2.headers.get('x-debug-reason'));

    console.log('\nAll header keys:');
    for (const [k, v] of r2.headers.entries()) {
        console.log('  -', k);
    }
}
test();
