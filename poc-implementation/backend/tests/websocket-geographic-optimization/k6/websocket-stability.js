import http from 'k6/http';
import { check, sleep } from 'k6';
import ws from 'k6/ws';

export const options = {
  stages: [
    { duration: '30s', target: 50 }, // Ramp-up to 50 users
    { duration: '3m', target: 50 },  // Steady state at 50 users
    { duration: '30s', target: 0 }  // Ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<200'],
    'ws_duration{segment:test}': ['p(95)<1000'],
    checks: ['rate>0.99']
  }
};

export default function () {
  const baseUrl = __ENV.BASE_URL || 'localhost';
  const fullUrl = `ws://${baseUrl}:3001/game`;

  const response = ws.connect(fullUrl, null, function (socket) {
    socket.on('open', () => {
      console.log(`Connection opened for VU ${__VU}`);
      socket.send(JSON.stringify({
        type: 'auth',
        token: 'YOUR_TOKEN_HERE'
      }));
    });

    socket.on('message', (data) => {
      const message = JSON.parse(data);
      check(message, {
        'received type is pong': (msg) => msg.type === 'pong'
      });
      console.log(`VU ${__VU} received: `, message);
    });

    socket.on('close', () => console.log(`Connection closed for VU ${__VU}`));

    socket.send(JSON.stringify({ type: 'ping' }));

    sleep(1);
  });

  check(response, {
    'status is 101': (r) => r && r.status === 101
  });

  sleep(1);
}

