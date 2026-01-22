// Test script to verify cookie is being set in register response
async function testRegistration() {
    const email = `test_cookie_${Date.now()}@tikprofil.com`;

    console.log('Testing registration with email:', email);

    const response = await fetch('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            fullName: 'Cookie Test',
            email: email,
            password: 'Password123!',
            businessName: 'Cookie Test Business',
            businessSlug: `cookie-test-${Date.now()}`,
            businessPhone: '05551234567',
            industryId: 'restaurant'
        })
    });

    console.log('Response status:', response.status);
    console.log('Response headers:');

    // Log all headers
    for (const [key, value] of response.headers.entries()) {
        console.log(`  ${key}: ${value}`);
    }

    // Check for Set-Cookie header
    const setCookie = response.headers.get('set-cookie');
    console.log('\nSet-Cookie header:', setCookie ? 'FOUND!' : 'NOT FOUND!');
    if (setCookie) {
        console.log('Cookie value (first 100 chars):', setCookie.substring(0, 100));
    }

    const data = await response.json();
    console.log('\nResponse body:', data);
}

testRegistration().catch(console.error);
