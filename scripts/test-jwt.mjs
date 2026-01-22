// Test JWT verification with explicit secrets
import { SignJWT, jwtVerify } from 'jose';

async function testJwtVerification() {
    console.log('=== JWT VERIFICATION TEST ===\n');

    // Get a real token from login
    const res = await fetch('http://localhost:3000/api/auth/owner-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: 'debug_test_44444@tikprofil.com',
            password: 'Password123!'
        })
    });

    const setCookie = res.headers.get('set-cookie');
    if (!setCookie) {
        console.log('No cookie received');
        return;
    }

    // Extract token from cookie
    const cookiePart = setCookie.split(';')[0];
    const token = cookiePart.split('=')[1];

    console.log('Token length:', token.length);
    console.log('Token prefix:', token.substring(0, 50));
    console.log('');

    // Use the SAME default secret that middleware uses
    const defaultSecret = 'tikprofil-iron-dome-default-secret-32chars';
    const secret = new TextEncoder().encode(defaultSecret);

    console.log('Testing verification with default secret...');
    try {
        const { payload } = await jwtVerify(token, secret);
        console.log('✅ VERIFICATION SUCCESSFUL!');
        console.log('Payload:', JSON.stringify(payload, null, 2));
    } catch (err) {
        console.log('❌ VERIFICATION FAILED!');
        console.log('Error:', err.message);
    }
}

testJwtVerification().catch(console.error);
