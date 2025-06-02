const fetch = require('node-fetch');

async function testFirstTimeUser() {
    const baseUrl = 'http://localhost:3000';

    console.log('🧪 Testing first-time user OTP generation...\n');

    try {
        // First request - should work without any prior cookie/session
        const response = await fetch(`${baseUrl}/otp/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                tableId: 'test-table-123'
            })
        });

        const data = await response.json();

        console.log(`Status: ${response.status}`);
        console.log('Response:', JSON.stringify(data, null, 2));
        console.log('Response Headers:');
        console.log(`  Set-Cookie: ${response.headers.get('set-cookie')}`);
        console.log(`  X-RateLimit-Limit: ${response.headers.get('x-ratelimit-limit')}`);
        console.log(`  X-RateLimit-Remaining: ${response.headers.get('x-ratelimit-remaining')}`);

        if (response.status === 200) {
            console.log('\n✅ SUCCESS: First-time user can generate OTP without errors!');
            return true;
        } else {
            console.log('\n❌ FAILED: First-time user still getting errors');
            return false;
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        return false;
    }
}

// Run the test if this file is executed directly
if (require.main === module) {
    testFirstTimeUser().then(success => {
        process.exit(success ? 0 : 1);
    });
}

module.exports = { testFirstTimeUser }; 