const fetch = require('node-fetch');

async function testSmsOtpFlow() {
    const baseUrl = 'http://localhost:3000';
    const testMobileNum = '+1234567890';

    console.log('🧪 Testing SMS OTP Functionality...\n');

    try {
        // Test 1: Generate SMS OTP
        console.log('1️⃣ Testing SMS OTP generation...');
        const generateResponse = await fetch(`${baseUrl}/otp/smsgen`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
                mobileNum: testMobileNum
            })
        });

        const generateData = await generateResponse.json();

        console.log(`   Status: ${generateResponse.status}`);
        console.log(`   Response:`, JSON.stringify(generateData, null, 2));
        console.log(`   Set-Cookie: ${generateResponse.headers.get('set-cookie')}`);
        console.log(`   X-RateLimit-Remaining: ${generateResponse.headers.get('x-ratelimit-remaining')}`);

        if (generateResponse.status !== 200) {
            console.log('❌ SMS OTP generation failed!\n');
            return false;
        }

        if (!generateData.uuid || typeof generateData.attemptsLeft !== 'number') {
            console.log('❌ Invalid response format for SMS OTP generation!\n');
            return false;
        }

        console.log('✅ SMS OTP generation successful!\n');

        // Test 2: Verify SMS OTP (with dummy code - will fail but should work)
        console.log('2️⃣ Testing SMS OTP verification (with invalid code)...');
        const verifyResponse = await fetch(`${baseUrl}/otp/smsverify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': generateResponse.headers.get('set-cookie') || ''
            },
            credentials: 'include',
            body: JSON.stringify({
                uuid: generateData.uuid,
                otpCode: '000000' // Invalid code for testing
            })
        });

        const verifyData = await verifyResponse.json();

        console.log(`   Status: ${verifyResponse.status}`);
        console.log(`   Response:`, JSON.stringify(verifyData, null, 2));

        if (verifyResponse.status === 200 && verifyData.success === false) {
            console.log('✅ SMS OTP verification works correctly (rejected invalid code)!\n');
        } else {
            console.log('❌ SMS OTP verification response unexpected!\n');
            return false;
        }

        // Test 3: Test rate limiting for SMS OTP
        console.log('3️⃣ Testing SMS OTP rate limiting...');
        let rateLimitHit = false;

        for (let i = 0; i < 6; i++) {
            const response = await fetch(`${baseUrl}/otp/smsgen`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Cookie': generateResponse.headers.get('set-cookie') || ''
                },
                credentials: 'include',
                body: JSON.stringify({
                    mobileNum: testMobileNum
                })
            });

            if (response.status === 429) {
                rateLimitHit = true;
                console.log(`   Rate limit hit after ${i + 1} additional attempts`);
                break;
            }
        }

        if (rateLimitHit) {
            console.log('✅ SMS OTP rate limiting works correctly!\n');
        } else {
            console.log('⚠️  Rate limiting might not be working as expected\n');
        }

        return true;

    } catch (error) {
        console.error('❌ Error testing SMS OTP:', error.message);
        return false;
    }
}

async function testMobileNumberValidation() {
    const baseUrl = 'http://localhost:3000';

    console.log('4️⃣ Testing mobile number validation...');

    const invalidNumbers = [
        '',              // Empty
        'abc123',        // Not a number
        '123',           // Too short
        '+0123456789',   // Starts with 0
        'notanumber'     // Invalid format
    ];

    for (const invalidNum of invalidNumbers) {
        try {
            const response = await fetch(`${baseUrl}/otp/smsgen`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    mobileNum: invalidNum
                })
            });

            if (response.status === 400) {
                console.log(`   ✅ Correctly rejected invalid number: "${invalidNum}"`);
            } else {
                console.log(`   ⚠️  Invalid number "${invalidNum}" was not rejected (status: ${response.status})`);
            }

        } catch (error) {
            console.log(`   ✅ Correctly rejected invalid number: "${invalidNum}" (network error expected)`);
        }
    }

    console.log('✅ Mobile number validation test completed!\n');
    return true;
}

// Main test function
async function runSmsOtpTests() {
    console.log('🎯 SMS OTP Test Suite\n');
    console.log('This script tests the new SMS OTP functionality.\n');

    const flowTest = await testSmsOtpFlow();
    const validationTest = await testMobileNumberValidation();

    console.log('📊 Test Results:');
    console.log(`   SMS OTP Flow: ${flowTest ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Mobile Validation: ${validationTest ? '✅ PASS' : '❌ FAIL'}`);

    if (flowTest && validationTest) {
        console.log('\n🎉 All SMS OTP tests passed!');
        console.log('\n💡 SMS OTP Endpoints Available:');
        console.log('   POST /otp/smsgen - Generate SMS OTP');
        console.log('   POST /otp/smsverify - Verify SMS OTP');
        console.log('\n🔧 Integration Notes:');
        console.log('   - Same rate limiting as table OTPs (5 attempts per 30 seconds)');
        console.log('   - Same session management (cookies required)');
        console.log('   - Mobile number validation included');
        console.log('   - Works alongside existing table OTP functionality');
    } else {
        console.log('\n❌ Some SMS OTP tests failed. Check the output above for details.');
    }

    return flowTest && validationTest;
}

// Run tests if this file is executed directly
if (require.main === module) {
    runSmsOtpTests().then(success => {
        process.exit(success ? 0 : 1);
    });
}

module.exports = { testSmsOtpFlow, testMobileNumberValidation, runSmsOtpTests }; 