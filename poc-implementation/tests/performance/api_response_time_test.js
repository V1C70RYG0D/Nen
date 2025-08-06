import http from 'k6/http';
import { sleep, check } from 'k6';

export const options = {
  vus: 10, // virtual users
  duration: '1m'
};

const BASE_URL = __ENV.API_BASE_URL || (() => {
})();

export default function () {
  // Test the AI endpoint
  const aiRes = http.get(`${BASE_URL}/api/v1/ai`);
  check(aiRes, {
    'AI endpoint response time < 100ms': (r) => r.timings.duration < 100
  });

  // Test the Auth endpoint
  const authRes = http.get(`${BASE_URL}/api/v1/auth`);
  check(authRes, {
    'Auth endpoint response time < 100ms': (r) => r.timings.duration < 100
  });

  // Test the Game endpoint
  const gameRes = http.get(`${BASE_URL}/api/v1/game`);
  check(gameRes, {
    'Game endpoint response time < 100ms': (r) => r.timings.duration < 100
  });

  // Test the User endpoint
  const userRes = http.get(`${BASE_URL}/api/v1/user`);
  check(userRes, {
    'User endpoint response time < 100ms': (r) => r.timings.duration < 100
  });

  sleep(1);
}
