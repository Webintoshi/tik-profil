// Test debug endpoint to see if cookie is received by server
async function testDebugEndpoint() {
    console.log('=== DEBUG ENDPOINT TEST ===\n');

    // First login to get a cookie
    const loginRes = await fetch('http://localhost:3000/api/auth/owner-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: 'debug_test_44444@tikprofil.com',
            password: 'Password123!'
        })
    });

    const setCookie = loginRes.headers.get('set-cookie');
    console.log('Got cookie:', setCookie ? 'YES' : 'NO');

    if (!setCookie) return;

    const cookiePart = setCookie.split(';')[0];
    console.log('Cookie to send:', cookiePart.substring(0, 60) + '...');

    // Now test the debug endpoint with the cookie
    console.log('\n--- Calling /api/debug/cookies ---');
    const debugRes = await fetch('http://localhost:3000/api/debug/cookies', {
        headers: { 'Cookie': cookiePart }
    });

    const data = await debugRes.json();
    console.log('Debug endpoint response:', JSON.stringify(data, null, 2));

    if (data.hasOwnerSession) {
        console.log('\n✅ SUCCESS: Server RECEIVED the cookie!');
    } else {
        console.log('\n❌ FAILURE: Server did NOT receive the cookie');
    }
}

testDebugEndpoint().catch(console.error);
