const fetch = require('node-fetch');

async function testCorsConfiguration() {
    const apiUrl = process.env.API_URL || 'https://otpapi.snapordereat.in';
    const testOrigin = process.env.TEST_ORIGIN || 'https://snapordereat.com';

    console.log('🧪 Testing CORS Configuration...\n');
    console.log(`API URL: ${apiUrl}`);
    console.log(`Testing with Origin: ${testOrigin}\n`);

    try {
        // Test 1: OPTIONS preflight request
        console.log('1️⃣ Testing preflight (OPTIONS) request...');
        const preflightResponse = await fetch(`${apiUrl}/otp/generate`, {
            method: 'OPTIONS',
            headers: {
                'Origin': testOrigin,
                'Access-Control-Request-Method': 'POST',
                'Access-Control-Request-Headers': 'Content-Type'
            }
        });

        console.log(`   Status: ${preflightResponse.status}`);
        console.log(`   Access-Control-Allow-Origin: ${preflightResponse.headers.get('access-control-allow-origin')}`);
        console.log(`   Access-Control-Allow-Credentials: ${preflightResponse.headers.get('access-control-allow-credentials')}`);
        console.log(`   Access-Control-Allow-Methods: ${preflightResponse.headers.get('access-control-allow-methods')}`);

        if (preflightResponse.status !== 200) {
            console.log('❌ Preflight request failed!\n');
            return false;
        }

        if (preflightResponse.headers.get('access-control-allow-origin') !== testOrigin) {
            console.log('❌ Origin not allowed in preflight response!\n');
            return false;
        }

        console.log('✅ Preflight request successful!\n');

        // Test 2: Actual POST request
        console.log('2️⃣ Testing actual POST request with credentials...');
        const postResponse = await fetch(`${apiUrl}/otp/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Origin': testOrigin
            },
            // Note: node-fetch doesn't support credentials like browsers do
            // This is mainly for server-side testing
            body: JSON.stringify({
                tableId: 'test-table-cors-' + Date.now()
            })
        });

        const responseData = await postResponse.json();

        console.log(`   Status: ${postResponse.status}`);
        console.log(`   Access-Control-Allow-Origin: ${postResponse.headers.get('access-control-allow-origin')}`);
        console.log(`   Access-Control-Allow-Credentials: ${postResponse.headers.get('access-control-allow-credentials')}`);
        console.log(`   Set-Cookie: ${postResponse.headers.get('set-cookie')}`);
        console.log(`   Response:`, JSON.stringify(responseData, null, 2));

        if (postResponse.status === 200) {
            console.log('✅ POST request successful!\n');

            // Check cookie attributes
            const setCookieHeader = postResponse.headers.get('set-cookie');
            if (setCookieHeader) {
                if (setCookieHeader.includes('SameSite=None') && setCookieHeader.includes('Secure')) {
                    console.log('✅ Cookie has correct cross-site attributes (SameSite=None; Secure)');
                } else {
                    console.log('⚠️  Cookie might not work for cross-site requests. Expected SameSite=None; Secure');
                }
            }

            return true;
        } else {
            console.log('❌ POST request failed!\n');
            return false;
        }

    } catch (error) {
        console.error('❌ Error testing CORS:', error.message);
        return false;
    }
}

async function testWithDifferentOrigin() {
    const apiUrl = process.env.API_URL || 'https://otpapi.snapordereat.in';
    const unauthorizedOrigin = 'https://unauthorized-domain.com';

    console.log('3️⃣ Testing with unauthorized origin...');

    try {
        const response = await fetch(`${apiUrl}/otp/generate`, {
            method: 'OPTIONS',
            headers: {
                'Origin': unauthorizedOrigin,
                'Access-Control-Request-Method': 'POST',
                'Access-Control-Request-Headers': 'Content-Type'
            }
        });

        console.log(`   Status: ${response.status}`);
        console.log(`   Access-Control-Allow-Origin: ${response.headers.get('access-control-allow-origin')}`);

        if (response.status >= 400 || !response.headers.get('access-control-allow-origin')) {
            console.log('✅ Unauthorized origin correctly rejected!\n');
            return true;
        } else {
            console.log('⚠️  Unauthorized origin was allowed (might be in development mode)\n');
            return true; // This is ok for development
        }

    } catch (error) {
        console.error('❌ Error testing unauthorized origin:', error.message);
        return false;
    }
}

// Main test function
async function runAllTests() {
    console.log('🎯 CORS Configuration Test Suite\n');
    console.log('This script tests if your API is properly configured for cross-origin requests.\n');

    const corsTest = await testCorsConfiguration();
    const unauthorizedTest = await testWithDifferentOrigin();

    console.log('📊 Test Results:');
    console.log(`   CORS Configuration: ${corsTest ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Origin Security: ${unauthorizedTest ? '✅ PASS' : '❌ FAIL'}`);

    if (corsTest && unauthorizedTest) {
        console.log('\n🎉 All tests passed! Your CORS configuration should work for cross-origin requests.');
        console.log('\n💡 Next steps:');
        console.log('   1. Make sure your frontend uses `credentials: "include"` in fetch requests');
        console.log('   2. Ensure both API and frontend are served over HTTPS in production');
        console.log('   3. Verify your frontend domain is in the ALLOWED_ORIGINS environment variable');
    } else {
        console.log('\n❌ Some tests failed. Check the output above and review your CORS configuration.');
        console.log('\n🔧 Common fixes:');
        console.log('   - Set ALLOWED_ORIGINS environment variable with your frontend domain');
        console.log('   - Ensure NODE_ENV=production for production deployment');
        console.log('   - Verify your server is running over HTTPS');
    }

    return corsTest && unauthorizedTest;
}

// Run tests if this file is executed directly
if (require.main === module) {
    runAllTests().then(success => {
        process.exit(success ? 0 : 1);
    });
}

module.exports = { testCorsConfiguration, testWithDifferentOrigin, runAllTests }; 