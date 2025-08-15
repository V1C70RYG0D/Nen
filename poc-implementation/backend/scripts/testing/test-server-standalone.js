/**
 * Standalone Server Test - Quick Verification
 * Tests server functionality without Jest complexity

 */

const http = require('http');


require('dotenv').config({ path: '../.env' });
require('dotenv').config({ path: '../config/.env' });

// Set test environment with environment variables or throw error if not set
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.PORT = process.env.TEST_PORT || process.env.BACKEND_PORT || (() => {

})();
process.env.HOST = process.env.TEST_HOST || process.env.BACKEND_HOST || (() => {

})();
process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'error';
process.env.FRONTEND_URL = process.env.FRONTEND_URL || (() => {

})();
process.env.ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL;

async function testServer() {
    console.log('🔧 Starting standalone server test...');

    try {
        // Import the server - try built version first, then source
        let app;
        try {
            app = require('./dist/server-production-ready.js');
            console.log('✅ Server module loaded from dist');
        } catch (error) {
            console.log('⚠️ Dist version not found, trying tsx...', error.message);
            try {
                require('tsx/cjs');
                app = require('./src/server-production-ready.ts');
                console.log('✅ Server module loaded from src with tsx');
            } catch (tsError) {
                console.error('❌ Failed to load server module:', tsError.message);
                process.exit(1);
            }
        }


        const testPort = process.env.TEST_PORT || process.env.PORT;
        const testHost = process.env.TEST_HOST || process.env.HOST;

        if (!testPort || !testHost) {

        }

        const server = app.listen(testPort, testHost, () => {
            console.log(`✅ Server started on ${testHost}:${testPort}`);

            // Test health endpoint
            testHealthEndpoint(() => {
                server.close(() => {
                    console.log('✅ Server stopped');
                    console.log('🎉 All tests passed!');
                    process.exit(0);
                });
            });
        });

    } catch (error) {
        console.error('❌ Server test failed:', error);
        process.exit(1);
    }
}

function testHealthEndpoint(callback) {
    const testHost = process.env.TEST_HOST || process.env.HOST;
    const testPort = process.env.TEST_PORT || process.env.PORT;

    const options = {
        hostname: testHost,
        port: parseInt(testPort, 10),
        path: '/health',
        method: 'GET'
    };

    const req = http.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
            data += chunk;
        });

        res.on('end', () => {
            if (res.statusCode === 200) {
                const response = JSON.parse(data);
                if (response.status === 'healthy') {
                    console.log('✅ Health endpoint test passed');
                    callback();
                } else {
                    console.error('❌ Health endpoint returned wrong status:', response);
                    process.exit(1);
                }
            } else {
                console.error('❌ Health endpoint returned status:', res.statusCode);
                process.exit(1);
            }
        });
    });

    req.on('error', (err) => {
        console.error('❌ Health endpoint request failed:', err);
        process.exit(1);
    });

    req.end();
}

// Run the test
testServer();
