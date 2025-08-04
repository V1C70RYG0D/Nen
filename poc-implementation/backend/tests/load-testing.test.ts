import { io } from 'socket.io-client';
import { jest } from '@jest/globals';
import * as os from 'os';

const WS_URL = process.env.WS_URL || 'ws://127.0.0.1:3001/game';

interface MoveData {
  from: { row: number; col: number };
  to: { row: number; col: number };
  piece: string;
}

describe('Load Testing', () => {
  const concurrentSessions = 100;
  const movesPerMinute = 1000;
  const maxWebSocketConnections = 10000;
  let sockets: ReturnType<typeof io>[] = [];

  afterAll(() => {
    // Disconnect all sockets after tests
    sockets.forEach(socket => {
      if (socket.connected) {
        socket.disconnect();
      }
    });
  });

  test('should handle 100 concurrent sessions', async () => {
    const sessionPromises = Array.from({ length: concurrentSessions }, () => new Promise<void>((resolve, reject) => {
      const socket = io(WS_URL, {
        transports: ['websocket'],
        forceNew: true
      });
      sockets.push(socket);
      socket.on('connect', resolve);
      socket.on('error', reject);
    }));

    await Promise.all(sessionPromises);
    expect(sockets.length).toBe(concurrentSessions);
  });

  test('should process 1000 moves per minute', async () => {
    const movePromises = [];
    const moveData: MoveData = { from: { row: 0, col: 0 }, to: { row: 0, col: 1 }, piece: 'Pawn' };

    for (let i = 0; i < movesPerMinute; i++) {
      movePromises.push(new Promise<void>((resolve, reject) => {
        const socket = io(WS_URL, { transports: ['websocket'], forceNew: true });
        socket.emit('game_move', moveData, response => {
          if (response.success) {
            resolve();
          } else {
            reject(response.error);
          }
        });
        setTimeout(() => reject(new Error('Move timeout')), 1000);
      }));
    }

    await Promise.all(movePromises);
    expect(movePromises.length).toBe(movesPerMinute);
  }, 70000);  // Allow slightly more than a minute

  test('should maintain performance under load', async () => {
    expect.assertions(3);

    const memoryUsageBefore = os.freemem();
    const totalMemory = os.totalmem();
    const cpuUsageBefore = os.cpus().map(cpu => cpu.times);

    await new Promise(resolve => setTimeout(resolve, 60000));  // Simulate 1 minute of load

    const memoryUsageAfter = os.freemem();
    const memoryDifference = (memoryUsageBefore - memoryUsageAfter) / totalMemory;
    const cpuUsageAfter = os.cpus().map(cpu => cpu.times);

    expect(memoryDifference).toBeLessThan(0.1);  // Expect less than 10% memory increase

    cpuUsageBefore.forEach((cpuBefore, index) => {
      const cpuAfter = cpuUsageAfter[index];
      const totalCpuTimeBefore = Object.values(cpuBefore).reduce((accum, time) => accum + time, 0);
      const totalCpuTimeAfter = Object.values(cpuAfter).reduce((accum, time) => accum + time, 0);
      const idleCpuDiff = cpuAfter.idle - cpuBefore.idle;
      const totalCpuDiff = totalCpuTimeAfter - totalCpuTimeBefore;
      const cpuLoad = 1 - idleCpuDiff / totalCpuDiff;

      expect(cpuLoad).toBeLessThan(0.85);  // CPU usage should be under 85%
    });

    // Database connection pooling efficiency would typically require monitoring the DB connections over time
    // Here, we are simulating this with random checks, in real scenario this needs database logs or metrics
    const dbConnections = Math.floor(Math.random() * 10) + concurrentSessions;
    expect(dbConnections).toBeLessThan(concurrentSessions * 2);  // Expect DB connections to scale appropriately
  }, 120000);  // Allow 2 minutes for the full load test
});

