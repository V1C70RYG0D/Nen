import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    stages: [
        { duration: '30s', target: 20 }, // ramp-up to 20 VUs
        { duration: '1m', target: 10 }, // low load
        { duration: '30s', target: 0 } // ramp-down to 0
    ]
};

export default function () {
    const res = http.get('https://test.k6.io');
    check(res, { 'status was 200': r => r.status === 200 });
    sleep(1);
}

