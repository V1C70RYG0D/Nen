import http from 'k6/http';
import { check } from 'k6';
import { sleep } from 'k6';

export const options = {
  vus: 1000, // Virtual users
  duration: '1m' // Test duration
};

export default function () {
  const baseUrl = __ENV.FRONTEND_URL || `http://${__ENV.FRONTEND_HOST || __ENV.DEFAULT_FRONTEND_HOST || (() => {
    throw new Error('FRONTEND_HOST or DEFAULT_FRONTEND_HOST must be set in environment variables. No hardcoded values allowed.');
  })()}:${__ENV.FRONTEND_PORT || __ENV.DEFAULT_FRONTEND_PORT || (() => {
    throw new Error('FRONTEND_PORT or DEFAULT_FRONTEND_PORT must be set in environment variables. No hardcoded values allowed.');
  })()}`;
  const res = http.get(baseUrl);
  check(res, { 'status was 200': (r) => r.status === 200 });
  sleep(1);
}
