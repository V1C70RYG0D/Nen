export const config = {
    thresholds: {
        "http_req_duration": ["p(95)<500"], // 95% of requests must complete below 500ms
        "http_req_failed": ["rate<0.01"], // http errors should be less than 1%
    },
    duration: '1m', // Test duration
    vus: 10, // Virtual Users
};

