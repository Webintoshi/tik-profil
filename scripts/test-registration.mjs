// Test registration flow and redirect
async function testRegistration() {
    const timestamp = Date.now();
    const email = `reg_test_${timestamp}@tikprofil.com`;
    const slug = `reg-test-${timestamp}`;

    console.log('=== REGISTRATION FLOW TEST ===\n');
    console.log('Email:', email);
    console.log('Slug:', slug);

    // Register
    console.log('\n1. Registration:');
    const reg = await fetch('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
            fullName: 'Registration Test',
            email: email,
            password: 'Password123!',
            businessName: 'Reg Test Business',
            businessSlug: slug,
            businessPhone: '05551234567',
            industryId: 'restaurant'
        })
    });

    const regData = await reg.json();
    const cookie = reg.headers.get('set-cookie')?.split(';')[0];

    console.log('   Status:', reg.status);
    console.log('   Success:', regData.success);
    console.log('   Redirect:', regData.redirect);
    console.log('   Cookie set:', cookie ? 'YES' : 'NO');

    if (!regData.success) {
        console.log('\n❌ Registration failed:', regData.message);
        return;
    }

    // Access /panel with cookie
    console.log('\n2. Access /panel:');
    const panel = await fetch('http://localhost:3000/panel', {
        headers: { 'Cookie': cookie },
        redirect: 'manual'
    });
    console.log('   Status:', panel.status);
    console.log('   Location:', panel.headers.get('location') || 'N/A');

    // Access /panel/profile with cookie
    console.log('\n3. Access /panel/profile:');
    const profile = await fetch('http://localhost:3000/panel/profile', {
        headers: { 'Cookie': cookie },
        redirect: 'manual'
    });
    console.log('   Status:', profile.status);
    console.log('   Location:', profile.headers.get('location') || 'N/A');

    console.log('\n=== RESULT ===');
    if (panel.status === 200 && profile.status === 200) {
        console.log('✅ REGISTRATION FLOW WORKING!');
        console.log('   New user can access /panel after registration');
    } else if (panel.status === 307) {
        const loc = panel.headers.get('location');
        if (loc?.includes('giris-yap')) {
            console.log('❌ FAILURE: Redirected to login page');
        } else {
            console.log('⚠️ Redirected to:', loc);
        }
    }
}
testRegistration();
