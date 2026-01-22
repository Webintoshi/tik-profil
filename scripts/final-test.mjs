// Final test of login and panel access
async function finalTest() {
    console.log('=== FINAL LOGIN FLOW TEST ===\n');

    // Login
    const login = await fetch('http://localhost:3000/api/auth/owner-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
            email: 'debug_test_44444@tikprofil.com',
            password: 'Password123!'
        })
    });

    const loginData = await login.json();
    const cookie = login.headers.get('set-cookie')?.split(';')[0];

    console.log('1. Login:');
    console.log('   Status:', login.status);
    console.log('   Success:', loginData.success);
    console.log('   Redirect:', loginData.redirect);
    console.log('   Cookie set:', cookie ? 'YES' : 'NO');

    // Access /panel
    console.log('\n2. Access /panel:');
    const panel = await fetch('http://localhost:3000/panel', {
        headers: { 'Cookie': cookie },
        redirect: 'manual'
    });
    console.log('   Status:', panel.status);
    console.log('   Location:', panel.headers.get('location') || 'N/A');

    // Access /panel/profile
    console.log('\n3. Access /panel/profile:');
    const profile = await fetch('http://localhost:3000/panel/profile', {
        headers: { 'Cookie': cookie },
        redirect: 'manual'
    });
    console.log('   Status:', profile.status);
    console.log('   Location:', profile.headers.get('location') || 'N/A');

    console.log('\n=== RESULT ===');
    if (panel.status === 200 || panel.status === 307 && panel.headers.get('location')?.includes('/panel/profile')) {
        console.log('✅ LOGIN FLOW WORKING!');
    } else if (panel.status === 307 && panel.headers.get('location')?.includes('giris-yap')) {
        console.log('❌ Still redirecting to login page');
    }
}
finalTest();
