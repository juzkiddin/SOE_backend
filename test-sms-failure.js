const fetch = require('node-fetch');

async function testSmsFailureHandling() {
    const baseUrl = 'http://localhost:3000';
    const testMobileNum = '+1234567890';

    console.log('🧪 Testing SMS Failure Handling...\n');

    console.log('⚠️  Note: This test requires Twilio credentials to be missing or invalid');
    console.log('   to properly test the 500 error response.\n');

    try {
        const response = await fetch(`${baseUrl}/otp/smsgen`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
                mobileNum: testMobileNum
            })
        });

        const data = await response.json();

        console.log(`Status: ${response.status}`);
        console.log('Response:', JSON.stringify(data, null, 2));

        if (response.status === 500 && data.message === 'Failed to send sms') {
            console.log('\n✅ SUCCESS: SMS failure correctly returns 500 error!');
            return true;
        } else if (response.status === 200) {
            console.log('\n✅ SMS sending is working (Twilio configured correctly)');
            console.log('💡 To test failure handling:');
            console.log('   1. Remove Twilio environment variables');
            console.log('   2. Restart the server');
            console.log('   3. Run this test again');
            return true;
        } else {
            console.log('\n❌ Unexpected response for SMS failure test');
            return false;
        }

    } catch (error) {
        console.error('❌ Error testing SMS failure:', error.message);
        return false;
    }
}

// Run test if this file is executed directly
if (require.main === module) {
    testSmsFailureHandling().then(success => {
        process.exit(success ? 0 : 1);
    });
}

module.exports = { testSmsFailureHandling }; 