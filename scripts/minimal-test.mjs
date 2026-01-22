// Minimal test for debug headers
async function test() {
    // Login
    const r1 = await fetch('http://localhost:3000/api/auth/owner-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'debug_test_44444@tikprofil.com', password: 'Password123!' })
    });
    const cookie = r1.headers.get('set-cookie')?.split(';')[0];
    console.log('Cookie:', cookie ? 'YES' : 'NO');

    // Panel
    const r2 = await fetch('http://localhost:3000/panel', {
        headers: { 'Cookie': cookie },
        redirect: 'manual'
    });
    console.log('Panel:', r2.status);
    console.log('X-Debug-AllCookies:', r2.headers.get('x-debug-allcookies'));
    console.log('X-Debug-HasOwnerToken:', r2.headers.get('x-debug-hasownertoken'));
}
test();
