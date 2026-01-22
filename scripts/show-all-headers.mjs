// Test both debug header types
async function test() {
    // Login
    const r1 = await fetch('http://localhost:3000/api/auth/owner-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'debug_test_44444@tikprofil.com', password: 'Password123!' })
    });
    const cookie = r1.headers.get('set-cookie')?.split(';')[0];
    console.log('Cookie obtained:', cookie ? 'YES' : 'NO');

    // Panel test with real cookie
    const r2 = await fetch('http://localhost:3000/panel', {
        headers: { 'Cookie': cookie },
        redirect: 'manual'
    });

    console.log('Panel status:', r2.status);

    // Check ALL headers for debugging
    console.log('\nALL Response Headers:');
    for (const [k, v] of r2.headers.entries()) {
        console.log(`  ${k}: ${v.substring(0, 80)}`);
    }
}
test();
