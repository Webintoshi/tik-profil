// Production test for tikprofil-v2.vercel.app
async function testProduction() {
    const BASE = 'https://tikprofil-v2.vercel.app';
    const timestamp = Date.now();
    const email = `prod_test_${timestamp}@tikprofil.com`;
    const slug = `prod-test-${timestamp}`;

    console.log('=== PRODUCTION TEST ===');
    console.log('URL:', BASE);
    console.log('Email:', email);
    console.log('');

    // 1. Register
    console.log('1. Registration:');
    const reg = await fetch(`${BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
            fullName: 'Production Test User',
            email: email,
            password: 'ProdTest123!',
            businessName: 'Production Test Business',
            businessSlug: slug,
            businessPhone: '05551234567',
            industryId: 'restaurant'
        })
    });

    const regData = await reg.json();
    const cookie = reg.headers.get('set-cookie')?.split(';')[0];

    console.log('   Status:', reg.status);
    console.log('   Success:', regData.success);
    console.log('   Message:', regData.message);
    console.log('   Redirect:', regData.redirect);
    console.log('   Cookie:', cookie ? 'SET' : 'NOT SET');

    if (!regData.success) {
        console.log('\n❌ Registration failed!');
        return;
    }

    // 2. Access /panel
    console.log('\n2. Access /panel:');
    const panel = await fetch(`${BASE}/panel`, {
        headers: { 'Cookie': cookie },
        redirect: 'manual'
    });
    console.log('   Status:', panel.status);
    console.log('   Location:', panel.headers.get('location') || 'N/A');

    // 3. Access /panel/profile
    console.log('\n3. Access /panel/profile:');
    const profile = await fetch(`${BASE}/panel/profile`, {
        headers: { 'Cookie': cookie },
        redirect: 'manual'
    });
    console.log('   Status:', profile.status);
    console.log('   Location:', profile.headers.get('location') || 'N/A');

    console.log('\n=== RESULT ===');
    if (panel.status === 200 && profile.status === 200) {
        console.log('✅ PRODUCTION TEST PASSED!');
    } else if (panel.status === 307 || profile.status === 307) {
        const loc = panel.headers.get('location') || profile.headers.get('location');
        if (loc?.includes('giris-yap')) {
            console.log('❌ FAILED: Redirected to login page');
        } else {
            console.log('⚠️ Redirected to:', loc);
        }
    }
}

testProduction().catch(e => console.error('Error:', e));
